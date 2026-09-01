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
  // Decision point: variables this option twiddles before jumping (Narraton).
  sets?: SetCommand[];
}

export interface ChoiceCommand {
  type: 'CHOICE';
  options: ChoiceOption[];
}

export type SetOperator = '=' | '+=' | '-=';

export interface SetCommand {
  type: 'SET';
  variable: string;
  op?: SetOperator;    // undefined means '=' (plain assignment)
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

// Parse the inside of a SET command: "variable = value", also += / -= for
// increment/decrement (KoC-style variable twiddling at decision points).
function parseSetContent(content: string): SetCommand | null {
  const setMatch = content.match(/^SET\s+(\w+)\s*(\+=|-=|=)\s*(.+)$/i);
  if (!setMatch) return null;

  let value: string | number | boolean = setMatch[3].trim();
  // Try to parse as number or boolean
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (!isNaN(Number(value))) value = Number(value);
  else value = value.replace(/^["']|["']$/g, ''); // Remove quotes

  const op = setMatch[2] as SetOperator;
  return {
    type: 'SET',
    variable: setMatch[1],
    ...(op !== '=' ? { op } : {}),
    value,
  };
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
    
    // SET variable = value  (also += / -=)
    const setCommand = parseSetContent(content);
    if (setCommand) return setCommand;
    
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
    // Optionally followed by inline variable twiddles (a decision point):
    //   - "Bribe him" -> office [SET boss_rep += 10] [SET cash -= 50]
    const optionMatch = line.match(/^-\s*"([^"]+)"\s*->\s*(\w+)((?:\s*\[SET[^\]]*\])*)\s*$/i);
    if (optionMatch) {
      const sets: SetCommand[] = [];
      const setChunks = optionMatch[3]?.match(/\[([^\]]*)\]/g) || [];
      for (const chunk of setChunks) {
        const cmd = parseSetContent(chunk.slice(1, -1));
        if (cmd) sets.push(cmd);
      }
      options.push({
        text: optionMatch[1],
        target: optionMatch[2],
        ...(sets.length > 0 ? { sets } : {}),
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
  return actor ? actor.id : null;
}

// ============ SERIALIZATION FUNCTIONS ============

function serializeSet(cmd: SetCommand): string {
  const valStr = typeof cmd.value === 'string' ? `"${cmd.value}"` : String(cmd.value);
  return `[SET ${cmd.variable} ${cmd.op || '='} ${valStr}]`;
}

// Serialize a single command back to script text
export function commandToString(cmd: ScriptCommand): string {
  switch (cmd.type) {
    case 'DIALOGUE': {
      const style = cmd.style === 'thought' ? ' (thinking)' : '';
      return `${cmd.actorName}${style}: "${cmd.text}"`;
    }
    case 'ENTER':
      return `[ENTER ${cmd.actorId} at ${cmd.x},${cmd.y}]`;
    case 'EXIT':
      return `[EXIT ${cmd.actorId}]`;
    case 'MOVE': {
      const dur = cmd.duration !== 0.5 ? ` over ${cmd.duration}s` : '';
      return `[MOVE ${cmd.actorId} to ${cmd.x},${cmd.y}${dur}]`;
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
    case 'WAIT':
      return `[WAIT ${cmd.duration}s]`;
    case 'SCENE':
      return `[SCENE ${cmd.sceneId}]`;
    case 'BUTTON':
      return `[BUTTON ${cmd.buttonId}]`;
    case 'HIDE_BUTTON':
      return `[HIDE_BUTTON ${cmd.buttonId}]`;
    case 'SET':
      return serializeSet(cmd);
    case 'IF': {
      let valStr: string;
      if (typeof cmd.value === 'string') valStr = `"${cmd.value}"`;
      else valStr = String(cmd.value);
      const inner = cmd.commands.map(c => commandToString(c)).join('\n');
      return `[IF ${cmd.variable} ${cmd.operator} ${valStr}]\n${inner}\n[ENDIF]`;
    }
    case 'CHOICE': {
      const opts = cmd.options.map(o => {
        const sets = (o.sets || []).map(s => ` ${serializeSet(s)}`).join('');
        return `- "${o.text}" -> ${o.target}${sets}`;
      }).join('\n');
      return `[CHOICE]\n${opts}\n[/CHOICE]`;
    }
    case 'COMMENT':
      return `# ${cmd.text}`;
    case 'UNKNOWN':
      return cmd.raw;
    default:
      return '';
  }
}

// Serialize an array of commands to script text
export function commandsToScript(commands: ScriptCommand[]): string {
  return commands.map(cmd => commandToString(cmd)).join('\n');
}

// Create a default command of a given type
export function createDefaultCommand(type: ScriptCommandType, game?: { actors?: { id: string; name: string }[]; scenes?: { id: string }[]; buttons?: { id: string }[]; sfx?: { id: string }[] }): ScriptCommand {
  const firstActorId = game?.actors?.[0]?.id || 'actor';
  const firstActorName = game?.actors?.[0]?.name || 'Actor';
  const firstSceneId = game?.scenes?.[0]?.id || 'scene';
  const firstButtonId = game?.buttons?.[0]?.id || 'button';
  const firstSfxId = game?.sfx?.[0]?.id || 'sfx';

  switch (type) {
    case 'DIALOGUE':
      return { type: 'DIALOGUE', actorName: firstActorName, text: 'Hello!', style: 'speech' };
    case 'ENTER':
      return { type: 'ENTER', actorId: firstActorId, x: 50, y: 70 };
    case 'EXIT':
      return { type: 'EXIT', actorId: firstActorId };
    case 'MOVE':
      return { type: 'MOVE', actorId: firstActorId, x: 50, y: 50, duration: 0.5 };
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
    case 'WAIT':
      return { type: 'WAIT', duration: 1 };
    case 'SCENE':
      return { type: 'SCENE', sceneId: firstSceneId };
    case 'BUTTON':
      return { type: 'BUTTON', buttonId: firstButtonId };
    case 'HIDE_BUTTON':
      return { type: 'HIDE_BUTTON', buttonId: firstButtonId };
    case 'SET':
      return { type: 'SET', variable: 'myVar', value: true };
    case 'IF':
      return { type: 'IF', variable: 'myVar', operator: '==', value: true, commands: [] };
    case 'CHOICE':
      return { type: 'CHOICE', options: [{ text: 'Option 1', target: firstSceneId }] };
    case 'COMMENT':
      return { type: 'COMMENT', text: 'Comment' };
    case 'ENDIF':
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
  category: 'command' | 'actor' | 'scene' | 'button' | 'sfx' | 'pose' | 'expression' | 'variable';
  description?: string;
}

// Get cursor context to determine what kind of suggestions to show
export function getCursorContext(script: string, cursorPos: number): {
  type: 'command' | 'actor' | 'scene' | 'button' | 'sfx' | 'pose' | 'expression' | 'variable' | 'none';
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
  
  // Check for actor context after specific commands
  const actorCmdMatch = currentLine.match(/^\[(ENTER|EXIT|MOVE|POSE|EFFECT|CLEAR_EFFECT)\s+(\w*)$/i);
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
    actors?: { id: string; name: string; skinId?: string }[];
    scenes?: { id: string; name: string }[];
    buttons?: { id: string; name: string }[];
    sfx?: { id: string; name: string }[];
    skins?: { id: string; animations: string[]; authoredAnimations?: { name: string }[] }[];
    info?: { worldState?: Record<string, unknown>; customPoses?: string[]; customExpressions?: string[] };
  },
  defaultPoses: string[] = [],
  defaultExpressions: string[] = []
): AutoCompleteSuggestion[] {
  const context = getCursorContext(script, cursorPos);
  const prefix = context.prefix.toLowerCase();
  
  switch (context.type) {
    case 'command': {
      const commands: AutoCompleteSuggestion[] = [
        { label: 'ENTER', insertText: 'ENTER ', category: 'command', description: 'Make actor appear' },
        { label: 'EXIT', insertText: 'EXIT ', category: 'command', description: 'Remove actor' },
        { label: 'MOVE', insertText: 'MOVE ', category: 'command', description: 'Animate actor movement' },
        { label: 'POSE', insertText: 'POSE ', category: 'command', description: 'Change pose/expression' },
        { label: 'BGM:', insertText: 'BGM: ""', category: 'command', description: 'Play background music' },
        { label: 'AMBIENCE:', insertText: 'AMBIENCE: ""', category: 'command', description: 'Play ambient sound' },
        { label: 'SFX:', insertText: 'SFX: ""', category: 'command', description: 'Play sound effect' },
        { label: 'EFFECT', insertText: 'EFFECT ', category: 'command', description: 'Apply visual effect' },
        { label: 'CLEAR_EFFECT', insertText: 'CLEAR_EFFECT ', category: 'command', description: 'Remove effect' },
        { label: 'WAIT', insertText: 'WAIT 1s]', category: 'command', description: 'Pause execution' },
        { label: 'SCENE', insertText: 'SCENE ', category: 'command', description: 'Go to scene' },
        { label: 'BUTTON', insertText: 'BUTTON ', category: 'command', description: 'Show button' },
        { label: 'HIDE_BUTTON', insertText: 'HIDE_BUTTON ', category: 'command', description: 'Hide button' },
        { label: 'SET', insertText: 'SET ', category: 'command', description: 'Set variable' },
        { label: 'IF', insertText: 'IF ', category: 'command', description: 'Conditional block' },
        { label: 'CHOICE', insertText: 'CHOICE]\n- "Option" -> scene\n[/CHOICE', category: 'command', description: 'Present choices' },
      ];
      return commands.filter(c => c.label.toLowerCase().startsWith(prefix));
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
      // The actor's skin animations are poses too: resolve the actor id from
      // the current [POSE actor ...] line and pull its skin's manifest —
      // non-standard clips included.
      const currentLine = script.substring(context.lineStart, cursorPos);
      const poseActorId = currentLine.match(/^\[POSE\s+(\w+)/i)?.[1];
      const actor = poseActorId
        ? (game.actors || []).find(a => a.id.toLowerCase() === poseActorId.toLowerCase())
        : undefined;
      const actorSkin = actor?.skinId ? (game.skins || []).find(s => s.id === actor.skinId) : undefined;
      const skinAnims = actorSkin
        ? [...actorSkin.animations, ...(actorSkin.authoredAnimations ?? []).map(c => c.name)]
        : [];
      const allPoses = [...new Set([...skinAnims, ...defaultPoses, ...(game.info?.customPoses || [])])];
      return allPoses
        .filter(p => p.toLowerCase().startsWith(prefix))
        .map(p => ({
          label: p,
          insertText: p,
          category: 'pose' as const,
          ...(skinAnims.includes(p) ? { description: 'skin animation' } : {}),
        }));
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
