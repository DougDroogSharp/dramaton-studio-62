import { ScriptCommand } from './scriptParser';

export interface SceneDurationEstimate {
  totalSeconds: number;        // Total estimated duration (-1 if contains CHOICE)
  commandTimestamps: number[]; // Cumulative time at each command index
  hasChoices: boolean;
}

const DEFAULT_TEXT_SPEED = 50; // Characters per second
const DIALOGUE_PAUSE = 1.5;    // Pause after dialogue completes
const DEFAULT_MOVE_DURATION = 0.5;

/**
 * Estimate the duration of a single command in seconds
 */
export function estimateCommandDuration(command: ScriptCommand, textSpeed: number = DEFAULT_TEXT_SPEED): number {
  switch (command.type) {
    case 'WAIT':
      return command.duration;
    
    case 'MOVE':
      return command.duration ?? DEFAULT_MOVE_DURATION;
    
    case 'POSE_MOVE':
      // POSE_MOVE has longer default duration due to animation frames
      // Base: 2s for walk cycle, +0.5s for pose transition morph
      return command.duration ?? 2.5;
    
    case 'DIALOGUE':
    case 'SAY':
      // Typewriter effect duration + pause
      const textLength = command.text?.length || 0;
      return (textLength / textSpeed) + DIALOGUE_PAUSE;
    
    // Instant commands - no duration
    case 'ENTER':
    case 'EXIT':
    case 'SCENE':
    case 'POSE':
    case 'SET':
    case 'IF':
    case 'LOOP':
    case 'BREAKLOOP':
    case 'COMMENT':
    case 'BUTTON':
    case 'HIDE_BUTTON':
    case 'ZORDER':
    case 'BGM':
    case 'AMBIENCE':
    case 'SFX':
    case 'EFFECT':
    case 'CLEAR_EFFECT':
    case 'UNKNOWN':
      return 0;
    
    case 'CHOICE':
      // Choice pauses indefinitely - handled separately
      return 0;
    
    default:
      return 0;
  }
}

/**
 * Estimate total scene duration and create timeline timestamps for each command
 */
export function estimateSceneDuration(
  commands: ScriptCommand[], 
  textSpeed: number = DEFAULT_TEXT_SPEED
): SceneDurationEstimate {
  const commandTimestamps: number[] = [];
  let cumulativeTime = 0;
  let hasChoices = false;
  
  for (const command of commands) {
    commandTimestamps.push(cumulativeTime);
    
    if (command.type === 'CHOICE') {
      hasChoices = true;
      // Stop accumulating time at choice point
      break;
    }
    
    cumulativeTime += estimateCommandDuration(command, textSpeed);
  }
  
  // Fill remaining timestamps if we stopped at a choice
  while (commandTimestamps.length < commands.length) {
    commandTimestamps.push(cumulativeTime);
  }
  
  return {
    totalSeconds: hasChoices ? cumulativeTime : cumulativeTime, // Still return total up to choice
    commandTimestamps,
    hasChoices,
  };
}

/**
 * Format seconds as MM:SS
 */
export function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
