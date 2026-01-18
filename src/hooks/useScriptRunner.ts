import { useState, useCallback, useRef, useEffect } from 'react';
import { GameData, Scene, StageElement } from '@/types';
import { parseScript, ScriptCommand, DialogueCommand, findActorByName } from '@/utils/scriptParser';

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
  elementOverrides: Map<string, Partial<StageElement>>;
  activeEffects: Map<string, string[]>;
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
    isWaiting: false,
    isComplete: false,
    isAutoPlay: game.info.gameMode === 'AUTO_PLAY',
  }));

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

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
        setState(prev => ({
          ...prev,
          worldState: { ...prev.worldState, [command.variable]: command.value },
        }));
        return true;
      }
      
      case 'IF': {
        const varValue = state.worldState[command.variable];
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
          // Execute nested commands
          for (const nestedCmd of command.commands) {
            executeCommand(nestedCmd);
          }
        }
        return true;
      }
      
      case 'COMMENT':
      case 'UNKNOWN':
        return true; // Skip
    }
  }, [game, state.worldState, onSceneChange, onAudioCommand, textSpeed, clearTimeouts]);

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
    while (nextIndex < commands.length) {
      const command = commands[nextIndex];
      const shouldContinue = executeCommand(command);
      
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
    
    // Navigate to target scene
    clearTimeouts();
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
