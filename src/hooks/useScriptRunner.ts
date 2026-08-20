import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GameData, Scene, StageElement, StageElementOverride, ActorGraphic } from '@/types';
import { parseScript, ScriptCommand, IfCommand, TickCommand, SliderCommand, GaugeCommand, findActorByName } from '@/utils/scriptParser';
import { resolveSetValue, evaluateIfCondition, evaluateExpressionSource, warnOnce, WorldVars } from '@/utils/expression';
import { selectNarratonScene, createNarratonHistory } from '@/utils/narraton';

// Properties BIND may drive on a stage element
const BINDABLE_PROPERTIES = new Set(['x', 'y', 'scale', 'rotation', 'opacity', 'zIndex']);

interface Binding {
  elementId: string;
  property: string;
  expression: string;
}

// Interpolate {variable} placeholders with worldState values.
// Numbers round to 1 decimal; unknown variables render as ?? with a warning.
function interpolateText(text: string, vars: WorldVars): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) {
      warnOnce(`{${name}}: variable is not defined; showing ??`);
      return '??';
    }
    if (typeof v === 'number') {
      const rounded = Math.round(v * 10) / 10;
      return String(rounded);
    }
    return String(v);
  });
}

// Flattened execution node. IF blocks flatten to a test node followed by
// their body; jumpTo is the index just past the body, taken when the
// condition is false. Flattening lets commands inside an IF yield
// (dialogue, waits) exactly like top-level commands — the old recursive
// execution fired them all in one pass, so nested dialogue overwrote
// itself instantly.
interface FlatNode {
  cmd: ScriptCommand;
  jumpTo?: number;
  // 'jump': unconditional jump to jumpTo (emitted after each taken
  // branch body of an IF/ELSEIF/ELSE chain, skipping the rest).
  kind?: 'jump';
}

function flattenCommands(cmds: ScriptCommand[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (list: ScriptCommand[]) => {
    for (const c of list) {
      if (c.type === 'IF') {
        // Compile the chain: each conditional branch gets a test node
        // (false -> jump past its body to the next branch) and, when a
        // chain exists, a jump-to-end after its body (so a taken branch
        // skips the rest). Chainless IFs flatten exactly as before.
        const hasChain = (c.elifs?.length ?? 0) > 0 || !!c.elseCommands;
        const branches: Array<{ cond: ScriptCommand; body: ScriptCommand[] }> = [
          { cond: c, body: c.commands },
          ...(c.elifs ?? []).map(e => ({
            cond: { type: 'IF', variable: e.variable, operator: e.operator, value: e.value, ...(e.isExpression ? { isExpression: true } : {}), commands: [] } as ScriptCommand,
            body: e.commands,
          })),
        ];
        const endJumps: FlatNode[] = [];
        for (const b of branches) {
          const test: FlatNode = { cmd: b.cond };
          out.push(test);
          walk(b.body);
          if (hasChain) {
            const j: FlatNode = { cmd: c, kind: 'jump' };
            out.push(j);
            endJumps.push(j);
          }
          test.jumpTo = out.length;
        }
        if (c.elseCommands) walk(c.elseCommands);
        for (const j of endJumps) j.jumpTo = out.length;
      } else {
        out.push({ cmd: c });
      }
    }
  };
  walk(cmds);
  return out;
}

export interface ActiveDialogue {
  actorId: string | null;
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
  displayedText: string; // For typewriter effect
  isComplete: boolean;
  // The graphic chosen for this utterance (explicit acting tag or
  // auto-varied) — portraits use it to match the stage sprite.
  expression?: string;
  pose?: string;
}

export interface ChoiceState {
  options: { text: string; target: string }[];
}

export interface ScriptRunnerState {
  currentSceneId: string;
  currentCommandIndex: number;
  activeDialogue: ActiveDialogue | null;
  choices: ChoiceState | null;
  worldState: Record<string, string | number | boolean>;
  hiddenElements: Set<string>;
  elementOverrides: Map<string, StageElementOverride>;
  activeEffects: Map<string, string[]>;
  activeButtons: Set<string>; // Button IDs that are currently visible/active
  activeSliders: Map<string, SliderCommand>; // variable -> slider config
  activeGauges: Map<string, GaugeCommand>;   // variable -> gauge config
  isWaiting: boolean;
  isComplete: boolean;
  isAutoPlay: boolean;
}

interface UseScriptRunnerOptions {
  game: GameData;
  startSceneId: string;
  onSceneChange?: (sceneId: string) => void;
  onAudioCommand?: (type: 'bgm' | 'ambience' | 'sfx', name: string, options: { loop?: boolean; volume?: number }) => void;
  textSpeed?: number; // Characters per second
  autoAdvanceDelay?: number; // ms delay after dialogue completes in auto mode
}

export function useScriptRunner({
  game,
  startSceneId,
  onSceneChange,
  onAudioCommand,
  textSpeed = 100,
  autoAdvanceDelay = 1500,
}: UseScriptRunnerOptions) {
  const [state, setState] = useState<ScriptRunnerState>(() => ({
    currentSceneId: startSceneId,
    currentCommandIndex: 0,
    activeDialogue: null,
    choices: null,
    worldState: { ...game.info.worldState },
    hiddenElements: new Set(),
    elementOverrides: new Map(),
    activeEffects: new Map(),
    activeButtons: new Set(),
    activeSliders: new Map(),
      activeGauges: new Map(),
    isWaiting: false,
    isComplete: false,
    isAutoPlay: game.info.gameMode === 'AUTO_PLAY',
  }));

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  // Two-frame walk cycle: while a MOVE is in flight, if the moving
  // actor has Walk1/Walk2 pose graphics, flip between them (crude
  // flip-book walk). Cleared on scene change/unmount like the rest.
  const walkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const walkRestoreRef = useRef<(() => void) | null>(null);
  // Deferred MOVE target write (see the MOVE case): only one can be
  // pending at a time because a timed MOVE yields the script.
  const moveStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The live world state. A ref (not state) so that a run of commands
  // executed in one synchronous pass — [SET a = ...] followed by
  // [IF a > ...] — sees its own writes immediately. React state batches
  // updates until the pass ends, which made IF read stale values.
  // state.worldState mirrors this ref for rendering.
  const worldStateRef = useRef<WorldVars>({ ...game.info.worldState });

  // Games load asynchronously in Theater: the hook initializes before
  // the real game arrives, so seed newly-appearing initial variables
  // into the ref without clobbering values the script already wrote.
  useEffect(() => {
    const seed = game.info.worldState;
    let changed = false;
    for (const key of Object.keys(seed)) {
      if (!(key in worldStateRef.current)) {
        worldStateRef.current = { ...worldStateRef.current, [key]: seed[key] };
        changed = true;
      }
    }
    if (changed) {
      const snapshot = worldStateRef.current;
      setState(prev => ({ ...prev, worldState: snapshot }));
    }
  }, [game]);

  // Get current scene and parsed commands
  const currentScene = game.scenes.find(s => s.id === state.currentSceneId);
  const currentScript = currentScene?.script;
  const commands = useMemo(
    () => (currentScript ? parseScript(currentScript) : []),
    [currentScript],
  );
  const flatCommands = useMemo(() => flattenCommands(commands), [commands]);

  // When a timed command (WAIT, MOVE) yields, runFrom stores the
  // continuation here; the command's timeout invokes it.
  const resumeAfterWaitRef = useRef<(() => void) | null>(null);
  const runFromRef = useRef<(index: number) => void>(() => {});

  // Active BIND bindings, keyed "elementId.property". Cleared on scene
  // change. Re-evaluated on every worldState write.
  const bindingsRef = useRef<Map<string, Binding>>(new Map());

  // Narraton play history: which scenes the selector has already
  // chosen. Survives scene changes; reset via resetNarratonHistory
  // (Theater calls it when a fresh show starts).
  const narratonHistoryRef = useRef(createNarratonHistory());
  const currentSceneRef = useRef<Scene | undefined>(undefined);
  currentSceneRef.current = currentScene;

  // Evaluate every active binding and write the results into
  // elementOverrides. Runs after each SET and each BIND.
  const applyBindings = useCallback(() => {
    if (bindingsRef.current.size === 0) return;
    const results: Array<{ elementId: string; property: string; value: number }> = [];
    for (const binding of bindingsRef.current.values()) {
      let value = evaluateExpressionSource(binding.expression, worldStateRef.current);
      if (binding.property === 'opacity') value = Math.min(1, Math.max(0, value));
      if (binding.property === 'zIndex') value = Math.round(value);
      results.push({ elementId: binding.elementId, property: binding.property, value });
    }
    setState(prev => {
      const overrides = new Map(prev.elementOverrides);
      let changed = false;
      for (const r of results) {
        const existing = overrides.get(r.elementId) || {};
        if ((existing as Record<string, unknown>)[r.property] !== r.value) {
          overrides.set(r.elementId, { ...existing, [r.property]: r.value });
          changed = true;
        }
      }
      return changed ? { ...prev, elementOverrides: overrides } : prev;
    });
  }, []);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
    walkIntervalRef.current = null;
    walkRestoreRef.current = null;
    if (moveStartTimeoutRef.current) clearTimeout(moveStartTimeoutRef.current);
    moveStartTimeoutRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  // Complete dialogue text immediately
  const completeDialogue = useCallback(() => {
    if (!state.activeDialogue || state.activeDialogue.isComplete) return;
    
    clearTimeouts();
    setState(prev => ({
      ...prev,
      activeDialogue: prev.activeDialogue ? {
        ...prev.activeDialogue,
        displayedText: prev.activeDialogue.text,
        isComplete: true,
      } : null,
    }));
  }, [state.activeDialogue, clearTimeouts]);

  // Execute a single command
  const executeCommand = useCallback((command: ScriptCommand): boolean => {
    switch (command.type) {
      case 'DIALOGUE': {
        const actorId = findActorByName(command.actorName, game.actors);
        // {var} interpolation (the 1986 SAY_VAR, reborn): the sim's
        // numbers come out of the characters' mouths. Resolved at
        // speak time against the live world state.
        const spokenText = command.text.includes('{')
          ? interpolateText(command.text, worldStateRef.current)
          : command.text;

        // Animate the speaker: an explicit (Pose/Expression) tag wins;
        // otherwise auto-vary among the actor's graphics per utterance
        // so conversations come alive as pose matrices fill in. Always
        // resolve to a REAL graphic triple so the renderer never
        // falls back to the default sprite by accident.
        let chosenPose: string | undefined;
        let chosenExpression: string | undefined;
        const actorAsset = actorId ? game.actors.find(a => a.id === actorId) : undefined;
        const speakerEl = actorId
          ? currentSceneRef.current?.stage?.find(e => e.type === 'ACTOR' && e.assetId === actorId)
          : undefined;
        if (actorAsset && speakerEl && actorAsset.graphics.length > 0) {
          let graphic;
          if (command.expression || command.pose) {
            graphic = actorAsset.graphics.find(g =>
              (!command.pose || g.pose === command.pose) &&
              (!command.expression || g.expression === command.expression));
            if (!graphic) {
              warnOnce(`no graphic for ${command.actorName} (${command.pose ?? '*'}/${command.expression ?? '*'}); keeping current look`);
            }
          } else if (actorAsset.graphics.length > 1) {
            let h = 0;
            for (let i = 0; i < command.text.length; i++) h = (h * 31 + command.text.charCodeAt(i)) >>> 0;
            graphic = actorAsset.graphics[h % actorAsset.graphics.length];
          }
          if (graphic) {
            chosenPose = graphic.pose;
            chosenExpression = graphic.expression;
            const g = graphic;
            setState(prev => {
              const overrides = new Map(prev.elementOverrides);
              const existing = overrides.get(speakerEl.id) || {};
              overrides.set(speakerEl.id, {
                ...existing,
                pose: g.pose,
                expression: g.expression,
                spriteAngle: g.angle,
              });
              return { ...prev, elementOverrides: overrides };
            });
          }
        }

        // Balloons show their full text at once; only the narration
        // window keeps the typewriter.
        const isNarrator = command.actorName.trim().toLowerCase() === 'narrator';

        setState(prev => ({
          ...prev,
          activeDialogue: {
            actorId,
            actorName: command.actorName,
            text: spokenText,
            style: command.style,
            displayedText: isNarrator ? '' : spokenText,
            isComplete: !isNarrator,
            ...(chosenExpression ? { expression: chosenExpression } : {}),
            ...(chosenPose ? { pose: chosenPose } : {}),
          },
        }));

        if (!isNarrator) return false; // wait for user to advance

        // Start typewriter effect (narration only)
        let charIndex = 0;
        typewriterRef.current = setInterval(() => {
          charIndex++;
          const displayedText = spokenText.slice(0, charIndex);
          const isComplete = charIndex >= spokenText.length;
          
          setState(prev => ({
            ...prev,
            activeDialogue: prev.activeDialogue ? {
              ...prev.activeDialogue,
              displayedText,
              isComplete,
            } : null,
          }));
          
          if (isComplete && typewriterRef.current) {
            clearInterval(typewriterRef.current);
          }
        }, 1000 / textSpeed);
        
        return false; // Wait for user to advance
      }
      
      case 'ENTER': {
        // Show actor at position (instantly — no glide on entry)
        setState(prev => {
          const hidden = new Set(prev.hiddenElements);
          hidden.delete(command.actorId);
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.actorId) || {};
          overrides.set(command.actorId, { ...existing, x: command.x, y: command.y, transitionDuration: 0 });
          return { ...prev, hiddenElements: hidden, elementOverrides: overrides };
        });
        return true; // Continue immediately
      }
      
      case 'EXIT': {
        setState(prev => {
          const hidden = new Set(prev.hiddenElements);
          hidden.add(command.actorId);
          return { ...prev, hiddenElements: hidden };
        });
        return true;
      }
      
      case 'MOVE': {
        // Animate movement at the scripted speed
        const applyMoveTarget = () => setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.actorId) || {};
          overrides.set(command.actorId, {
            ...existing,
            x: command.x,
            y: command.y,
            transitionDuration: command.duration,
          });
          return { ...prev, elementOverrides: overrides };
        });

        // Wait for the animation, then auto-resume the script
        if (command.duration > 0) {
          // Write the target one breath AFTER the current position has
          // painted. An [ENTER x] immediately followed by [MOVE x] runs
          // in one synchronous pass — React batches both writes into a
          // single render, the sprite never paints at its start point,
          // and the tween has nothing to animate from (it "teleports").
          moveStartTimeoutRef.current = setTimeout(applyMoveTarget, 30);
          // Two-frame walk cycle: if the moving actor's graphics
          // include Walk1 + Walk2 poses, flip between them while the
          // move is in flight, then restore the prior look. When walk
          // frames exist at several sprite angles (8-direction sets:
          // 0=right, 90=down, 180=left, 270=up, plus diagonals), the
          // pair whose angle is nearest the travel direction is used.
          // Fail-soft: no walk frames means the sprite just glides.
          const movingEl = currentSceneRef.current?.stage?.find(e => e.id === command.actorId);
          const movingActor = movingEl?.type === 'ACTOR'
            ? game.actors.find(a => a.id === movingEl.assetId)
            : undefined;
          const walk1s = movingActor?.graphics.filter(g => g.pose.toLowerCase() === 'walk1') ?? [];
          const walk2s = movingActor?.graphics.filter(g => g.pose.toLowerCase() === 'walk2') ?? [];
          if (movingEl && walk1s.length > 0 && walk2s.length > 0) {
            const elId = movingEl.id;
            // Nearest-angle pick (screen coords, y down; clockwise from
            // "facing right"). Actors with only angle-0 frames always
            // get those — the pre-directional behavior.
            const angularDist = (a: number, b: number) =>
              Math.abs(((a - b + 540) % 360) - 180);
            const pickFrame = (frames: ActorGraphic[], dir: number) =>
              frames.reduce((best, g) =>
                angularDist(g.angle, dir) < angularDist(best.angle, dir) ? g : best);
            // Chosen inside the first updater (start position must be
            // read from live state; travel direction depends on it).
            let walk1 = walk1s[0];
            let walk2 = walk2s[0];
            // Snapshot the pre-walk look (captured inside the first
            // frame's updater so batched same-pass POSE writes are
            // seen) and restore it exactly when the move ends —
            // absent keys stay absent so the editor-authored pose wins.
            const snapshot: Partial<StageElementOverride> = {};
            let snapped = false;
            const setWalkFrame = (pick: (g1: ActorGraphic, g2: ActorGraphic) => ActorGraphic) => setState(prev => {
              const overrides = new Map(prev.elementOverrides);
              const existing = overrides.get(elId) || {};
              if (!snapped) {
                snapped = true;
                snapshot.pose = existing.pose;
                snapshot.expression = existing.expression;
                snapshot.spriteAngle = existing.spriteAngle;
                const startX = existing.x ?? movingEl.x;
                const startY = existing.y ?? movingEl.y;
                const dir = (Math.atan2(command.y - startY, command.x - startX) * 180 / Math.PI + 360) % 360;
                walk1 = pickFrame(walk1s, dir);
                walk2 = pickFrame(walk2s, dir);
              }
              const g = pick(walk1, walk2);
              overrides.set(elId, {
                ...existing,
                pose: g.pose,
                expression: g.expression,
                spriteAngle: g.angle,
              });
              return { ...prev, elementOverrides: overrides };
            });
            walkRestoreRef.current = () => setState(prev => {
              const overrides = new Map(prev.elementOverrides);
              const existing = { ...(overrides.get(elId) || {}) };
              (['pose', 'expression', 'spriteAngle'] as const).forEach(k => {
                if (snapshot[k] === undefined) delete existing[k];
                else (existing as Record<string, unknown>)[k] = snapshot[k];
              });
              overrides.set(elId, existing);
              return { ...prev, elementOverrides: overrides };
            });
            let frame = 0;
            setWalkFrame((g1) => g1);
            walkIntervalRef.current = setInterval(() => {
              frame++;
              setWalkFrame(frame % 2 === 0 ? (g1) => g1 : (_g1, g2) => g2);
            }, 250);
          }

          setState(prev => ({ ...prev, isWaiting: true }));
          waitTimeoutRef.current = setTimeout(() => {
            if (walkIntervalRef.current) {
              clearInterval(walkIntervalRef.current);
              walkIntervalRef.current = null;
            }
            walkRestoreRef.current?.();
            walkRestoreRef.current = null;
            setState(prev => ({ ...prev, isWaiting: false }));
            resumeAfterWaitRef.current?.();
          }, command.duration * 1000);
          return false;
        }
        // Instant move: apply synchronously
        applyMoveTarget();
        return true;
      }

      case 'POSE': {
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.actorId) || {};
          overrides.set(command.actorId, {
            ...existing,
            pose: command.pose,
            expression: command.expression,
          });
          return { ...prev, elementOverrides: overrides };
        });
        return true;
      }
      
      case 'BGM':
        onAudioCommand?.('bgm', command.trackName, { loop: command.loop, volume: command.volume });
        return true;
      
      case 'AMBIENCE':
        onAudioCommand?.('ambience', command.trackName, { loop: command.loop, volume: command.volume });
        return true;
      
      case 'SFX':
        onAudioCommand?.('sfx', command.effectName, { volume: command.volume });
        return true;
      
      case 'EFFECT': {
        setState(prev => {
          const effects = new Map(prev.activeEffects);
          const current = effects.get(command.targetId) || [];
          if (!current.includes(command.sfxId)) {
            effects.set(command.targetId, [...current, command.sfxId]);
          }
          return { ...prev, activeEffects: effects };
        });
        return true;
      }
      
      case 'CLEAR_EFFECT': {
        setState(prev => {
          const effects = new Map(prev.activeEffects);
          const current = effects.get(command.targetId) || [];
          effects.set(command.targetId, current.filter(id => id !== command.sfxId));
          return { ...prev, activeEffects: effects };
        });
        return true;
      }
      
      case 'WAIT': {
        setState(prev => ({ ...prev, isWaiting: true }));
        waitTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, isWaiting: false }));
          // Continue the script — before this, WAIT stalled forever
          // (nothing resumed execution, and manual advance re-ran the
          // WAIT itself).
          resumeAfterWaitRef.current?.();
        }, command.duration * 1000);
        return false;
      }
      
      case 'SCENE': {
        clearTimeouts();
        bindingsRef.current = new Map();
        onSceneChange?.(command.sceneId);
        setState(prev => ({
          ...prev,
          currentSceneId: command.sceneId,
          currentCommandIndex: 0,
          activeDialogue: null,
          choices: null,
          hiddenElements: new Set(),
          elementOverrides: new Map(),
          activeEffects: new Map(),
          activeButtons: new Set(),
          activeSliders: new Map(),
      activeGauges: new Map(),
          isWaiting: false,
          isComplete: false,
        }));
        // Yield: the new scene starts via the scene-change effect.
        // Continuing here would keep executing the OLD scene's commands
        // past the jump.
        return false;
      }
      
      case 'CHOICE': {
        setState(prev => ({
          ...prev,
          choices: { options: command.options },
        }));
        return false; // Wait for user selection
      }
      
      case 'SET': {
        // Write the ref synchronously (so later commands in this pass
        // see it), then mirror into state for rendering.
        const resolved = resolveSetValue(command, worldStateRef.current);
        worldStateRef.current = { ...worldStateRef.current, [command.variable]: resolved };
        const snapshot = worldStateRef.current;
        setState(prev => ({ ...prev, worldState: snapshot }));
        applyBindings();
        return true;
      }

      case 'IF':
        // Handled by the flattened execution in runFrom (main flow) and
        // by executeTickBody (tick flow); never executed directly.
        return true;
      
      case 'BUTTON': {
        setState(prev => {
          const buttons = new Set(prev.activeButtons);
          buttons.add(command.buttonId);
          return { ...prev, activeButtons: buttons };
        });
        return true;
      }
      
      case 'HIDE_BUTTON': {
        setState(prev => {
          const buttons = new Set(prev.activeButtons);
          buttons.delete(command.buttonId);
          return { ...prev, activeButtons: buttons };
        });
        return true;
      }
      
      case 'TICK':
        // Declaration only: the interval effect below picks it up.
        return true;

      case 'SET_TEXT': {
        const text = interpolateText(command.text, worldStateRef.current);
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.elementId) || {};
          if (existing.text === text) return prev; // no churn on repeated ticks
          overrides.set(command.elementId, { ...existing, text });
          return { ...prev, elementOverrides: overrides };
        });
        return true;
      }

      case 'AUTOPLAY': {
        setState(prev => ({ ...prev, isAutoPlay: command.enabled }));
        return true;
      }

      case 'BIND': {
        if (!BINDABLE_PROPERTIES.has(command.property)) {
          warnOnce(`BIND: "${command.property}" is not bindable (use x, y, scale, rotation, opacity, zIndex); ignored`);
          return true;
        }
        const stage = currentSceneRef.current?.stage;
        if (stage && !stage.some(e => e.id === command.elementId)) {
          warnOnce(`BIND: no stage element "${command.elementId}" in scene "${currentSceneRef.current?.id}" (binding anyway)`);
        }
        bindingsRef.current.set(`${command.elementId}.${command.property}`, {
          elementId: command.elementId,
          property: command.property,
          expression: command.expression,
        });
        applyBindings();
        return true;
      }

      case 'UNBIND': {
        // The element keeps its last driven value
        bindingsRef.current.delete(`${command.elementId}.${command.property}`);
        return true;
      }

      case 'SLIDER': {
        setState(prev => {
          const sliders = new Map(prev.activeSliders);
          sliders.set(command.variable, command);
          return { ...prev, activeSliders: sliders };
        });
        // Seed the variable so the slider and any BINDs on it agree
        // before the first drag
        if (!(command.variable in worldStateRef.current)) {
          worldStateRef.current = { ...worldStateRef.current, [command.variable]: command.min };
          const snapshot = worldStateRef.current;
          setState(prev => ({ ...prev, worldState: snapshot }));
          applyBindings();
        }
        return true;
      }

      case 'GAUGE': {
        setState(prev => {
          const gauges = new Map(prev.activeGauges);
          gauges.set(command.variable, command);
          return { ...prev, activeGauges: gauges };
        });
        return true;
      }

      case 'HIDE_SLIDER': {
        setState(prev => {
          const sliders = new Map(prev.activeSliders);
          sliders.delete(command.variable);
          return { ...prev, activeSliders: sliders };
        });
        return true;
      }

      case 'HIDE_GAUGE': {
        setState(prev => {
          const gauges = new Map(prev.activeGauges);
          gauges.delete(command.variable);
          return { ...prev, activeGauges: gauges };
        });
        return true;
      }

      case 'NARRATON': {
        const { winner } = selectNarratonScene(
          command.pool,
          game.scenes,
          worldStateRef.current,
          narratonHistoryRef.current,
        );
        if (!winner) {
          warnOnce(`NARRATON: no eligible scene in pool "${command.pool}"; continuing script`);
          return true; // fail soft: fall through to the next command
        }
        narratonHistoryRef.current.played.add(winner.id);
        // Transition exactly like SCENE
        clearTimeouts();
        bindingsRef.current = new Map();
        onSceneChange?.(winner.id);
        setState(prev => ({
          ...prev,
          currentSceneId: winner.id,
          currentCommandIndex: 0,
          activeDialogue: null,
          choices: null,
          hiddenElements: new Set(),
          elementOverrides: new Map(),
          activeEffects: new Map(),
          activeButtons: new Set(),
          activeSliders: new Map(),
          activeGauges: new Map(),
          isWaiting: false,
          isComplete: false,
        }));
        return false; // yield: the new scene starts via the scene-change effect
      }

      case 'COMMENT':
      case 'UNKNOWN':
        return true; // Skip
    }
  }, [game, onSceneChange, onAudioCommand, textSpeed, clearTimeouts, applyBindings]);

  // Execute a TICK body: non-blocking commands only, run against the
  // live worldState ref, never touching the yield/advance machinery.
  const executeTickBody = useCallback((cmds: ScriptCommand[]) => {
    for (const cmd of cmds) {
      switch (cmd.type) {
        case 'DIALOGUE':
        case 'CHOICE':
        case 'WAIT':
        case 'TICK':
          warnOnce(`${cmd.type} is not allowed inside a TICK body; skipped`);
          continue;
        case 'IF': {
          if (evaluateIfCondition(cmd, worldStateRef.current)) {
            executeTickBody(cmd.commands);
          } else {
            const arm = (cmd.elifs ?? []).find(e => evaluateIfCondition(
              { type: 'IF', variable: e.variable, operator: e.operator, value: e.value, ...(e.isExpression ? { isExpression: true } : {}), commands: [] } as IfCommand,
              worldStateRef.current,
            ));
            if (arm) executeTickBody(arm.commands);
            else if (cmd.elseCommands) executeTickBody(cmd.elseCommands);
          }
          continue;
        }
        case 'MOVE':
          // Animate at the scripted speed but never set isWaiting —
          // a tick body must not block
          setState(prev => {
            const overrides = new Map(prev.elementOverrides);
            const existing = overrides.get(cmd.actorId) || {};
            overrides.set(cmd.actorId, { ...existing, x: cmd.x, y: cmd.y, transitionDuration: cmd.duration });
            return { ...prev, elementOverrides: overrides };
          });
          continue;
        default:
          // SET, ENTER, EXIT, POSE, EFFECT, CLEAR_EFFECT, BUTTON,
          // HIDE_BUTTON, BGM, AMBIENCE, SFX, SCENE, COMMENT, UNKNOWN
          // are all non-blocking in executeCommand.
          executeCommand(cmd);
      }
    }
  }, [executeCommand]);

  // The TICK heartbeat. Runs the scene's tick body on its interval,
  // concurrent with normal flow; stops on scene change and unmount.
  const tickCommands = commands.filter((c): c is TickCommand => c.type === 'TICK');
  if (tickCommands.length > 1) {
    warnOnce(`scene "${state.currentSceneId}" has ${tickCommands.length} TICK blocks; only the first runs`);
  }
  const activeTick = tickCommands[0];
  const tickBodyRef = useRef<ScriptCommand[]>([]);
  tickBodyRef.current = activeTick?.commands ?? [];
  const executeTickBodyRef = useRef(executeTickBody);
  executeTickBodyRef.current = executeTickBody;
  const tickKey = activeTick ? `${state.currentSceneId}:${activeTick.interval}` : null;

  useEffect(() => {
    if (!tickKey) return;
    const intervalSeconds = Number(tickKey.slice(tickKey.lastIndexOf(':') + 1));
    const id = setInterval(() => {
      executeTickBodyRef.current(tickBodyRef.current);
    }, Math.max(50, intervalSeconds * 1000)); // floor: don't let a typo spin the CPU
    return () => clearInterval(id);
  }, [tickKey]);

  // Execute the flattened command list from an index until something
  // yields (dialogue, choice, wait, scene change) or the script ends.
  const runFrom = useCallback((startIndex: number) => {
    let i = startIndex;
    while (i < flatCommands.length) {
      const node = flatCommands[i];

      // Unconditional jump (end of a taken IF/ELSEIF/ELSE branch body)
      if (node.kind === 'jump') {
        i = node.jumpTo ?? i + 1;
        continue;
      }

      // IF test node: on false, jump past the flattened body
      if (node.cmd.type === 'IF') {
        const met = evaluateIfCondition(node.cmd as IfCommand, worldStateRef.current);
        i = met ? i + 1 : (node.jumpTo ?? i + 1);
        continue;
      }

      const shouldContinue = executeCommand(node.cmd);
      if (!shouldContinue) {
        // SCENE/NARRATON already reset all state for the new scene
        // (index 0); writing our index here would clobber that reset.
        if (node.cmd.type === 'SCENE' || node.cmd.type === 'NARRATON') {
          resumeAfterWaitRef.current = null;
          return;
        }
        const yieldIndex = i;
        setState(prev => ({ ...prev, currentCommandIndex: yieldIndex }));
        // Timed commands (WAIT, MOVE) resume on their own; user-driven
        // yields (dialogue, choice) and scene changes do not.
        if (node.cmd.type === 'WAIT' || node.cmd.type === 'MOVE') {
          resumeAfterWaitRef.current = () => runFromRef.current(yieldIndex + 1);
        } else {
          resumeAfterWaitRef.current = null;
        }
        return;
      }
      i++;
    }

    // Reached end of script
    setState(prev => ({ ...prev, currentCommandIndex: i, isComplete: true }));
  }, [flatCommands, executeCommand]);
  runFromRef.current = runFrom;

  // Advance to next command (user input / auto-play)
  const advance = useCallback(() => {
    if (state.isWaiting) return;
    if (state.choices) return; // choices resolve via selectChoice
    if (state.isComplete) return;

    // If dialogue is active but not complete, complete it first
    if (state.activeDialogue && !state.activeDialogue.isComplete) {
      completeDialogue();
      return;
    }

    // Clear current dialogue and continue past it
    if (state.activeDialogue) {
      setState(prev => ({ ...prev, activeDialogue: null }));
      runFrom(state.currentCommandIndex + 1);
      return;
    }

    runFrom(state.currentCommandIndex);
  }, [state, runFrom, completeDialogue]);

  // Handle choice selection
  const selectChoice = useCallback((index: number) => {
    if (!state.choices) return;

    const option = state.choices.options[index];
    if (!option) return;

    // Navigate to target scene
    clearTimeouts();
    bindingsRef.current = new Map();
    onSceneChange?.(option.target);
    setState(prev => ({
      ...prev,
      currentSceneId: option.target,
      currentCommandIndex: 0,
      activeDialogue: null,
      choices: null,
      hiddenElements: new Set(),
      elementOverrides: new Map(),
      activeEffects: new Map(),
      activeButtons: new Set(),
      activeSliders: new Map(),
      activeGauges: new Map(),
      isWaiting: false,
      isComplete: false,
    }));
  }, [state.choices, onSceneChange, clearTimeouts]);

  // Auto-advance when in auto-play mode
  useEffect(() => {
    if (!state.isAutoPlay) return;
    if (state.isWaiting || state.choices) return;
    if (!state.activeDialogue?.isComplete) return;
    
    autoAdvanceRef.current = setTimeout(() => {
      advance();
    }, autoAdvanceDelay);
    
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [state.isAutoPlay, state.isWaiting, state.choices, state.activeDialogue?.isComplete, autoAdvanceDelay, advance]);

  // Start script on mount
  useEffect(() => {
    if (commands.length > 0 && state.currentCommandIndex === 0 && !state.activeDialogue && !state.isComplete) {
      advance();
    }
  }, [commands.length, state.currentSceneId]); // Only run when scene changes

  // Reset to a specific scene
  const goToScene = useCallback((sceneId: string) => {
    clearTimeouts();
    bindingsRef.current = new Map();
    onSceneChange?.(sceneId);
    setState(prev => ({
      ...prev,
      currentSceneId: sceneId,
      currentCommandIndex: 0,
      activeDialogue: null,
      choices: null,
      hiddenElements: new Set(),
      elementOverrides: new Map(),
      activeEffects: new Map(),
      activeButtons: new Set(),
      activeSliders: new Map(),
      activeGauges: new Map(),
      isWaiting: false,
      isComplete: false,
    }));
  }, [onSceneChange, clearTimeouts]);

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setState(prev => ({ ...prev, isAutoPlay: !prev.isAutoPlay }));
  }, []);

  // External worldState write (sliders, debug tools). Re-evaluates
  // BINDs immediately so dragging drives the stage live.
  const setVariable = useCallback((name: string, value: string | number | boolean) => {
    worldStateRef.current = { ...worldStateRef.current, [name]: value };
    const snapshot = worldStateRef.current;
    setState(prev => ({ ...prev, worldState: snapshot }));
    applyBindings();
  }, [applyBindings]);

  // Forget which scenes the Narraton has already chosen (fresh show)
  const resetNarratonHistory = useCallback(() => {
    narratonHistoryRef.current = createNarratonHistory();
  }, []);

  return {
    state,
    currentScene,
    advance,
    selectChoice,
    completeDialogue,
    goToScene,
    toggleAutoPlay,
    setVariable,
    resetNarratonHistory,
  };
}
