import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GameData, Scene, StageElement, ActorAnimation, AnimationFrame, AnimationDirection } from '@/types';
import { parseScript, ScriptCommand, DialogueCommand, SayCommand, PoseMoveCommand, findActorByName } from '@/utils/scriptParser';

export interface ActiveDialogue {
  actorId: string | null;
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
  displayedText: string; // For typewriter effect
  isComplete: boolean;
}

// Entry for dialogue history/backlog
export interface DialogueHistoryEntry {
  id: string;
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
  timestamp: number;
}

// Runtime balloon for SAY command
export interface RuntimeBalloon {
  id: string;
  targetScriptId: string; // Script ID of the target actor/item
  text: string;
  displayedText: string; // For typewriter effect
  style: 'speech' | 'thought';
  x: number;
  y: number;
  isComplete: boolean;
}

export interface ChoiceState {
  options: { text: string; target: string }[];
}

// Element override state for script-driven changes
export interface ElementOverride {
  x?: number;
  y?: number;
  zIndex?: number;
  pose?: string;
  expression?: string;
  angle?: number;
  scale?: number;
  rotation?: number;
  animationFrame?: string; // Current animation frame image (overrides pose graphic during animation)
}

export interface ScriptRunnerState {
  currentSceneId: string;
  currentCommandIndex: number;
  activeDialogue: ActiveDialogue | null;
  activeBalloon: RuntimeBalloon | null; // Runtime balloon from SAY command
  choices: ChoiceState | null;
  worldState: Record<string, string | number | boolean>;
  hiddenElements: Set<string>;
  elementOverrides: Map<string, ElementOverride>;
  activeEffects: Map<string, string[]>;
  activeButtons: Set<string>; // Button IDs that are currently visible/active
  collectedItems: Set<string>; // Item IDs that have been collected
  isWaiting: boolean;
  isComplete: boolean;
  isAutoPlay: boolean;
  hasExecutedCurrentCommand: boolean; // Track if current command was already run (for advancing past WAIT, etc.)
  subCommandProgress: number; // 0-1 progress within current timed command (MOVE, WAIT)
}

// Serializable snapshot for history (converts Sets/Maps to arrays for deep cloning)
export interface StateSnapshot {
  currentSceneId: string;
  currentCommandIndex: number;
  activeDialogue: ActiveDialogue | null;
  choices: ChoiceState | null;
  worldState: Record<string, string | number | boolean>;
  hiddenElements: string[];
  elementOverrides: [string, ElementOverride][];
  activeEffects: [string, string[]][];
  activeButtons: string[];
  collectedItems: string[];
  commandType: string; // The command that was executed to reach this state
}

// Error types for script validation
export interface ScriptError {
  type: 'MISSING_ACTOR' | 'MISSING_ITEM';
  command: ScriptCommand;
  itemId: string;
  itemName: string;
  commandType: string;
}

interface UseScriptRunnerOptions {
  game: GameData;
  startSceneId: string;
  onSceneChange?: (sceneId: string) => void;
  onAudioCommand?: (type: 'bgm' | 'ambience' | 'sfx', name: string, options: { loop?: boolean; volume?: number }) => void;
  onScriptError?: (error: ScriptError) => void; // Called when commands reference missing actors/items
  textSpeed?: number; // Characters per second
  autoAdvanceDelay?: number; // ms delay after dialogue completes in auto mode
}

// Helper to format itemId to display name
function formatItemName(itemId: string): string {
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function useScriptRunner({
  game,
  startSceneId,
  onSceneChange,
  onAudioCommand,
  onScriptError,
  textSpeed = 50,
  autoAdvanceDelay = 1500,
}: UseScriptRunnerOptions) {
  const [state, setState] = useState<ScriptRunnerState>(() => ({
    currentSceneId: startSceneId,
    currentCommandIndex: 0,
    activeDialogue: null,
    activeBalloon: null,
    choices: null,
    worldState: { ...game.info.worldState },
    hiddenElements: new Set(),
    elementOverrides: new Map(),
    activeEffects: new Map(),
    activeButtons: new Set(),
    collectedItems: new Set(game.info.collectedItems || []),
    isWaiting: false,
    isComplete: false,
    isAutoPlay: false, // Default to manual mode - user clicks Play to advance
    hasExecutedCurrentCommand: false,
    subCommandProgress: 0,
  }));

  // History stack for step-back functionality
  const [history, setHistory] = useState<StateSnapshot[]>([]);
  
  // Dialogue history/backlog for player review
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistoryEntry[]>([]);
  const dialogueHistoryIdRef = useRef(0);
  const maxHistorySize = 100;
  const maxDialogueHistorySize = 200;

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timeouts (defined early as it's used by helper functions)
  const clearTimeouts = useCallback(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
  }, []);

  // Helper: Create a snapshot of current state
  const createSnapshot = useCallback((commandType: string): StateSnapshot => ({
    currentSceneId: state.currentSceneId,
    currentCommandIndex: state.currentCommandIndex,
    activeDialogue: state.activeDialogue,
    choices: state.choices,
    worldState: { ...state.worldState },
    hiddenElements: Array.from(state.hiddenElements),
    elementOverrides: Array.from(state.elementOverrides.entries()),
    activeEffects: Array.from(state.activeEffects.entries()),
    activeButtons: Array.from(state.activeButtons),
    collectedItems: Array.from(state.collectedItems),
    commandType,
  }), [state]);

  // Helper: Restore state from snapshot
  const restoreFromSnapshot = useCallback((snapshot: StateSnapshot) => {
    clearTimeouts();
    setState({
      currentSceneId: snapshot.currentSceneId,
      currentCommandIndex: snapshot.currentCommandIndex,
      activeDialogue: snapshot.activeDialogue,
      activeBalloon: null, // Clear balloon on restore
      choices: snapshot.choices,
      worldState: { ...snapshot.worldState },
      hiddenElements: new Set(snapshot.hiddenElements),
      elementOverrides: new Map(snapshot.elementOverrides),
      activeEffects: new Map(snapshot.activeEffects),
      activeButtons: new Set(snapshot.activeButtons),
      collectedItems: new Set(snapshot.collectedItems),
      isWaiting: false,
      isComplete: false,
      isAutoPlay: false, // Disable auto-play on step back
      hasExecutedCurrentCommand: false,
      subCommandProgress: 0,
    });
  }, [clearTimeouts]);

  // Get current scene and parsed commands (memoized to prevent re-parsing on every render)
  const currentScene = useMemo(
    () => game.scenes.find(s => s.id === state.currentSceneId),
    [game.scenes, state.currentSceneId]
  );
  
  const commands = useMemo(
    () => currentScene?.script ? parseScript(currentScene.script) : [],
    [currentScene?.script]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  // Sync currentSceneId when startSceneId changes (e.g., after game loads async)
  // Use a ref to track if we've already synced to avoid loops
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (startSceneId && !hasInitializedRef.current && state.currentSceneId !== startSceneId) {
      hasInitializedRef.current = true;
      setState(prev => ({
        ...prev,
        currentSceneId: startSceneId,
      }));
    }
  }, [startSceneId, state.currentSceneId]);

  // Complete dialogue text immediately
  const completeDialogue = useCallback(() => {
    // Handle both activeDialogue and activeBalloon
    if (state.activeDialogue && !state.activeDialogue.isComplete) {
      clearTimeouts();
      setState(prev => ({
        ...prev,
        activeDialogue: prev.activeDialogue ? {
          ...prev.activeDialogue,
          displayedText: prev.activeDialogue.text,
          isComplete: true,
        } : null,
      }));
      return;
    }
    
    if (state.activeBalloon && !state.activeBalloon.isComplete) {
      clearTimeouts();
      setState(prev => ({
        ...prev,
        activeBalloon: prev.activeBalloon ? {
          ...prev.activeBalloon,
          displayedText: prev.activeBalloon.text,
          isComplete: true,
        } : null,
      }));
      return;
    }
  }, [state.activeDialogue, state.activeBalloon, clearTimeouts]);

  // Helper: Execute regular MOVE as fallback for POSE_MOVE
  const executeRegularMove = useCallback((
    command: PoseMoveCommand, 
    currentOverride: ElementOverride
  ): boolean => {
    const startX = currentOverride.x ?? 50;
    const startY = currentOverride.y ?? 50;
    const startScale = currentOverride.scale ?? 1;
    const duration = command.duration ?? 2;
    const targetScale = command.scale;
    
    if (duration > 0) {
      const startTime = performance.now();
      const durationMs = duration * 1000;
      
      const animateMove = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        
        const currentX = startX + (command.x - startX) * eased;
        const currentY = startY + (command.y - startY) * eased;
        const currentScale = targetScale !== undefined 
          ? startScale + (targetScale - startScale) * eased 
          : startScale;
        
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.itemId) || {};
          overrides.set(command.itemId, { 
            ...existing, 
            x: currentX, 
            y: currentY,
            scale: currentScale,
            pose: command.endPose,
            expression: command.endExpression,
            angle: command.endAngle,
          });
          return { ...prev, elementOverrides: overrides, subCommandProgress: progress };
        });
        
        if (progress < 1) {
          requestAnimationFrame(animateMove);
        } else {
          setState(prev => ({ ...prev, isWaiting: false, subCommandProgress: 0 }));
        }
      };
      
      setState(prev => ({ ...prev, isWaiting: true, hasExecutedCurrentCommand: true, subCommandProgress: 0 }));
      requestAnimationFrame(animateMove);
      return false;
    }
    
    // Instant move
    setState(prev => {
      const overrides = new Map(prev.elementOverrides);
      const existing = overrides.get(command.itemId) || {};
      overrides.set(command.itemId, { 
        ...existing, 
        x: command.x, 
        y: command.y,
        pose: command.endPose,
        expression: command.endExpression,
        angle: command.endAngle,
        ...(targetScale !== undefined && { scale: targetScale }),
      });
      return { ...prev, elementOverrides: overrides };
    });
    return true;
  }, []);

  // Helper: Execute regular move with pose change at end (fallback)
  const executeRegularMoveWithPose = useCallback((
    command: PoseMoveCommand,
    currentOverride: ElementOverride,
    startX: number,
    startY: number
  ): boolean => {
    return executeRegularMove(command, currentOverride);
  }, [executeRegularMove]);

  // Helper: Execute full POSE_MOVE animation with 3 phases
  interface PoseMoveAnimationParams {
    actor: { id: string; name: string; graphics: Array<{ pose: string; expression: string; angle: number; image: string }> };
    animation: ActorAnimation;
    command: PoseMoveCommand;
    startX: number;
    startY: number;
    duration: number;
  }

  const executePoseMoveAnimation = useCallback(({
    actor,
    animation,
    command,
    startX,
    startY,
    duration,
  }: PoseMoveAnimationParams) => {
    const frames = animation.frames;
    const transitionFrames = animation.transitionFrames || [];
    const totalFrames = frames.length;
    
    // Calculate timing
    // Phase 1: Locomotion takes most of the duration
    // Phase 2: Transition takes ~0.5s
    // Phase 3: Final pose (instant)
    const transitionDuration = transitionFrames.length > 0 ? 0.5 : 0;
    const locomotionDuration = duration - transitionDuration;
    const locomotionDurationMs = locomotionDuration * 1000;
    const transitionDurationMs = transitionDuration * 1000;
    
    // Calculate how many full cycles we'll do and frame timing
    const msPerFrame = frames[0]?.duration || 100; // Default 100ms per frame
    const totalLocomotionFrames = Math.ceil(locomotionDurationMs / msPerFrame);
    
    const startTime = performance.now();
    const startScale = command.scale ?? 1;
    const targetScale = command.scale ?? 1;
    
    // Phase 1: Locomotion animation with position interpolation
    const animateLocomotion = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / locomotionDurationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic for position
      
      // Calculate current position
      const currentX = startX + (command.x - startX) * eased;
      const currentY = startY + (command.y - startY) * eased;
      
      // Calculate which frame to show (cycle through frames)
      const frameIndex = Math.floor((elapsed / msPerFrame) % totalFrames);
      const currentFrame = frames[frameIndex];
      
      setState(prev => {
        const overrides = new Map(prev.elementOverrides);
        const existing = overrides.get(command.itemId) || {};
        overrides.set(command.itemId, { 
          ...existing, 
          x: currentX, 
          y: currentY,
          animationFrame: currentFrame?.image, // Override graphic with animation frame
        });
        // Progress is locomotion phase only (0 to locomotionDuration/totalDuration)
        const totalDuration = locomotionDuration + transitionDuration;
        return { ...prev, elementOverrides: overrides, subCommandProgress: progress * (locomotionDuration / totalDuration) };
      });
      
      if (progress < 1) {
        requestAnimationFrame(animateLocomotion);
      } else {
        // Phase 1 complete, start Phase 2 (transition) or jump to Phase 3
        if (transitionFrames.length > 0) {
          animateTransition();
        } else {
          finalizePose();
        }
      }
    };
    
    // Phase 2: Transition morph animation
    const transitionStartTime = { current: 0 };
    const animateTransition = () => {
      if (transitionStartTime.current === 0) {
        transitionStartTime.current = performance.now();
      }
      
      const elapsed = performance.now() - transitionStartTime.current;
      const progress = Math.min(elapsed / transitionDurationMs, 1);
      
      // Calculate which transition frame to show
      const frameIndex = Math.min(
        Math.floor(progress * transitionFrames.length),
        transitionFrames.length - 1
      );
      const currentFrame = transitionFrames[frameIndex];
      
      setState(prev => {
        const overrides = new Map(prev.elementOverrides);
        const existing = overrides.get(command.itemId) || {};
        overrides.set(command.itemId, { 
          ...existing, 
          x: command.x, // Already at final position
          y: command.y,
          animationFrame: currentFrame?.image,
        });
        // Progress is locomotion + transition phase
        const totalDuration = locomotionDuration + transitionDuration;
        const overallProgress = (locomotionDuration + progress * transitionDuration) / totalDuration;
        return { ...prev, elementOverrides: overrides, subCommandProgress: overallProgress };
      });
      
      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        finalizePose();
      }
    };
    
    // Phase 3: Set final pose and clear animation frame
    const finalizePose = () => {
      setState(prev => {
        const overrides = new Map(prev.elementOverrides);
        const existing = overrides.get(command.itemId) || {};
        overrides.set(command.itemId, { 
          ...existing, 
          x: command.x,
          y: command.y,
          pose: command.endPose,
          expression: command.endExpression,
          angle: command.endAngle,
          scale: targetScale,
          animationFrame: undefined, // Clear animation frame, revert to pose graphic
        });
        return { ...prev, elementOverrides: overrides, isWaiting: false, subCommandProgress: 0 };
      });
    };
    
    // Start animation
    setState(prev => ({ ...prev, isWaiting: true, hasExecutedCurrentCommand: true, subCommandProgress: 0 }));
    requestAnimationFrame(animateLocomotion);
  }, []);

  // Execute a single command
  // Returns: true = continue, false = wait, 'break' = break out of loop
  const executeCommand = useCallback((command: ScriptCommand): boolean | 'break' => {
    switch (command.type) {
      case 'DIALOGUE': {
        const actorId = findActorByName(command.actorName, game.actors);
        
        // Add to dialogue history
        dialogueHistoryIdRef.current++;
        setDialogueHistory(prev => {
          const newEntry: DialogueHistoryEntry = {
            id: `dlg-${dialogueHistoryIdRef.current}`,
            actorName: command.actorName,
            text: command.text,
            style: command.style,
            timestamp: Date.now(),
          };
          const updated = [...prev, newEntry];
          // Limit history size
          return updated.slice(-maxDialogueHistorySize);
        });
        
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
      
      // SAY command - display on-stage balloon
      case 'SAY': {
        const actorScriptId = command.actorName.toLowerCase().replace(/\s+/g, '_');
        
        // Get target position from element overrides (must be on stage via ENTER)
        const targetOverride = state.elementOverrides.get(actorScriptId);
        if (!targetOverride) {
          // Fire error callback instead of just logging
          onScriptError?.({
            type: 'MISSING_ACTOR',
            command,
            itemId: actorScriptId,
            itemName: formatItemName(actorScriptId),
            commandType: 'SAY',
          });
          return true; // Skip if target not on stage
        }
        
        // Calculate balloon position (simple fallback - AI will handle this in editor)
        // Position balloon above and to the side of the target
        const targetX = targetOverride.x ?? 50;
        const targetY = targetOverride.y ?? 50;
        const horizontalOffset = targetX < 50 ? 20 : -20;
        const balloonX = Math.max(10, Math.min(90, targetX + horizontalOffset));
        const balloonY = Math.max(8, Math.min(55, targetY - 20));
        
        const balloonId = `say-${Date.now()}`;
        
        // Add to dialogue history
        dialogueHistoryIdRef.current++;
        setDialogueHistory(prev => {
          const newEntry: DialogueHistoryEntry = {
            id: `say-${dialogueHistoryIdRef.current}`,
            actorName: command.actorName,
            text: command.text,
            style: command.style,
            timestamp: Date.now(),
          };
          const updated = [...prev, newEntry];
          return updated.slice(-maxDialogueHistorySize);
        });
        
        setState(prev => ({
          ...prev,
          activeBalloon: {
            id: balloonId,
            targetScriptId: actorScriptId,
            text: command.text,
            displayedText: '',
            style: command.style,
            x: balloonX,
            y: balloonY,
            isComplete: false,
          },
        }));
        
        // Start typewriter effect for balloon
        let charIndex = 0;
        typewriterRef.current = setInterval(() => {
          charIndex++;
          const displayedText = command.text.slice(0, charIndex);
          const isComplete = charIndex >= command.text.length;
          
          setState(prev => ({
            ...prev,
            activeBalloon: prev.activeBalloon ? {
              ...prev.activeBalloon,
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
      
      // MVP: ENTER with full positioning (z, pose, expression, angle)
      case 'ENTER': {
        setState(prev => {
          const hidden = new Set(prev.hiddenElements);
          hidden.delete(command.itemId);
          const overrides = new Map(prev.elementOverrides);
          overrides.set(command.itemId, { 
            x: command.x, 
            y: command.y,
            zIndex: command.z,
            pose: command.pose,
            expression: command.expression,
            angle: command.angle,
          });
          return { ...prev, hiddenElements: hidden, elementOverrides: overrides };
        });
        return true; // Continue immediately
      }
      
      // MVP: EXIT
      case 'EXIT': {
        setState(prev => {
          const hidden = new Set(prev.hiddenElements);
          hidden.add(command.itemId);
          return { ...prev, hiddenElements: hidden };
        });
        return true;
      }
      
      // MVP: ZORDER - adjust z-depth
      case 'ZORDER': {
        // Validate target exists on stage
        const zorderOverride = state.elementOverrides.get(command.itemId);
        if (!zorderOverride) {
          onScriptError?.({
            type: 'MISSING_ACTOR',
            command,
            itemId: command.itemId,
            itemName: formatItemName(command.itemId),
            commandType: 'ZORDER',
          });
          return true; // Skip
        }
        
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.itemId) || {};
          const currentZ = existing.zIndex ?? 1;
          
          // Calculate min/max z-index across all visible elements
          let minZ = Infinity;
          let maxZ = -Infinity;
          overrides.forEach((override) => {
            const z = override.zIndex ?? 1;
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
          });
          if (minZ === Infinity) minZ = 0;
          if (maxZ === -Infinity) maxZ = 1;
          
          let newZ: number;
          switch (command.direction) {
            case 'forward':
              newZ = currentZ + 1;
              break;
            case 'back':
              newZ = Math.max(0, currentZ - 1);
              break;
            case 'top':
            case 'last':
              newZ = maxZ + 1;
              break;
            case 'bottom':
            case 'first':
              newZ = Math.max(0, minZ - 1);
              break;
            default:
              newZ = currentZ;
          }
          
          overrides.set(command.itemId, { ...existing, zIndex: newZ });
          return { ...prev, elementOverrides: overrides };
        });
        return true;
      }
      
      // MVP: WAIT - with progress animation
      case 'WAIT': {
        const startTime = performance.now();
        const durationMs = command.duration * 1000;
        
        const animateWait = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          
          setState(prev => ({ ...prev, subCommandProgress: progress }));
          
          if (progress < 1) {
            waitTimeoutRef.current = requestAnimationFrame(animateWait) as unknown as NodeJS.Timeout;
          } else {
            setState(prev => ({ ...prev, isWaiting: false, subCommandProgress: 0 }));
          }
        };
        
        setState(prev => ({ ...prev, isWaiting: true, hasExecutedCurrentCommand: true, subCommandProgress: 0 }));
        waitTimeoutRef.current = requestAnimationFrame(animateWait) as unknown as NodeJS.Timeout;
        return false;
      }
      
      // MVP: SCENE
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
          activeButtons: new Set(),
          isWaiting: false,
          hasExecutedCurrentCommand: false,
        }));
        return true;
      }
      
      // MVP: CHOICE
      case 'CHOICE': {
        setState(prev => ({
          ...prev,
          choices: { options: command.options },
        }));
        return false; // Wait for user selection
      }
      
      // MVP: BUTTON
      case 'BUTTON': {
        setState(prev => {
          const buttons = new Set(prev.activeButtons);
          buttons.add(command.buttonId);
          return { ...prev, activeButtons: buttons };
        });
        return true;
      }
      
      // MVP: HIDE_BUTTON
      case 'HIDE_BUTTON': {
        setState(prev => {
          const buttons = new Set(prev.activeButtons);
          buttons.delete(command.buttonId);
          return { ...prev, activeButtons: buttons };
        });
        return true;
      }
      
      // MOVE command with position, scale, rotation - animated over duration
      case 'MOVE': {
        // Validate target exists on stage
        const moveOverride = state.elementOverrides.get(command.itemId);
        if (!moveOverride) {
          onScriptError?.({
            type: 'MISSING_ACTOR',
            command,
            itemId: command.itemId,
            itemName: formatItemName(command.itemId),
            commandType: 'MOVE',
          });
          return true; // Skip
        }
        
        const duration = command.duration ?? 2; // Default 2 seconds
        const targetX = command.x;
        const targetY = command.y;
        const targetScale = command.scale;
        const targetRotation = command.rotation;
        
        // Get current position from overrides
        const currentOverride = state.elementOverrides.get(command.itemId) || {};
        const startX = currentOverride.x ?? 50;
        const startY = currentOverride.y ?? 50;
        const startScale = currentOverride.scale ?? 1;
        const startRotation = currentOverride.rotation ?? 0;
        
        if (duration > 0) {
          // Animated movement - use requestAnimationFrame for smooth animation
          const startTime = performance.now();
          const durationMs = duration * 1000;
          
          const animateMove = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            
            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (targetX - startX) * eased;
            const currentY = startY + (targetY - startY) * eased;
            const currentScale = targetScale !== undefined 
              ? startScale + (targetScale - startScale) * eased 
              : startScale;
            const currentRotation = targetRotation !== undefined 
              ? startRotation + (targetRotation - startRotation) * eased 
              : startRotation;
            
            setState(prev => {
              const overrides = new Map(prev.elementOverrides);
              const existing = overrides.get(command.itemId) || {};
              overrides.set(command.itemId, { 
                ...existing, 
                x: currentX, 
                y: currentY,
                scale: currentScale,
                rotation: currentRotation,
              });
              return { ...prev, elementOverrides: overrides, subCommandProgress: progress };
            });
            
            if (progress < 1) {
              requestAnimationFrame(animateMove);
            } else {
              // Animation complete - stop waiting and reset progress
              setState(prev => ({ ...prev, isWaiting: false, subCommandProgress: 0 }));
            }
          };
          
          setState(prev => ({ ...prev, isWaiting: true, hasExecutedCurrentCommand: true, subCommandProgress: 0 }));
          requestAnimationFrame(animateMove);
          return false;
        }
        
        // Instant move (duration 0)
        setState(prev => {
          const overrides = new Map(prev.elementOverrides);
          const existing = overrides.get(command.itemId) || {};
          overrides.set(command.itemId, { 
            ...existing, 
            x: targetX, 
            y: targetY,
            ...(targetScale !== undefined && { scale: targetScale }),
            ...(targetRotation !== undefined && { rotation: targetRotation }),
          });
          return { ...prev, elementOverrides: overrides };
        });
        return true;
      }
      
      // Non-MVP: POSE
      case 'POSE': {
        // Validate target exists on stage
        const poseOverride = state.elementOverrides.get(command.actorId);
        if (!poseOverride) {
          onScriptError?.({
            type: 'MISSING_ACTOR',
            command,
            itemId: command.actorId,
            itemName: formatItemName(command.actorId),
            commandType: 'POSE',
          });
          return true; // Skip
        }
        
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
      
      // POSE_MOVE: AI-animated movement with locomotion cycle, transition morph, and final pose
      case 'POSE_MOVE': {
        // Validate target exists on stage
        const poseMoveOverride = state.elementOverrides.get(command.itemId);
        if (!poseMoveOverride) {
          onScriptError?.({
            type: 'MISSING_ACTOR',
            command,
            itemId: command.itemId,
            itemName: formatItemName(command.itemId),
            commandType: 'POSE_MOVE',
          });
          return true; // Skip
        }
        
        // Find the actor and their animations
        const actor = game.actors.find(a => 
          a.name.toLowerCase().replace(/\s+/g, '_') === command.itemId
        );
        
        if (!actor) {
          console.warn(`POSE_MOVE: Actor not found for itemId ${command.itemId}`);
          // Fallback to regular MOVE behavior
          return executeRegularMove(command, poseMoveOverride);
        }
        
        // Calculate movement direction based on start/end X positions
        const startX = poseMoveOverride.x ?? 50;
        const startY = poseMoveOverride.y ?? 50;
        const direction: AnimationDirection = command.x > startX ? 'right' : 'left';
        
        // Find matching animation (gait + direction)
        const animation = actor.animations?.find(a => 
          a.gait === command.gait && a.direction === direction
        );
        
        if (!animation || animation.frames.length === 0) {
          console.warn(`POSE_MOVE: No animation found for ${command.gait} ${direction}`);
          // Fallback to regular MOVE with pose change at end
          return executeRegularMoveWithPose(command, poseMoveOverride, startX, startY);
        }
        
        // Calculate duration (default based on gait, or use override)
        const baseDuration = command.duration ?? (command.gait === 'run' ? 1.5 : 2.5);
        const distance = Math.sqrt(
          Math.pow(command.x - startX, 2) + Math.pow(command.y - startY, 2)
        );
        // Adjust duration based on distance (normalize to ~50% stage distance)
        const duration = baseDuration * Math.max(0.5, distance / 50);
        
        // Execute the 3-phase animation
        executePoseMoveAnimation({
          actor,
          animation,
          command,
          startX,
          startY,
          duration,
        });
        
        return false; // Wait for animation to complete
      }
      
      // Non-MVP: Audio commands
      case 'BGM':
        onAudioCommand?.('bgm', command.trackName, { loop: command.loop, volume: command.volume });
        return true;
      
      case 'AMBIENCE':
        onAudioCommand?.('ambience', command.trackName, { loop: command.loop, volume: command.volume });
        return true;
      
      case 'SFX':
        onAudioCommand?.('sfx', command.effectName, { volume: command.volume });
        return true;
      
      // Non-MVP: Effects
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
      
      // Non-MVP: Variables
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
          for (const nestedCmd of command.commands) {
            const result = executeCommand(nestedCmd);
            if (result === 'break') return 'break'; // Propagate break up
          }
        }
        return true;
      }
      
      case 'LOOP': {
        // Execute the loop's commands N times
        outerLoop:
        for (let iteration = 0; iteration < command.count; iteration++) {
          for (const nestedCmd of command.commands) {
            const result = executeCommand(nestedCmd);
            if (result === 'break') break outerLoop; // Exit the loop
          }
        }
        return true;
      }
      
      case 'BREAKLOOP': {
        // Signal to break out of the innermost loop
        return 'break';
      }
      
      case 'COMMENT':
      case 'UNKNOWN':
        return true; // Skip
    }
  }, [game, state.worldState, state.elementOverrides, onSceneChange, onAudioCommand, onScriptError, textSpeed, clearTimeouts]);

  // Advance to next command
  const advance = useCallback(() => {
    // Safety check - no commands to execute
    if (commands.length === 0) {
      setState(prev => ({ ...prev, isComplete: true }));
      return;
    }
    
    // Already complete - do nothing
    if (state.isComplete) return;
    
    if (state.isWaiting) return;
    
    // If dialogue is active but not complete, complete it first
    if (state.activeDialogue && !state.activeDialogue.isComplete) {
      completeDialogue();
      return;
    }
    
    // If balloon is active but not complete, complete it first
    if (state.activeBalloon && !state.activeBalloon.isComplete) {
      completeDialogue();
      return;
    }
    
    // Clear current dialogue/balloon and move to next command
    const wasDialogue = state.activeDialogue !== null;
    const wasBalloon = state.activeBalloon !== null;
    if (wasDialogue || wasBalloon) {
      setState(prev => ({ ...prev, activeDialogue: null, activeBalloon: null }));
    }
    
    // Calculate starting index for this advance call
    // If we just cleared dialogue/balloon OR the current command was already executed (e.g., WAIT finished),
    // move past that command. Otherwise start from current position.
    const shouldAdvancePastCurrent = wasDialogue || wasBalloon || state.hasExecutedCurrentCommand;
    let nextIndex = shouldAdvancePastCurrent 
      ? state.currentCommandIndex + 1 
      : state.currentCommandIndex;
    
    // Execute commands until we hit one that requires waiting
    while (nextIndex < commands.length) {
      const command = commands[nextIndex];
      if (!command) {
        nextIndex++;
        continue;
      }
      
      console.log(`[DramScript] Executing cmd ${nextIndex}: ${command.type}`, command);
      
      // Save snapshot BEFORE executing the command (for step-back functionality)
      const snapshot = createSnapshot(command.type);
      setHistory(prev => {
        const newHistory = [...prev, snapshot];
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize);
        }
        return newHistory;
      });
      
      const shouldContinue = executeCommand(command);
      
      // Update currentCommandIndex AND reset the executed flag together
      // This prevents race conditions where the reset would override the flag set by executeCommand
      setState(prev => ({ 
        ...prev, 
        currentCommandIndex: nextIndex,
        // Only reset if we're moving to a new index and this command doesn't set it
        // executeCommand sets hasExecutedCurrentCommand=true for blocking commands
        // so we don't reset it here - let executeCommand control it
      }));
      
      if (!shouldContinue) {
        // This command requires waiting (dialogue, choice, wait, etc.)
        console.log(`[DramScript] Pausing at cmd ${nextIndex}`);
        return;
      }
      
      // For non-blocking commands, reset the flag so we don't skip ahead next time
      setState(prev => ({ ...prev, hasExecutedCurrentCommand: false }));
      
      nextIndex++;
    }
    
    // Reached end of script
    console.log('[DramScript] Script complete');
    setState(prev => ({ ...prev, currentCommandIndex: nextIndex, isComplete: true, hasExecutedCurrentCommand: false }));
  }, [state.isWaiting, state.isComplete, state.activeDialogue, state.currentCommandIndex, state.hasExecutedCurrentCommand, commands, executeCommand, completeDialogue, createSnapshot, maxHistorySize]);

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
      activeButtons: new Set(),
      isWaiting: false,
      isComplete: false,
    }));
  }, [state.choices, onSceneChange, clearTimeouts]);

  // Auto-advance when in auto-play mode after dialogue completes
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

  // Continue execution after WAIT completes in auto-play mode
  useEffect(() => {
    if (!state.isAutoPlay) return;
    if (state.isWaiting) return; // Still waiting
    if (state.isComplete) return; // Script finished
    if (state.choices) return; // Waiting for choice
    if (state.activeDialogue) return; // Dialogue in progress
    
    // No active dialogue or wait - continue to next command
    const timer = setTimeout(() => {
      advance();
    }, 50); // Small delay to prevent race conditions
    
    return () => clearTimeout(timer);
  }, [state.isAutoPlay, state.isWaiting, state.isComplete, state.choices, state.activeDialogue, state.currentCommandIndex, advance]);

  // Note: Auto-start removed - user must click Play or Step to begin script execution

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
      activeButtons: new Set(),
      isWaiting: false,
      isComplete: false,
      hasExecutedCurrentCommand: false,
    }));
  }, [onSceneChange, clearTimeouts]);

  // Step back to previous state, skipping WAIT commands
  const stepBack = useCallback(() => {
    if (history.length === 0) {
      console.log('[DramScript] No history to step back to');
      return;
    }
    
    // Clear any active timeouts/waiting
    clearTimeouts();
    
    // Find the most recent non-WAIT snapshot
    let targetIndex = history.length - 1;
    while (targetIndex >= 0 && history[targetIndex].commandType === 'WAIT') {
      targetIndex--;
    }
    
    if (targetIndex < 0) {
      // All history items are WAIT commands, go to start
      console.log('[DramScript] Stepping back to start (all history was WAIT)');
      goToScene(state.currentSceneId);
      setHistory([]);
      return;
    }
    
    const snapshot = history[targetIndex];
    console.log(`[DramScript] Stepping back to cmd ${snapshot.currentCommandIndex} (${snapshot.commandType})`);
    
    // Restore the state
    restoreFromSnapshot(snapshot);
    
    // Remove this snapshot and all after it from history
    setHistory(prev => prev.slice(0, targetIndex));
  }, [history, clearTimeouts, restoreFromSnapshot, state.currentSceneId, goToScene]);

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setState(prev => ({ ...prev, isAutoPlay: !prev.isAutoPlay }));
  }, []);

  // Collect an item - add to collection, apply effects, hide from stage
  const collectItem = useCallback((itemId: string): boolean => {
    const item = game.items.find(i => i.id === itemId);
    if (!item || !item.isCollectible) return false;
    
    // Check if already collected
    if (state.collectedItems.has(itemId)) return false;
    
    // For earned items, check unlock condition
    if (item.acquisition === 'earned' && item.unlockCondition) {
      const { variable, operator, threshold } = item.unlockCondition;
      const currentValue = state.worldState[variable];
      
      let conditionMet = false;
      switch (operator) {
        case '==': conditionMet = currentValue === threshold; break;
        case '!=': conditionMet = currentValue !== threshold; break;
        case '>': conditionMet = Number(currentValue) > Number(threshold); break;
        case '<': conditionMet = Number(currentValue) < Number(threshold); break;
        case '>=': conditionMet = Number(currentValue) >= Number(threshold); break;
        case '<=': conditionMet = Number(currentValue) <= Number(threshold); break;
      }
      
      if (!conditionMet) return false;
    }
    
    setState(prev => {
      // Add to collection
      const collected = new Set(prev.collectedItems);
      collected.add(itemId);
      
      // Apply item effects to world state
      const newWorldState = { ...prev.worldState };
      for (const effect of item.effects) {
        const currentValue = newWorldState[effect.variable];
        if (typeof effect.value === 'number' && typeof currentValue === 'number') {
          newWorldState[effect.variable] = currentValue + effect.value;
        } else if (typeof effect.value === 'number' && currentValue === undefined) {
          newWorldState[effect.variable] = effect.value;
        } else {
          newWorldState[effect.variable] = effect.value;
        }
      }
      
      // Hide the item from stage using script ID
      const scriptId = item.name.toLowerCase().replace(/\s+/g, '_');
      const hidden = new Set(prev.hiddenElements);
      hidden.add(scriptId);
      
      return { 
        ...prev, 
        collectedItems: collected, 
        worldState: newWorldState,
        hiddenElements: hidden,
      };
    });
    
    return true;
  }, [game.items, state.collectedItems, state.worldState]);

  // Execute all commands up to (and including) a specific index instantly
  // Used for "play to here" feature in the editor
  const executeToIndex = useCallback((targetIndex: number) => {
    if (!commands || commands.length === 0) return;
    
    clearTimeouts();
    
    // Reset state first
    const freshState: ScriptRunnerState = {
      currentSceneId: state.currentSceneId,
      currentCommandIndex: 0,
      activeDialogue: null,
      activeBalloon: null,
      choices: null,
      worldState: { ...game.info.worldState },
      hiddenElements: new Set(),
      elementOverrides: new Map(),
      activeEffects: new Map(),
      activeButtons: new Set(),
      collectedItems: new Set(game.info.collectedItems || []),
      isWaiting: false,
      isComplete: false,
      isAutoPlay: false,
      hasExecutedCurrentCommand: false,
      subCommandProgress: 0,
    };
    
    // Execute commands synchronously up to targetIndex
    let currentState = freshState;
    for (let i = 0; i <= Math.min(targetIndex, commands.length - 1); i++) {
      const cmd = commands[i];
      
      // Apply command effects to state (simplified instant execution)
      switch (cmd.type) {
        case 'ENTER': {
          const hidden = new Set(currentState.hiddenElements);
          hidden.delete(cmd.itemId);
          const overrides = new Map(currentState.elementOverrides);
          overrides.set(cmd.itemId, {
            x: cmd.x,
            y: cmd.y,
            zIndex: cmd.z,
            pose: cmd.pose,
            expression: cmd.expression,
            angle: cmd.angle,
          });
          currentState = { ...currentState, hiddenElements: hidden, elementOverrides: overrides };
          break;
        }
        case 'EXIT': {
          const hidden = new Set(currentState.hiddenElements);
          hidden.add(cmd.itemId);
          currentState = { ...currentState, hiddenElements: hidden };
          break;
        }
        case 'MOVE': {
          const overrides = new Map(currentState.elementOverrides);
          const existing = overrides.get(cmd.itemId) || {};
          overrides.set(cmd.itemId, {
            ...existing,
            x: cmd.x,
            y: cmd.y,
            ...(cmd.scale !== undefined && { scale: cmd.scale }),
            ...(cmd.rotation !== undefined && { rotation: cmd.rotation }),
          });
          currentState = { ...currentState, elementOverrides: overrides };
          break;
        }
        case 'POSE': {
          const overrides = new Map(currentState.elementOverrides);
          const existing = overrides.get(cmd.actorId) || {};
          overrides.set(cmd.actorId, {
            ...existing,
            pose: cmd.pose,
            expression: cmd.expression,
          });
          currentState = { ...currentState, elementOverrides: overrides };
          break;
        }
        case 'ZORDER': {
          const overrides = new Map(currentState.elementOverrides);
          const existing = overrides.get(cmd.itemId) || {};
          const currentZ = existing.zIndex ?? 1;
          overrides.set(cmd.itemId, {
            ...existing,
            zIndex: cmd.direction === 'forward' ? currentZ + 1 : Math.max(1, currentZ - 1),
          });
          currentState = { ...currentState, elementOverrides: overrides };
          break;
        }
        case 'BUTTON': {
          const buttons = new Set(currentState.activeButtons);
          buttons.add(cmd.buttonId);
          currentState = { ...currentState, activeButtons: buttons };
          break;
        }
        case 'HIDE_BUTTON': {
          const buttons = new Set(currentState.activeButtons);
          buttons.delete(cmd.buttonId);
          currentState = { ...currentState, activeButtons: buttons };
          break;
        }
        case 'SET': {
          const worldState = { ...currentState.worldState, [cmd.variable]: cmd.value };
          currentState = { ...currentState, worldState };
          break;
        }
        case 'EFFECT': {
          const effects = new Map(currentState.activeEffects);
          const current = effects.get(cmd.targetId) || [];
          if (!current.includes(cmd.sfxId)) {
            effects.set(cmd.targetId, [...current, cmd.sfxId]);
          }
          currentState = { ...currentState, activeEffects: effects };
          break;
        }
        case 'CLEAR_EFFECT': {
          const effects = new Map(currentState.activeEffects);
          const current = effects.get(cmd.targetId) || [];
          effects.set(cmd.targetId, current.filter(id => id !== cmd.sfxId));
          currentState = { ...currentState, activeEffects: effects };
          break;
        }
        // Skip WAIT, DIALOGUE, SAY, CHOICE, SCENE, COMMENT, etc. for instant execution
        default:
          break;
      }
    }
    
    // Set final state with command index positioned after the target
    currentState.currentCommandIndex = Math.min(targetIndex + 1, commands.length);
    currentState.isComplete = currentState.currentCommandIndex >= commands.length;
    
    setState(currentState);
  }, [commands, state.currentSceneId, game.info.worldState, game.info.collectedItems, clearTimeouts]);

  // Clear dialogue history (for scene resets)
  const clearDialogueHistory = useCallback(() => {
    setDialogueHistory([]);
    dialogueHistoryIdRef.current = 0;
  }, []);

  return {
    state,
    currentScene,
    advance,
    stepBack,
    selectChoice,
    completeDialogue,
    goToScene,
    toggleAutoPlay,
    collectItem,
    executeToIndex,
    canStepBack: history.length > 0,
    historyLength: history.length,
    dialogueHistory,
    clearDialogueHistory,
  };
}
