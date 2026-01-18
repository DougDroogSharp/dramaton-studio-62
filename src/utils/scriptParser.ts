// DRAM Script Parser for Dramaton Theater
// Parses text-based scripts into executable commands

export type ScriptCommandType = 
  | 'DIALOGUE'
  | 'ENTER'
  | 'EXIT'
  | 'MOVE'
  | 'POSE'
  | 'BGM'
  | 'AMBIENCE'
  | 'SFX'
  | 'EFFECT'
  | 'CLEAR_EFFECT'
  | 'WAIT'
  | 'SCENE'
  | 'CHOICE'
  | 'SET'
  | 'IF'
  | 'ENDIF'
  | 'BUTTON'
  | 'HIDE_BUTTON'
  | 'COMMENT'
  | 'UNKNOWN';

export interface DialogueCommand {
  type: 'DIALOGUE';
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
}

export interface EnterCommand {
  type: 'ENTER';
  actorId: string;
  x: number;
  y: number;
}

export interface ExitCommand {
  type: 'EXIT';
  actorId: string;
}

export interface MoveCommand {
  type: 'MOVE';
  actorId: string;
  x: number;
  y: number;
  duration: number;
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

export interface CommentCommand {
  type: 'COMMENT';
  text: string;
}

export interface ButtonCommand {
  type: 'BUTTON';
  buttonId: string;
}

export interface HideButtonCommand {
  type: 'HIDE_BUTTON';
  buttonId: string;
}

export interface UnknownCommand {
  type: 'UNKNOWN';
  raw: string;
}

export type ScriptCommand = 
  | DialogueCommand
  | EnterCommand
  | ExitCommand
  | MoveCommand
  | PoseCommand
  | BgmCommand
  | AmbienceCommand
  | SfxCommand
  | EffectCommand
  | ClearEffectCommand
  | WaitCommand
  | SceneCommand
  | ChoiceCommand
  | SetCommand
  | IfCommand
  | CommentCommand
  | ButtonCommand
  | HideButtonCommand
  | UnknownCommand;

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
  const msMatch = str.match(/(\d+)ms/);
  if (msMatch) return parseInt(msMatch[1]) / 1000;
  
  const sMatch = str.match(/(\d+(?:\.\d+)?)s?/);
  if (sMatch) return parseFloat(sMatch[1]);
  
  return 1;
}

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
    
    // BGM: "track_name" loop vol=70%
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
    
    // AMBIENCE: "track_name" loop vol=50%
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
    
    // SFX: "effect_name" vol=100%
    const sfxMatch = content.match(/^SFX:\s*"([^"]+)"(.*)$/i);
    if (sfxMatch) {
      return {
        type: 'SFX',
        effectName: sfxMatch[1],
        volume: parseVolume(sfxMatch[2] || ''),
      };
    }
    
    // ENTER actor_id at x,y
    const enterMatch = content.match(/^ENTER\s+(\w+)\s+at\s+(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/i);
    if (enterMatch) {
      return {
        type: 'ENTER',
        actorId: enterMatch[1],
        x: parseFloat(enterMatch[2]),
        y: parseFloat(enterMatch[3]),
      };
    }
    
    // EXIT actor_id
    const exitMatch = content.match(/^EXIT\s+(\w+)$/i);
    if (exitMatch) {
      return {
        type: 'EXIT',
        actorId: exitMatch[1],
      };
    }
    
    // MOVE actor_id to x,y over 1s
    const moveMatch = content.match(/^MOVE\s+(\w+)\s+to\s+(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:over\s+(.+))?$/i);
    if (moveMatch) {
      return {
        type: 'MOVE',
        actorId: moveMatch[1],
        x: parseFloat(moveMatch[2]),
        y: parseFloat(moveMatch[3]),
        duration: moveMatch[4] ? parseDuration(moveMatch[4]) : 0.5,
      };
    }
    
    // POSE actor_id pose=Happy expression=Smile
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
    
    // EFFECT sfx_id on target_id
    const effectMatch = content.match(/^EFFECT\s+(\w+)\s+on\s+(\w+)$/i);
    if (effectMatch) {
      return {
        type: 'EFFECT',
        sfxId: effectMatch[1],
        targetId: effectMatch[2],
      };
    }
    
    // CLEAR_EFFECT sfx_id from target_id
    const clearEffectMatch = content.match(/^CLEAR_EFFECT\s+(\w+)\s+from\s+(\w+)$/i);
    if (clearEffectMatch) {
      return {
        type: 'CLEAR_EFFECT',
        sfxId: clearEffectMatch[1],
        targetId: clearEffectMatch[2],
      };
    }
    
    // WAIT 2s
    const waitMatch = content.match(/^WAIT\s+(.+)$/i);
    if (waitMatch) {
      return {
        type: 'WAIT',
        duration: parseDuration(waitMatch[1]),
      };
    }
    
    // SCENE scene_id
    const sceneMatch = content.match(/^SCENE\s+(\w+)$/i);
    if (sceneMatch) {
      return {
        type: 'SCENE',
        sceneId: sceneMatch[1],
      };
    }
    
    // SET variable = value
    const setMatch = content.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
    if (setMatch) {
      let value: string | number | boolean = setMatch[2].trim();
      // Try to parse as number or boolean
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value))) value = Number(value);
      else value = value.replace(/^["']|["']$/g, ''); // Remove quotes
      
      return {
        type: 'SET',
        variable: setMatch[1],
        value,
      };
    }
    
    // IF variable == value
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
        commands: [], // Will be populated by parseScript
      };
    }
    
    // ENDIF or /IF
    if (/^(ENDIF|\/IF)$/i.test(content)) {
      return { type: 'ENDIF' } as unknown as ScriptCommand;
    }
    
    // BUTTON button_id - show a button
    const buttonMatch = content.match(/^BUTTON\s+(\w+)$/i);
    if (buttonMatch) {
      return {
        type: 'BUTTON',
        buttonId: buttonMatch[1],
      };
    }
    
    // HIDE_BUTTON button_id - hide a button
    const hideButtonMatch = content.match(/^HIDE_BUTTON\s+(\w+)$/i);
    if (hideButtonMatch) {
      return {
        type: 'HIDE_BUTTON',
        buttonId: hideButtonMatch[1],
      };
    }
    
    return { type: 'UNKNOWN', raw: trimmed };
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
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Handle CHOICE blocks
    if (line === '[CHOICE]') {
      const result = parseChoiceBlock(lines, i);
      if (result) {
        if (ifStack.length > 0) {
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
      // Handle IF/ENDIF structure
      if (command.type === 'IF') {
        ifStack.push(command as IfCommand);
      } else if ((command as any).type === 'ENDIF') {
        const ifCmd = ifStack.pop();
        if (ifCmd) {
          if (ifStack.length > 0) {
            ifStack[ifStack.length - 1].commands.push(ifCmd);
          } else {
            commands.push(ifCmd);
          }
        }
      } else if (ifStack.length > 0) {
        // Add to current IF block
        ifStack[ifStack.length - 1].commands.push(command);
      } else {
        commands.push(command);
      }
    }
    
    i++;
  }
  
  // Close any unclosed IF blocks
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
  return actor?.id || null;
}
