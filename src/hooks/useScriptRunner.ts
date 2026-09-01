import { useState, useCallback, useRef, useEffect } from 'react';
import { GameData, Scene, StageElement } from '@/types';
import { parseScript, ScriptCommand, DialogueCommand, SetCommand, ChoiceOption, findActorByName } from '@/utils/scriptParser';

export type VarScope = 'world' | 'local';

// One recorded variable change, for the Narraton test-mode panel.
export interface VarChange {
  variable: string;
  scope: VarScope;
  from: string | number | boolean | undefined;
  to: string | number | boolean;
  sceneId: string;
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
  options: ChoiceOption[];
}

export interface ScriptRunnerState {
  currentSceneId: string;
  currentCommandIndex: number;
  activeDialogue: ActiveDialogue | null;
  choices: ChoiceState | null;
  worldState: Record<string, string | number | boolean>;
  // In-scene variables: seeded from Scene.localVars on scene entry, reset on
  // every scene change, never written back to worldState (invisible to Narraton).
  localState: Record<string, string | number | boolean>;
  varLog: VarChange[];
  hiddenElements: Set<string>;
  elementOverrides: Map<string, Partial<StageElement>>;
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
    localState: { ...(game.scenes.find(s => s.id === startSceneId)?.localVars || {}) },
    varLog: [],
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

  // Which scene a mid-chain command belongs to (state.currentSceneId is stale
  // inside an advance() loop that crossed a scene boundary).
  const currentSceneIdRef = useRef(startSceneId);

  // Set by the SCENE command so advance() stops walking the OLD scene's
  // command list after a jump — commands after [SCENE x] must not run (they
  // could even leak a local variable into world state, since the local store
  // has already been re-seeded for the new scene).
  const navigatedRef = useRef(false);

  // Synchronous mirror of variable state. React state updates are queued, so a
  // [SET] followed by an [IF] within one advance() chain must read from here,
  // not from the (stale) state closure. setState keeps the rendered copies in
  // sync after every change.
  const varsRef = useRef({
    world: { ...game.info.worldState },
    local: { ...(game.scenes.find(s => s.id === startSceneId)?.localVars || {}) },
  });

  // Route a variable to its store: local when the current scene DECLARED it in
  // localVars; everything else is world state (matches pre-Narraton behavior).
  const scopeOf = useCallback((variable: string): VarScope => (
    variable in varsRef.current.local ? 'local' : 'world'
  ), []);

  const readVar = useCallback((variable: string) => {
    const scope = scopeOf(variable);
    return scope === 'local' ? varsRef.current.local[variable] : varsRef.current.world[variable];
  }, [scopeOf]);

  // Apply a SET (including += / -=) synchronously, log it, mirror into state.
  const applySet = useCallback((cmd: SetCommand, sceneId: string) => {
    const scope = scopeOf(cmd.variable);
    const store = scope === 'local' ? varsRef.current.local : varsRef.current.world;
    const from = store[cmd.variable];
    let to: string | number | boolean;
    if (cmd.op === '+=' || cmd.op === '-=') {
      const base = Number(from ?? 0);
      const delta = Number(cmd.value);
      const safeBase = Number.isFinite(base) ? base : 0;
      const safeDelta = Number.isFinite(delta) ? delta : 0;
      to = cmd.op === '+=' ? safeBase + safeDelta : safeBase - safeDelta;
    } else {
      to = cmd.value;
    }
    store[cmd.variable] = to;
    const change: VarChange = { variable: cmd.variable, scope, from, to, sceneId };
    setState(prev => ({
      ...prev,
      worldState: { ...varsRef.current.world },
      localState: { ...varsRef.current.local },
      varLog: [...prev.varLog, change],
    }));
  }, [scopeOf]);

  // Reset in-scene variables when entering a scene.
  const seedLocals = useCallback((sceneId: string) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    varsRef.current.local = { ...(scene?.localVars || {}) };
  }, [game.scenes]);

  // Get current scene and parsed commands
  const currentScene = game.scenes.find(s => s.id === state.currentSceneId);
  const commands = currentScene?.script ? parseScript(currentScene.script) : [];

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
        // Show actor at position
        setState(prev => {
          const hidden = new Set(prev.hiddenElements);
          hidden.delete(command.actorId);
          const overrides = new Map(prev.elementOverrides);
          overrides.set(command.actorId, { x: command.x, y: command.y });
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
        // Animate movement
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          overrides.set(command.actorId, { x: command.x, y: command.y });
          return { ...prev, elementOverrides: overrides };
        });
        
        // Wait for animation
        if (command.duration > 0) {
          setState(prev => ({ ...prev, isWaiting: true }));
          waitTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, isWaiting: false }));
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
        }, command.duration * 1000);
        return false;
      }
      
      case 'SCENE': {
        clearTimeouts();
        navigatedRef.current = true;
        currentSceneIdRef.current = command.sceneId;
        seedLocals(command.sceneId);
        onSceneChange?.(command.sceneId);
        setState(prev => ({
          ...prev,
          currentSceneId: command.sceneId,
          currentCommandIndex: 0,
          activeDialogue: null,
          choices: null,
          localState: { ...varsRef.current.local },
          hiddenElements: new Set(),
          elementOverrides: new Map(),
          activeEffects: new Map(),
          activeButtons: new Set(),
          isWaiting: false,
        }));
        return true;
      }
      
      case 'CHOICE': {
        setState(prev => ({
          ...prev,
          choices: { options: command.options },
        }));
        return false; // Wait for user selection
      }
      
      case 'SET': {
        applySet(command, currentSceneIdRef.current);
        return true;
      }

      case 'IF': {
        const varValue = readVar(command.variable);
        let conditionMet = false;
        
        switch (command.operator) {
          case '==': conditionMet = varValue === command.value; break;
          case '!=': conditionMet = varValue !== command.value; break;
          case '>': conditionMet = Number(varValue) > Number(command.value); break;
          case '<': conditionMet = Number(varValue) < Number(command.value); break;
          case '>=': conditionMet = Number(varValue) >= Number(command.value); break;
          case '<=': conditionMet = Number(varValue) <= Number(command.value); break;
        }
        
        if (conditionMet && command.commands.length > 0) {
          // Execute nested commands (stop if one of them jumped scenes)
          for (const nestedCmd of command.commands) {
            executeCommand(nestedCmd);
            if (navigatedRef.current) break;
          }
        }
        return true;
      }
      
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
      
      case 'COMMENT':
      case 'UNKNOWN':
        return true; // Skip
    }
  }, [game, readVar, applySet, seedLocals, onSceneChange, onAudioCommand, textSpeed, clearTimeouts]);

  // Advance to next command
  const advance = useCallback(() => {
    if (state.isWaiting) return;
    
    // If dialogue is active but not complete, complete it first
    if (state.activeDialogue && !state.activeDialogue.isComplete) {
      completeDialogue();
      return;
    }
    
    // Clear current dialogue
    if (state.activeDialogue) {
      setState(prev => ({ ...prev, activeDialogue: null }));
    }
    
    // Move to next command
    let nextIndex = state.currentCommandIndex + (state.activeDialogue ? 1 : 0);
    
    // Execute commands until we hit one that requires waiting
    navigatedRef.current = false;
    while (nextIndex < commands.length) {
      const command = commands[nextIndex];
      const shouldContinue = executeCommand(command);

      // A [SCENE] jump ends this scene's chain — the start-script effect
      // takes over in the new scene; do NOT run the old scene's remainder.
      if (navigatedRef.current) {
        navigatedRef.current = false;
        return;
      }

      if (!shouldContinue) {
        setState(prev => ({ ...prev, currentCommandIndex: nextIndex }));
        return;
      }

      nextIndex++;
    }
    
    // Reached end of script
    setState(prev => ({ ...prev, currentCommandIndex: nextIndex, isComplete: true }));
  }, [state, commands, executeCommand, completeDialogue]);

  // Handle choice selection
  const selectChoice = useCallback((index: number) => {
    if (!state.choices) return;
    
    const option = state.choices.options[index];
    if (!option) return;

    // Decision point: twiddle the option's variables before leaving the scene.
    for (const set of option.sets || []) {
      applySet(set, currentSceneIdRef.current);
    }

    // Navigate to target scene
    clearTimeouts();
    currentSceneIdRef.current = option.target;
    seedLocals(option.target);
    onSceneChange?.(option.target);
    setState(prev => ({
      ...prev,
      currentSceneId: option.target,
      currentCommandIndex: 0,
      activeDialogue: null,
      choices: null,
      localState: { ...varsRef.current.local },
      hiddenElements: new Set(),
      elementOverrides: new Map(),
      activeEffects: new Map(),
      activeButtons: new Set(),
      isWaiting: false,
      isComplete: false,
    }));
  }, [state.choices, applySet, seedLocals, onSceneChange, clearTimeouts]);

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

  // Start script on mount / scene change. Scheduled through a timeout WITH
  // CLEANUP so React StrictMode's double-invoked mount effect cancels the
  // first schedule — otherwise the opening command chain runs twice, and
  // since [SET x += n] is stateful, gauges would double-apply in dev.
  useEffect(() => {
    if (commands.length > 0 && state.currentCommandIndex === 0 && !state.activeDialogue && !state.isComplete) {
      const timer = setTimeout(() => advance(), 0);
      return () => clearTimeout(timer);
    }
  }, [commands.length, state.currentSceneId]); // Only run when scene changes

  // Reset to a specific scene
  const goToScene = useCallback((sceneId: string) => {
    clearTimeouts();
    currentSceneIdRef.current = sceneId;
    seedLocals(sceneId);
    onSceneChange?.(sceneId);
    setState(prev => ({
      ...prev,
      currentSceneId: sceneId,
      currentCommandIndex: 0,
      activeDialogue: null,
      choices: null,
      localState: { ...varsRef.current.local },
      hiddenElements: new Set(),
      elementOverrides: new Map(),
      activeEffects: new Map(),
      activeButtons: new Set(),
      isWaiting: false,
      isComplete: false,
    }));
  }, [seedLocals, onSceneChange, clearTimeouts]);

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
