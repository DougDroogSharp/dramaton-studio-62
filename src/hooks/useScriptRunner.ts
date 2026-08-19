import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GameData, Scene, StageElement, StageElementOverride } from '@/types';
import { parseScript, ScriptCommand, IfCommand, TickCommand, findActorByName } from '@/utils/scriptParser';
import { resolveSetValue, evaluateIfCondition, evaluateExpressionSource, warnOnce, WorldVars } from '@/utils/expression';

// Properties BIND may drive on a stage element
const BINDABLE_PROPERTIES = new Set(['x', 'y', 'scale', 'rotation', 'opacity', 'zIndex']);

interface Binding {
  elementId: string;
  property: string;
  expression: string;
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
}

function flattenCommands(cmds: ScriptCommand[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (list: ScriptCommand[]) => {
    for (const c of list) {
      if (c.type === 'IF') {
        const node: FlatNode = { cmd: c };
        out.push(node);
        walk(c.commands);
        node.jumpTo = out.length;
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
  textSpeed = 50,
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
    isWaiting: false,
    isComplete: false,
    isAutoPlay: game.info.gameMode === 'AUTO_PLAY',
  }));

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

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
        setState(prev => ({
          ...prev,
          activeDialogue: {
            actorId,
            actorName: command.actorName,
            text: command.text,
            style: command.style,
            displayedText: '',
            isComplete: false,
          },
        }));
        
        // Start typewriter effect
        let charIndex = 0;
        typewriterRef.current = setInterval(() => {
          charIndex++;
          const displayedText = command.text.slice(0, charIndex);
          const isComplete = charIndex >= command.text.length;
          
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
        setState(prev => {
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
          setState(prev => ({ ...prev, isWaiting: true }));
          waitTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, isWaiting: false }));
            resumeAfterWaitRef.current?.();
          }, command.duration * 1000);
          return false;
        }
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
        case 'IF':
          if (evaluateIfCondition(cmd, worldStateRef.current)) {
            executeTickBody(cmd.commands);
          }
          continue;
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

      // IF test node: on false, jump past the flattened body
      if (node.cmd.type === 'IF') {
        const met = evaluateIfCondition(node.cmd as IfCommand, worldStateRef.current);
        i = met ? i + 1 : (node.jumpTo ?? i + 1);
        continue;
      }

      const shouldContinue = executeCommand(node.cmd);
      if (!shouldContinue) {
        // SCENE already reset all state for the new scene (index 0);
        // writing our index here would clobber that reset.
        if (node.cmd.type === 'SCENE') {
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
      isWaiting: false,
      isComplete: false,
    }));
  }, [onSceneChange, clearTimeouts]);

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setState(prev => ({ ...prev, isAutoPlay: !prev.isAutoPlay }));
  }, []);

  return {
    state,
    currentScene,
    advance,
    selectChoice,
    completeDialogue,
    goToScene,
    toggleAutoPlay,
  };
}
