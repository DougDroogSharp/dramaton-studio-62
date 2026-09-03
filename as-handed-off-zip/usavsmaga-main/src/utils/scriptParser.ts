// DRAM Script Parser for Dramaton Theater - MVP Implementation
// Parses text-based scripts into executable commands

// ============ MVP COMMAND TYPES ============
// The 9 MVP commands: DIALOGUE, ENTER, EXIT, ZORDER, WAIT, SCENE, BUTTON, HIDE_BUTTON, CHOICE
// Plus: COMMENT, UNKNOWN for parsing support

export type ScriptCommandType = 
  | 'DIALOGUE'
  | 'SAY'
  | 'ENTER'
  | 'EXIT'
  | 'ZORDER'
  | 'WAIT'
  | 'SCENE'
  | 'CHOICE'
  | 'BUTTON'
  | 'HIDE_BUTTON'
  | 'COMMENT'
  | 'UNKNOWN'
  // Non-MVP commands (kept for future implementation)
  | 'MOVE'
  | 'POSE_MOVE'  // AI-animated movement with ending pose
  | 'POSE'
  | 'BGM'
  | 'AMBIENCE'
  | 'SFX'
  | 'EFFECT'
  | 'CLEAR_EFFECT'
  | 'SET'
  | 'IF'
  | 'ENDIF'
  | 'LOOP'
  | 'ENDLOOP'
  | 'BREAKLOOP';

// Animation gait type for POSE_MOVE
export type AnimationGait = 'walk' | 'run' | string;

// ============ COMMAND INTERFACES ============

export interface DialogueCommand {
  type: 'DIALOGUE';
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
}

// SAY command - displays dialogue as on-stage speech/thought balloon
export interface SayCommand {
  type: 'SAY';
  actorName: string;  // Actor or item name to attach balloon to
  text: string;       // Dialogue text
  style: 'speech' | 'thought';  // speech or thought bubble
}

// MVP ENTER command with full positioning
export interface EnterCommand {
  type: 'ENTER';
  itemId: string;      // Actor or Item ID
  x: number;           // 0-100 percentage
  y: number;           // 0-100 percentage
  z: number;           // Z-order (higher = in front)
  pose: string;        // Pose name
  expression: string;  // Expression name
  angle: number;       // 0, 45, 90, 135, 180, 225, 270, 315
}

export interface ExitCommand {
  type: 'EXIT';
  itemId: string;
}

// NEW: ZORDER command for z-depth manipulation
export interface ZOrderCommand {
  type: 'ZORDER';
  itemId: string;
  direction: 'forward' | 'back' | 'first' | 'last' | 'bottom' | 'top';
}

export interface WaitCommand {
  type: 'WAIT';
  duration: number;
}

export interface SceneCommand {
  type: 'SCENE';
  sceneId: string;
}

export interface ChoiceOption {
  text: string;
  target: string;
}

export interface ChoiceCommand {
  type: 'CHOICE';
  options: ChoiceOption[];
}

export interface ButtonCommand {
  type: 'BUTTON';
  buttonId: string;
}

export interface HideButtonCommand {
  type: 'HIDE_BUTTON';
  buttonId: string;
}

export interface CommentCommand {
  type: 'COMMENT';
  text: string;
}

export interface UnknownCommand {
  type: 'UNKNOWN';
  raw: string;
}

// MOVE command with full transformation (position, scale, rotation)
export interface MoveCommand {
  type: 'MOVE';
  itemId: string;       // Actor or Item script ID
  x: number;            // X position (0-100%)
  y: number;            // Y position (0-100%)
  scale?: number;       // Scale factor (0.1-3.0)
  rotation?: number;    // Rotation in degrees (-180 to 180)
  duration?: number;    // Optional animation duration
}

// POSE_MOVE command - AI-animated movement with ending pose
export interface PoseMoveCommand {
  type: 'POSE_MOVE';
  itemId: string;          // Actor ID
  x: number;               // Target X (0-100%)
  y: number;               // Target Y (0-100%)
  gait: AnimationGait;     // 'walk', 'run', or custom
  endPose: string;         // Target pose at destination
  endExpression?: string;  // Optional ending expression
  endAngle?: number;       // Optional ending angle (0, 45, 90, etc.)
  duration?: number;       // Override calculated duration
  scale?: number;          // Optional scale change
}

export interface PoseCommand {
  type: 'POSE';
  actorId: string;
  pose?: string;
  expression?: string;
}

export interface BgmCommand {
  type: 'BGM';
  trackName: string;
  loop: boolean;
  volume: number;
}

export interface AmbienceCommand {
  type: 'AMBIENCE';
  trackName: string;
  loop: boolean;
  volume: number;
}

export interface SfxCommand {
  type: 'SFX';
  effectName: string;
  volume?: number;
}

export interface EffectCommand {
  type: 'EFFECT';
  sfxId: string;
  targetId: string;
}

export interface ClearEffectCommand {
  type: 'CLEAR_EFFECT';
  sfxId: string;
  targetId: string;
}

export interface SetCommand {
  type: 'SET';
  variable: string;
  value: string | number | boolean;
}

export interface IfCommand {
  type: 'IF';
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
  commands: ScriptCommand[];
}

export interface LoopCommand {
  type: 'LOOP';
  count: number;  // Number of iterations (evaluated at parse time, supports RND())
  commands: ScriptCommand[];
}

export interface BreakLoopCommand {
  type: 'BREAKLOOP';
}

export type ScriptCommand = 
  | DialogueCommand
  | SayCommand
  | EnterCommand
  | ExitCommand
  | ZOrderCommand
  | WaitCommand
  | SceneCommand
  | ChoiceCommand
  | ButtonCommand
  | HideButtonCommand
  | CommentCommand
  | UnknownCommand
  | MoveCommand
  | PoseMoveCommand
  | PoseCommand
  | BgmCommand
  | AmbienceCommand
  | SfxCommand
  | EffectCommand
  | ClearEffectCommand
  | SetCommand
  | IfCommand
  | LoopCommand
  | BreakLoopCommand;

// ============ PARSING HELPERS ============

/**
 * Evaluate RND(high, [low]) expressions to random integers.
 * - RND(10) returns random integer 0-10 (inclusive)
 * - RND(10, 5) returns random integer 5-10 (inclusive)
 */
export function evaluateRnd(str: string): string {
  return str.replace(/RND\s*\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/gi, (_, highStr, lowStr) => {
    const high = parseInt(highStr, 10);
    const low = lowStr !== undefined ? parseInt(lowStr, 10) : 0;
    const min = Math.min(low, high);
    const max = Math.max(low, high);
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  });
}

/**
 * Parse a numeric value, evaluating RND() expressions first.
 */
export function parseNumericValue(str: string): number {
  const evaluated = evaluateRnd(str);
  return parseFloat(evaluated) || 0;
}

// Parse volume string like "vol=70%" to number 0-1
function parseVolume(str: string): number {
  const match = str.match(/vol=(\d+)%?/);
  if (match) {
    return parseInt(match[1]) / 100;
  }
  return 1;
}

// Parse duration string like "2s" or "500ms" to seconds
function parseDuration(str: string): number {
  // First evaluate any RND() expressions
  const evaluated = evaluateRnd(str);
  
  const msMatch = evaluated.match(/(\d+)ms/);
  if (msMatch) return parseInt(msMatch[1]) / 1000;
  
  const sMatch = evaluated.match(/(\d+(?:\.\d+)?)s?/);
  if (sMatch) return parseFloat(sMatch[1]);
  
  return 1;
}

// ============ MAIN PARSER ============

// Parse a single line of script
function parseLine(line: string): ScriptCommand | null {
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) return null;
  
  // Comments
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return { type: 'COMMENT', text: trimmed.slice(trimmed.startsWith('//') ? 2 : 1).trim() };
  }
  
  // Bracketed commands [COMMAND: ...]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const content = trimmed.slice(1, -1);
    
    // MVP: ENTER item_id at x,y z pose expression angle (full format)
    // Supports RND(high, [low]) expressions for numeric values
    const enterFullMatch = content.match(
      /^ENTER\s+(\w+)\s+at\s+([\d.]+|RND\s*\([^)]+\))\s*,\s*([\d.]+|RND\s*\([^)]+\))\s+([\d]+|RND\s*\([^)]+\))\s+(\w+)\s+(\w+)\s+([\d]+|RND\s*\([^)]+\))$/i
    );
    if (enterFullMatch) {
      return {
        type: 'ENTER',
        itemId: enterFullMatch[1],
        x: parseNumericValue(enterFullMatch[2]),
        y: parseNumericValue(enterFullMatch[3]),
        z: Math.round(parseNumericValue(enterFullMatch[4])),
        pose: enterFullMatch[5],
        expression: enterFullMatch[6],
        angle: Math.round(parseNumericValue(enterFullMatch[7])),
      };
    }
    
    // MVP: ENTER item_id at x,y (simple format - defaults for z, pose, expression, angle)
    // Supports RND(high, [low]) expressions for numeric values
    const enterSimpleMatch = content.match(
      /^ENTER\s+(\w+)\s+at\s+([\d.]+|RND\s*\([^)]+\))\s*,\s*([\d.]+|RND\s*\([^)]+\))$/i
    );
    if (enterSimpleMatch) {
      return {
        type: 'ENTER',
        itemId: enterSimpleMatch[1],
        x: parseNumericValue(enterSimpleMatch[2]),
        y: parseNumericValue(enterSimpleMatch[3]),
        z: 1,  // Default z-index
        pose: 'Neutral',  // Default pose
        expression: 'Neutral',  // Default expression
        angle: 0,  // Default angle (front)
      };
    }
    
    // MVP: ZORDER item_id forward|back|first|last|bottom|top
    const zorderMatch = content.match(/^ZORDER\s+(\w+)\s+(forward|back|first|last|bottom|top)$/i);
    if (zorderMatch) {
      return {
        type: 'ZORDER',
        itemId: zorderMatch[1],
        direction: zorderMatch[2].toLowerCase() as 'forward' | 'back' | 'first' | 'last' | 'bottom' | 'top',
      };
    }
    
    // MVP: EXIT item_id
    const exitMatch = content.match(/^EXIT\s+(\w+)$/i);
    if (exitMatch) {
      return {
        type: 'EXIT',
        itemId: exitMatch[1],
      };
    }
    
    // MVP: WAIT 2s
    const waitMatch = content.match(/^WAIT\s+(.+)$/i);
    if (waitMatch) {
      return {
        type: 'WAIT',
        duration: parseDuration(waitMatch[1]),
      };
    }
    
    // MVP: SCENE scene_id
    const sceneMatch = content.match(/^SCENE\s+(\w+)$/i);
    if (sceneMatch) {
      return {
        type: 'SCENE',
        sceneId: sceneMatch[1],
      };
    }
    
    // MVP: BUTTON button_id
    const buttonMatch = content.match(/^BUTTON\s+(\w+)$/i);
    if (buttonMatch) {
      return {
        type: 'BUTTON',
        buttonId: buttonMatch[1],
      };
    }
    
    // MVP: HIDE_BUTTON button_id
    const hideButtonMatch = content.match(/^HIDE_BUTTON\s+(\w+)$/i);
    if (hideButtonMatch) {
      return {
        type: 'HIDE_BUTTON',
        buttonId: hideButtonMatch[1],
      };
    }
    
    // Non-MVP: BGM: "track_name" loop vol=70%
    const bgmMatch = content.match(/^BGM:\s*"([^"]+)"(.*)$/i);
    if (bgmMatch) {
      const rest = bgmMatch[2];
      return {
        type: 'BGM',
        trackName: bgmMatch[1],
        loop: /loop/i.test(rest),
        volume: parseVolume(rest),
      };
    }
    
    // Non-MVP: AMBIENCE: "track_name" loop vol=50%
    const ambienceMatch = content.match(/^AMBIENCE:\s*"([^"]+)"(.*)$/i);
    if (ambienceMatch) {
      const rest = ambienceMatch[2];
      return {
        type: 'AMBIENCE',
        trackName: ambienceMatch[1],
        loop: /loop/i.test(rest),
        volume: parseVolume(rest),
      };
    }
    
    // Non-MVP: SFX: "effect_name" vol=100%
    const sfxMatch = content.match(/^SFX:\s*"([^"]+)"(.*)$/i);
    if (sfxMatch) {
      return {
        type: 'SFX',
        effectName: sfxMatch[1],
        volume: parseVolume(sfxMatch[2] || ''),
      };
    }
    
    // MOVE item_id to x,y [scale s] [tilt r] [over duration]
    // Supports RND(high, [low]) expressions for numeric values
    const moveMatch = content.match(
      /^MOVE\s+(\w+)\s+to\s+([\d.]+|RND\s*\([^)]+\))\s*,\s*([\d.]+|RND\s*\([^)]+\))(?:\s+scale\s+([\d.]+|RND\s*\([^)]+\)))?(?:\s+tilt\s+(-?[\d.]+|RND\s*\([^)]+\)))?(?:\s+over\s+(.+))?$/i
    );
    if (moveMatch) {
      return {
        type: 'MOVE',
        itemId: moveMatch[1],
        x: parseNumericValue(moveMatch[2]),
        y: parseNumericValue(moveMatch[3]),
        scale: moveMatch[4] ? parseNumericValue(moveMatch[4]) : undefined,
        rotation: moveMatch[5] ? parseNumericValue(moveMatch[5]) : undefined,
        duration: moveMatch[6] ? parseDuration(moveMatch[6]) : undefined,
      };
    }
    
    // POSE_MOVE - AI-animated movement with ending pose
    // Syntax: [POSE_MOVE actor_id to x,y gait endPose endExpression? endAngle? over duration?]
    // Example: [POSE_MOVE hero to 80,50 walk Standing Neutral 0 over 3s]
    const poseMoveMatch = content.match(
      /^POSE_MOVE\s+(\w+)\s+to\s+([\d.]+|RND\s*\([^)]+\))\s*,\s*([\d.]+|RND\s*\([^)]+\))\s+(\w+)\s+(\w+)(?:\s+(\w+))?(?:\s+(\d+))?(?:\s+scale\s+([\d.]+))?(?:\s+over\s+(.+))?$/i
    );
    if (poseMoveMatch) {
      return {
        type: 'POSE_MOVE',
        itemId: poseMoveMatch[1],
        x: parseNumericValue(poseMoveMatch[2]),
        y: parseNumericValue(poseMoveMatch[3]),
        gait: poseMoveMatch[4].toLowerCase() as AnimationGait,
        endPose: poseMoveMatch[5],
        endExpression: poseMoveMatch[6] || undefined,
        endAngle: poseMoveMatch[7] ? parseInt(poseMoveMatch[7]) : undefined,
        scale: poseMoveMatch[8] ? parseNumericValue(poseMoveMatch[8]) : undefined,
        duration: poseMoveMatch[9] ? parseDuration(poseMoveMatch[9]) : undefined,
      };
    }
    
    // Non-MVP: POSE actor_id pose=Happy expression=Smile
    const poseMatch = content.match(/^POSE\s+(\w+)(.*)$/i);
    if (poseMatch) {
      const params = poseMatch[2];
      const poseVal = params.match(/pose=(\w+)/i)?.[1];
      const exprVal = params.match(/expression=(\w+)/i)?.[1];
      return {
        type: 'POSE',
        actorId: poseMatch[1],
        pose: poseVal,
        expression: exprVal,
      };
    }
    
    // Non-MVP: EFFECT sfx_id on target_id
    const effectMatch = content.match(/^EFFECT\s+(\w+)\s+on\s+(\w+)$/i);
    if (effectMatch) {
      return {
        type: 'EFFECT',
        sfxId: effectMatch[1],
        targetId: effectMatch[2],
      };
    }
    
    // Non-MVP: CLEAR_EFFECT sfx_id from target_id
    const clearEffectMatch = content.match(/^CLEAR_EFFECT\s+(\w+)\s+from\s+(\w+)$/i);
    if (clearEffectMatch) {
      return {
        type: 'CLEAR_EFFECT',
        sfxId: clearEffectMatch[1],
        targetId: clearEffectMatch[2],
      };
    }
    
    // Non-MVP: SET variable = value
    const setMatch = content.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
    if (setMatch) {
      let value: string | number | boolean = setMatch[2].trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value))) value = Number(value);
      else value = value.replace(/^["']|["']$/g, '');
      
      return {
        type: 'SET',
        variable: setMatch[1],
        value,
      };
    }
    
    // Non-MVP: IF variable == value
    const ifMatch = content.match(/^IF\s+(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/i);
    if (ifMatch) {
      let value: string | number | boolean = ifMatch[3].trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value))) value = Number(value);
      else value = value.replace(/^["']|["']$/g, '');
      
      return {
        type: 'IF',
        variable: ifMatch[1],
        operator: ifMatch[2] as '==' | '!=' | '>' | '<' | '>=' | '<=',
        value,
        commands: [],
      };
    }
    
    // Non-MVP: ENDIF or /IF
    if (/^(ENDIF|\/IF)$/i.test(content)) {
      return { type: 'ENDIF' } as unknown as ScriptCommand;
    }
    
    // LOOP count - repeat block N times (supports RND())
    const loopMatch = content.match(/^LOOP\s+([\d]+|RND\s*\([^)]+\))$/i);
    if (loopMatch) {
      return {
        type: 'LOOP',
        count: Math.max(1, Math.round(parseNumericValue(loopMatch[1]))),
        commands: [],
      };
    }
    
    // ENDLOOP or /LOOP
    if (/^(ENDLOOP|\/LOOP)$/i.test(content)) {
      return { type: 'ENDLOOP' } as unknown as ScriptCommand;
    }
    
    // BREAKLOOP - exit innermost loop
    if (/^BREAKLOOP$/i.test(content)) {
      return { type: 'BREAKLOOP' };
    }
    
    return { type: 'UNKNOWN', raw: trimmed };
  }
  
  // SAY command: SAY ActorName "text" or SAY ActorName (thinking) "text"
  const sayMatch = trimmed.match(/^SAY\s+([A-Za-z0-9_]+)(?:\s*\((thinking)\))?\s+"(.+)"$/i);
  if (sayMatch) {
    return {
      type: 'SAY',
      actorName: sayMatch[1].trim(),
      text: sayMatch[3],
      style: sayMatch[2] === 'thinking' ? 'thought' : 'speech',
    };
  }
  
  // Dialogue: ACTOR_NAME: "Text" or ACTOR_NAME (thinking): "Text"
  const dialogueMatch = trimmed.match(/^([A-Z][A-Za-z0-9_\s]+?)(?:\s*\((thinking)\))?\s*:\s*"(.+)"$/);
  if (dialogueMatch) {
    return {
      type: 'DIALOGUE',
      actorName: dialogueMatch[1].trim(),
      text: dialogueMatch[3],
      style: dialogueMatch[2] === 'thinking' ? 'thought' : 'speech',
    };
  }
  
  // Alternative dialogue without quotes
  const dialogueAltMatch = trimmed.match(/^([A-Z][A-Za-z0-9_\s]+?)(?:\s*\((thinking)\))?\s*:\s*(.+)$/);
  if (dialogueAltMatch) {
    return {
      type: 'DIALOGUE',
      actorName: dialogueAltMatch[1].trim(),
      text: dialogueAltMatch[3],
      style: dialogueAltMatch[2] === 'thinking' ? 'thought' : 'speech',
    };
  }
  
  return { type: 'UNKNOWN', raw: trimmed };
}

// Parse [CHOICE] blocks separately
function parseChoiceBlock(lines: string[], startIndex: number): { command: ChoiceCommand; endIndex: number } | null {
  const options: ChoiceOption[] = [];
  let i = startIndex + 1;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line === '[/CHOICE]') {
      return {
        command: { type: 'CHOICE', options },
        endIndex: i,
      };
    }
    
    // Parse choice option: - "Option text" -> target_scene
    const optionMatch = line.match(/^-\s*"([^"]+)"\s*->\s*(\w+)$/);
    if (optionMatch) {
      options.push({
        text: optionMatch[1],
        target: optionMatch[2],
      });
    }
    
    i++;
  }
  
  // Unclosed choice block
  return null;
}

// Main parse function
export function parseScript(script: string): ScriptCommand[] {
  const lines = script.split('\n');
  const commands: ScriptCommand[] = [];
  const ifStack: IfCommand[] = [];
  const loopStack: LoopCommand[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Handle CHOICE blocks
    if (line === '[CHOICE]') {
      const result = parseChoiceBlock(lines, i);
      if (result) {
        // Add to innermost block (loop or if) or top-level
        if (loopStack.length > 0) {
          loopStack[loopStack.length - 1].commands.push(result.command);
        } else if (ifStack.length > 0) {
          ifStack[ifStack.length - 1].commands.push(result.command);
        } else {
          commands.push(result.command);
        }
        i = result.endIndex + 1;
        continue;
      }
    }
    
    const command = parseLine(line);
    
    if (command) {
      // Handle LOOP/ENDLOOP structure
      if (command.type === 'LOOP') {
        loopStack.push(command as LoopCommand);
      } else if ((command as any).type === 'ENDLOOP') {
        const loopCmd = loopStack.pop();
        if (loopCmd) {
          // Add to enclosing block or top-level
          if (loopStack.length > 0) {
            loopStack[loopStack.length - 1].commands.push(loopCmd);
          } else if (ifStack.length > 0) {
            ifStack[ifStack.length - 1].commands.push(loopCmd);
          } else {
            commands.push(loopCmd);
          }
        }
      }
      // Handle IF/ENDIF structure
      else if (command.type === 'IF') {
        ifStack.push(command as IfCommand);
      } else if ((command as any).type === 'ENDIF') {
        const ifCmd = ifStack.pop();
        if (ifCmd) {
          if (loopStack.length > 0) {
            loopStack[loopStack.length - 1].commands.push(ifCmd);
          } else if (ifStack.length > 0) {
            ifStack[ifStack.length - 1].commands.push(ifCmd);
          } else {
            commands.push(ifCmd);
          }
        }
      } else if (loopStack.length > 0) {
        // Add to current LOOP block
        loopStack[loopStack.length - 1].commands.push(command);
      } else if (ifStack.length > 0) {
        // Add to current IF block
        ifStack[ifStack.length - 1].commands.push(command);
      } else {
        commands.push(command);
      }
    }
    
    i++;
  }
  
  // Close any unclosed blocks
  while (loopStack.length > 0) {
    const loopCmd = loopStack.pop();
    if (loopCmd) commands.push(loopCmd);
  }
  while (ifStack.length > 0) {
    const ifCmd = ifStack.pop();
    if (ifCmd) commands.push(ifCmd);
  }
  
  return commands;
}

// Helper to find actor by name in game data
export function findActorByName(name: string, actors: { id: string; name: string }[]): string | null {
  const normalized = name.toLowerCase().trim();
  const actor = actors.find(a => a.name.toLowerCase() === normalized);
  return actor ? actor.id : null;
}

// ============ SERIALIZATION FUNCTIONS ============

// Serialize a single command back to script text
export function commandToString(cmd: ScriptCommand): string {
  switch (cmd.type) {
    case 'DIALOGUE': {
      const style = cmd.style === 'thought' ? ' (thinking)' : '';
      return `${cmd.actorName}${style}: "${cmd.text}"`;
    }
    case 'SAY': {
      const style = cmd.style === 'thought' ? ' (thinking)' : '';
      return `SAY ${cmd.actorName}${style} "${cmd.text}"`;
    }
    case 'ENTER':
      // MVP format: [ENTER item_id at x,y z pose expression angle]
      return `[ENTER ${cmd.itemId} at ${cmd.x},${cmd.y} ${cmd.z} ${cmd.pose} ${cmd.expression} ${cmd.angle}]`;
    case 'EXIT':
      return `[EXIT ${cmd.itemId}]`;
    case 'ZORDER':
      return `[ZORDER ${cmd.itemId} ${cmd.direction}]`;
    case 'WAIT':
      return `[WAIT ${cmd.duration}s]`;
    case 'SCENE':
      return `[SCENE ${cmd.sceneId}]`;
    case 'BUTTON':
      return `[BUTTON ${cmd.buttonId}]`;
    case 'HIDE_BUTTON':
      return `[HIDE_BUTTON ${cmd.buttonId}]`;
    case 'CHOICE': {
      const opts = cmd.options.map(o => `- "${o.text}" -> ${o.target}`).join('\n');
      return `[CHOICE]\n${opts}\n[/CHOICE]`;
    }
    case 'COMMENT':
      return `# ${cmd.text}`;
    case 'UNKNOWN':
      return cmd.raw;
    // MOVE command with full transformation support and animation
    case 'MOVE': {
      let moveStr = `[MOVE ${cmd.itemId} to ${cmd.x},${cmd.y}`;
      if (cmd.scale !== undefined && cmd.scale !== 1) {
        moveStr += ` scale ${cmd.scale}`;
      }
      if (cmd.rotation !== undefined && cmd.rotation !== 0) {
        moveStr += ` tilt ${cmd.rotation}`;
      }
      // Always output duration (default 2s for animation)
      const duration = cmd.duration ?? 2;
      moveStr += ` over ${duration}s`;
      return moveStr + ']';
    }
    case 'POSE_MOVE': {
      let poseMoveStr = `[POSE_MOVE ${cmd.itemId} to ${cmd.x},${cmd.y} ${cmd.gait} ${cmd.endPose}`;
      if (cmd.endExpression) {
        poseMoveStr += ` ${cmd.endExpression}`;
      }
      if (cmd.endAngle !== undefined) {
        poseMoveStr += ` ${cmd.endAngle}`;
      }
      if (cmd.scale !== undefined && cmd.scale !== 1) {
        poseMoveStr += ` scale ${cmd.scale}`;
      }
      if (cmd.duration !== undefined) {
        poseMoveStr += ` over ${cmd.duration}s`;
      }
      return poseMoveStr + ']';
    }
    case 'POSE': {
      const parts: string[] = [];
      if (cmd.pose) parts.push(`pose=${cmd.pose}`);
      if (cmd.expression) parts.push(`expression=${cmd.expression}`);
      return `[POSE ${cmd.actorId}${parts.length ? ' ' + parts.join(' ') : ''}]`;
    }
    case 'BGM': {
      const loop = cmd.loop ? ' loop' : '';
      const vol = cmd.volume !== 1 ? ` vol=${Math.round(cmd.volume * 100)}%` : '';
      return `[BGM: "${cmd.trackName}"${loop}${vol}]`;
    }
    case 'AMBIENCE': {
      const loop = cmd.loop ? ' loop' : '';
      const vol = cmd.volume !== 1 ? ` vol=${Math.round(cmd.volume * 100)}%` : '';
      return `[AMBIENCE: "${cmd.trackName}"${loop}${vol}]`;
    }
    case 'SFX': {
      const vol = cmd.volume !== undefined && cmd.volume !== 1 ? ` vol=${Math.round(cmd.volume * 100)}%` : '';
      return `[SFX: "${cmd.effectName}"${vol}]`;
    }
    case 'EFFECT':
      return `[EFFECT ${cmd.sfxId} on ${cmd.targetId}]`;
    case 'CLEAR_EFFECT':
      return `[CLEAR_EFFECT ${cmd.sfxId} from ${cmd.targetId}]`;
    case 'SET': {
      let valStr: string;
      if (typeof cmd.value === 'string') valStr = `"${cmd.value}"`;
      else valStr = String(cmd.value);
      return `[SET ${cmd.variable} = ${valStr}]`;
    }
    case 'IF': {
      let valStr: string;
      if (typeof cmd.value === 'string') valStr = `"${cmd.value}"`;
      else valStr = String(cmd.value);
      const inner = cmd.commands.map(c => commandToString(c)).join('\n');
      return `[IF ${cmd.variable} ${cmd.operator} ${valStr}]\n${inner}\n[ENDIF]`;
    }
    case 'LOOP': {
      const inner = cmd.commands.map(c => commandToString(c)).join('\n');
      return `[LOOP ${cmd.count}]\n${inner}\n[/LOOP]`;
    }
    case 'BREAKLOOP':
      return '[BREAKLOOP]';
    default:
      return '';
  }
}

// Serialize an array of commands to script text
export function commandsToScript(commands: ScriptCommand[]): string {
  return commands.map(cmd => commandToString(cmd)).join('\n');
}

// Create a default command of a given type
export function createDefaultCommand(
  type: ScriptCommandType, 
  game?: { 
    actors?: { id: string; name: string }[]; 
    scenes?: { id: string }[]; 
    buttons?: { id: string }[]; 
    sfx?: { id: string }[];
    items?: { id: string }[];
  }
): ScriptCommand {
  const firstActorId = game?.actors?.[0]?.id || 'actor';
  const firstActorName = game?.actors?.[0]?.name || 'Actor';
  const firstSceneId = game?.scenes?.[0]?.id || 'scene';
  const firstButtonId = game?.buttons?.[0]?.id || 'button';
  const firstSfxId = game?.sfx?.[0]?.id || 'sfx';

  switch (type) {
    // MVP Commands
    case 'DIALOGUE':
      return { type: 'DIALOGUE', actorName: firstActorName, text: 'Hello!', style: 'speech' };
    case 'ENTER':
      return { 
        type: 'ENTER', 
        itemId: firstActorId, 
        x: 50, 
        y: 70, 
        z: 1, 
        pose: 'Neutral', 
        expression: 'Neutral', 
        angle: 0 
      };
    case 'EXIT':
      return { type: 'EXIT', itemId: firstActorId };
    case 'ZORDER':
      return { type: 'ZORDER', itemId: firstActorId, direction: 'forward' };
    case 'WAIT':
      return { type: 'WAIT', duration: 5 };
    case 'SCENE':
      return { type: 'SCENE', sceneId: firstSceneId };
    case 'BUTTON':
      return { type: 'BUTTON', buttonId: firstButtonId };
    case 'HIDE_BUTTON':
      return { type: 'HIDE_BUTTON', buttonId: firstButtonId };
    case 'CHOICE':
      return { type: 'CHOICE', options: [{ text: 'Option 1', target: firstSceneId }] };
    case 'COMMENT':
      return { type: 'COMMENT', text: 'Comment' };
    // Non-MVP Commands
    case 'MOVE':
      return { type: 'MOVE', itemId: firstActorId, x: 50, y: 50, scale: 1, rotation: 0 };
    case 'POSE_MOVE':
      return { 
        type: 'POSE_MOVE', 
        itemId: firstActorId, 
        x: 50, 
        y: 50, 
        gait: 'walk' as AnimationGait, 
        endPose: 'Neutral', 
        endExpression: 'Neutral',
        endAngle: 0,
      };
    case 'POSE':
      return { type: 'POSE', actorId: firstActorId, pose: 'Neutral', expression: 'Neutral' };
    case 'BGM':
      return { type: 'BGM', trackName: 'track', loop: true, volume: 0.7 };
    case 'AMBIENCE':
      return { type: 'AMBIENCE', trackName: 'ambient', loop: true, volume: 0.5 };
    case 'SFX':
      return { type: 'SFX', effectName: 'sound', volume: 1 };
    case 'EFFECT':
      return { type: 'EFFECT', sfxId: firstSfxId, targetId: firstActorId };
    case 'CLEAR_EFFECT':
      return { type: 'CLEAR_EFFECT', sfxId: firstSfxId, targetId: firstActorId };
    case 'SET':
      return { type: 'SET', variable: 'myVar', value: true };
    case 'IF':
      return { type: 'IF', variable: 'myVar', operator: '==', value: true, commands: [] };
    case 'LOOP':
      return { type: 'LOOP', count: 3, commands: [] };
    case 'BREAKLOOP':
      return { type: 'BREAKLOOP' };
    case 'ENDIF':
    case 'ENDLOOP':
    case 'UNKNOWN':
    default:
      return { type: 'UNKNOWN', raw: '' };
  }
}

// Insert a command at a specific index
export function insertCommandAtIndex(commands: ScriptCommand[], cmd: ScriptCommand, index: number): ScriptCommand[] {
  const result = [...commands];
  result.splice(index, 0, cmd);
  return result;
}

// Delete a command at a specific index
export function deleteCommandAtIndex(commands: ScriptCommand[], index: number): ScriptCommand[] {
  return commands.filter((_, i) => i !== index);
}

// Swap two commands
export function swapCommands(commands: ScriptCommand[], indexA: number, indexB: number): ScriptCommand[] {
  if (indexA < 0 || indexB < 0 || indexA >= commands.length || indexB >= commands.length) {
    return commands;
  }
  const result = [...commands];
  [result[indexA], result[indexB]] = [result[indexB], result[indexA]];
  return result;
}

// ============ AUTOCOMPLETE SYSTEM ============

export interface AutoCompleteSuggestion {
  label: string;
  insertText: string;
  category: 'command' | 'actor' | 'scene' | 'button' | 'sfx' | 'pose' | 'expression' | 'variable' | 'item';
  description?: string;
}

// Get cursor context to determine what kind of suggestions to show
export function getCursorContext(script: string, cursorPos: number): {
  type: 'command' | 'actor' | 'scene' | 'button' | 'sfx' | 'pose' | 'expression' | 'variable' | 'item' | 'none';
  prefix: string;
  lineStart: number;
} {
  // Find the current line
  const beforeCursor = script.substring(0, cursorPos);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const currentLine = beforeCursor.substring(lineStart);
  
  // Check for bracket command start
  if (currentLine.match(/^\[$/)) {
    return { type: 'command', prefix: '', lineStart };
  }
  
  // Check for partial command
  const cmdMatch = currentLine.match(/^\[(\w*)$/);
  if (cmdMatch) {
    return { type: 'command', prefix: cmdMatch[1], lineStart };
  }
  
  // Check for item context after ENTER/EXIT/ZORDER
  const itemCmdMatch = currentLine.match(/^\[(ENTER|EXIT|ZORDER)\s+(\w*)$/i);
  if (itemCmdMatch) {
    return { type: 'item', prefix: itemCmdMatch[2], lineStart };
  }
  
  // Check for actor context after specific commands (non-MVP)
  const actorCmdMatch = currentLine.match(/^\[(MOVE|POSE|EFFECT|CLEAR_EFFECT)\s+(\w*)$/i);
  if (actorCmdMatch) {
    return { type: 'actor', prefix: actorCmdMatch[2], lineStart };
  }
  
  // Check for target actor in EFFECT/CLEAR_EFFECT
  const effectTargetMatch = currentLine.match(/^\[(EFFECT|CLEAR_EFFECT)\s+\w+\s+(on|from)\s+(\w*)$/i);
  if (effectTargetMatch) {
    return { type: 'actor', prefix: effectTargetMatch[3], lineStart };
  }
  
  // Check for scene context
  const sceneCmdMatch = currentLine.match(/^\[SCENE\s+(\w*)$/i);
  if (sceneCmdMatch) {
    return { type: 'scene', prefix: sceneCmdMatch[1], lineStart };
  }
  
  // Check for button context
  const buttonCmdMatch = currentLine.match(/^\[(BUTTON|HIDE_BUTTON)\s+(\w*)$/i);
  if (buttonCmdMatch) {
    return { type: 'button', prefix: buttonCmdMatch[2], lineStart };
  }
  
  // Check for sfx context in EFFECT
  const sfxMatch = currentLine.match(/^\[(EFFECT|CLEAR_EFFECT)\s+(\w*)$/i);
  if (sfxMatch) {
    return { type: 'sfx', prefix: sfxMatch[2], lineStart };
  }
  
  // Check for pose= context
  const poseMatch = currentLine.match(/pose=(\w*)$/i);
  if (poseMatch) {
    return { type: 'pose', prefix: poseMatch[1], lineStart };
  }
  
  // Check for expression= context
  const exprMatch = currentLine.match(/expression=(\w*)$/i);
  if (exprMatch) {
    return { type: 'expression', prefix: exprMatch[1], lineStart };
  }
  
  // Check for variable context in IF/SET
  const varMatch = currentLine.match(/^\[(IF|SET)\s+(\w*)$/i);
  if (varMatch) {
    return { type: 'variable', prefix: varMatch[2], lineStart };
  }
  
  return { type: 'none', prefix: '', lineStart };
}

// Get autocomplete suggestions based on cursor context
export function getAutoCompleteSuggestions(
  script: string,
  cursorPos: number,
  game: { 
    actors?: { id: string; name: string }[]; 
    scenes?: { id: string; name: string }[]; 
    buttons?: { id: string; name: string }[]; 
    sfx?: { id: string; name: string }[];
    items?: { id: string; name: string }[];
    info?: { worldState?: Record<string, unknown>; customPoses?: string[]; customExpressions?: string[] };
  },
  defaultPoses: string[] = [],
  defaultExpressions: string[] = []
): AutoCompleteSuggestion[] {
  const context = getCursorContext(script, cursorPos);
  const prefix = context.prefix.toLowerCase();
  
  switch (context.type) {
    case 'command': {
      // MVP commands first, then non-MVP
      const commands: AutoCompleteSuggestion[] = [
        // MVP Commands
        { label: 'ENTER', insertText: 'ENTER ', category: 'command', description: 'Make item appear (MVP)' },
        { label: 'EXIT', insertText: 'EXIT ', category: 'command', description: 'Remove item (MVP)' },
        { label: 'ZORDER', insertText: 'ZORDER ', category: 'command', description: 'Change z-depth (MVP)' },
        { label: 'WAIT', insertText: 'WAIT 5s]', category: 'command', description: 'Pause execution (MVP)' },
        { label: 'SCENE', insertText: 'SCENE ', category: 'command', description: 'Go to scene (MVP)' },
        { label: 'BUTTON', insertText: 'BUTTON ', category: 'command', description: 'Show button (MVP)' },
        { label: 'HIDE_BUTTON', insertText: 'HIDE_BUTTON ', category: 'command', description: 'Hide button (MVP)' },
        { label: 'CHOICE', insertText: 'CHOICE]\n- "Option" -> scene\n[/CHOICE', category: 'command', description: 'Present choices (MVP)' },
        // Non-MVP
        { label: 'MOVE', insertText: 'MOVE ', category: 'command', description: 'Animate movement' },
        { label: 'POSE', insertText: 'POSE ', category: 'command', description: 'Change pose/expression' },
        { label: 'BGM:', insertText: 'BGM: ""', category: 'command', description: 'Play background music' },
        { label: 'AMBIENCE:', insertText: 'AMBIENCE: ""', category: 'command', description: 'Play ambient sound' },
        { label: 'SFX:', insertText: 'SFX: ""', category: 'command', description: 'Play sound effect' },
        { label: 'EFFECT', insertText: 'EFFECT ', category: 'command', description: 'Apply visual effect' },
        { label: 'CLEAR_EFFECT', insertText: 'CLEAR_EFFECT ', category: 'command', description: 'Remove effect' },
        { label: 'SET', insertText: 'SET ', category: 'command', description: 'Set variable' },
        { label: 'IF', insertText: 'IF ', category: 'command', description: 'Conditional block' },
      ];
      return commands.filter(c => c.label.toLowerCase().startsWith(prefix));
    }
    
    case 'item': {
      // Combine actors and items for ENTER/EXIT/ZORDER
      const allItems: AutoCompleteSuggestion[] = [
        ...(game.actors || []).map(a => ({ 
          label: a.id, 
          insertText: a.id, 
          category: 'actor' as const, 
          description: `${a.name} (Actor)` 
        })),
        ...(game.items || []).map(i => ({ 
          label: i.id, 
          insertText: i.id, 
          category: 'item' as const, 
          description: `${i.name} (Item)` 
        })),
      ];
      return allItems.filter(a => 
        a.label.toLowerCase().startsWith(prefix) || 
        a.description?.toLowerCase().includes(prefix)
      );
    }
    
    case 'actor': {
      return (game.actors || [])
        .filter(a => a.id.toLowerCase().startsWith(prefix) || a.name.toLowerCase().startsWith(prefix))
        .map(a => ({ label: a.id, insertText: a.id, category: 'actor' as const, description: a.name }));
    }
    
    case 'scene': {
      return (game.scenes || [])
        .filter(s => s.id.toLowerCase().startsWith(prefix) || s.name.toLowerCase().startsWith(prefix))
        .map(s => ({ label: s.id, insertText: s.id, category: 'scene' as const, description: s.name }));
    }
    
    case 'button': {
      return (game.buttons || [])
        .filter(b => b.id.toLowerCase().startsWith(prefix) || b.name.toLowerCase().startsWith(prefix))
        .map(b => ({ label: b.id, insertText: b.id, category: 'button' as const, description: b.name }));
    }
    
    case 'sfx': {
      return (game.sfx || [])
        .filter(s => s.id.toLowerCase().startsWith(prefix) || s.name.toLowerCase().startsWith(prefix))
        .map(s => ({ label: s.id, insertText: s.id, category: 'sfx' as const, description: s.name }));
    }
    
    case 'pose': {
      const allPoses = [...defaultPoses, ...(game.info?.customPoses || [])];
      return allPoses
        .filter(p => p.toLowerCase().startsWith(prefix))
        .map(p => ({ label: p, insertText: p, category: 'pose' as const }));
    }
    
    case 'expression': {
      const allExpressions = [...defaultExpressions, ...(game.info?.customExpressions || [])];
      return allExpressions
        .filter(e => e.toLowerCase().startsWith(prefix))
        .map(e => ({ label: e, insertText: e, category: 'expression' as const }));
    }
    
    case 'variable': {
      const vars = Object.keys(game.info?.worldState || {});
      return vars
        .filter(v => v.toLowerCase().startsWith(prefix))
        .map(v => ({ label: v, insertText: v, category: 'variable' as const }));
    }
    
    default:
      return [];
  }
}
