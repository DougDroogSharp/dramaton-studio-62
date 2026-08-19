// DRAM Script Parser for Dramaton Theater
// Parses text-based scripts into executable commands

import { parseExpression, isBareIdentifier, splitComparison } from './expression';
import { COMMAND_AUTOCOMPLETE } from './scriptDocs';

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
  | 'TICK'
  | 'BIND'
  | 'UNBIND'
  | 'SLIDER'
  | 'GAUGE'
  | 'HIDE_SLIDER'
  | 'HIDE_GAUGE'
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
  // Literal value, or raw expression source text when isExpression is set.
  value: string | number | boolean;
  isExpression?: boolean;
}

export interface IfCommand {
  type: 'IF';
  // Variable name, or raw LHS expression source when isExpression is set.
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  // Literal value, or raw RHS expression source when isExpression is set.
  value: string | number | boolean;
  // When true, both sides are expressions and compare numerically.
  isExpression?: boolean;
  commands: ScriptCommand[];
}

// A repeating block: the body runs every `interval` seconds while the
// scene is active, concurrent with (never blocking) normal script flow.
export interface TickCommand {
  type: 'TICK';
  interval: number; // seconds
  commands: ScriptCommand[];
}

// Live-bind a stage element property to an expression; the runner
// re-evaluates whenever the world state changes.
export interface BindCommand {
  type: 'BIND';
  elementId: string;
  property: string;
  expression: string; // raw expression source
}

export interface UnbindCommand {
  type: 'UNBIND';
  elementId: string;
  property: string;
}

// Interactive slider: writes its worldState variable as the player drags.
export interface SliderCommand {
  type: 'SLIDER';
  variable: string;
  x: number;
  y: number;
  min: number;
  max: number;
  step: number;
  label?: string; // defaults to the variable name in the UI
}

// Read-only gauge: displays one worldState variable.
export interface GaugeCommand {
  type: 'GAUGE';
  variable: string;
  x: number;
  y: number;
  min: number;
  max: number;
  label?: string;
}

export interface HideSliderCommand {
  type: 'HIDE_SLIDER';
  variable: string;
}

export interface HideGaugeCommand {
  type: 'HIDE_GAUGE';
  variable: string;
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
  | TickCommand
  | BindCommand
  | UnbindCommand
  | SliderCommand
  | GaugeCommand
  | HideSliderCommand
  | HideGaugeCommand
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
    
    // SET variable = value  (value may be a literal or an expression)
    const setMatch = content.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
    if (setMatch) {
      const raw = setMatch[2].trim();
      let value: string | number | boolean = raw;
      let isExpression = false;
      // Literal fast-paths keep every existing script byte-compatible
      if (raw === 'true') value = true;
      else if (raw === 'false') value = false;
      else if (!isNaN(Number(raw))) value = Number(raw);
      else if (/^["'].*["']$/.test(raw)) value = raw.replace(/^["']|["']$/g, '');
      else {
        // Not a literal: try the expression grammar. Bare identifiers
        // also route through here so [SET x = someVar] can copy a
        // variable at runtime (falling back to the legacy plain-string
        // behavior when no such variable exists).
        const node = parseExpression(raw);
        if (node) isExpression = true;
        // Unparseable stays a plain string (legacy behavior)
      }

      return {
        type: 'SET',
        variable: setMatch[1],
        value,
        ...(isExpression ? { isExpression } : {}),
      };
    }

    // IF variable == value  (either side may be an expression)
    const ifMatch = content.match(/^IF\s+(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/i);
    if (ifMatch) {
      const raw = ifMatch[3].trim();
      let value: string | number | boolean = raw;
      let isExpression = false;
      if (raw === 'true') value = true;
      else if (raw === 'false') value = false;
      else if (!isNaN(Number(raw))) value = Number(raw);
      else if (/^["'].*["']$/.test(raw)) value = raw.replace(/^["']|["']$/g, '');
      else {
        // RHS with operators (e.g. rent * 2) upgrades the whole
        // condition to expression mode; a bare identifier stays on the
        // legacy path, where the runner resolves it as a variable if
        // one exists.
        const node = parseExpression(raw);
        if (node && !isBareIdentifier(node)) isExpression = true;
      }

      return {
        type: 'IF',
        variable: ifMatch[1],
        operator: ifMatch[2] as '==' | '!=' | '>' | '<' | '>=' | '<=',
        value,
        ...(isExpression ? { isExpression } : {}),
        commands: [], // Will be populated by parseScript
      };
    }

    // IF with an expression on the left side: [IF wages + 5 > rent * 2]
    // (the simple-form regex above requires a bare variable on the left)
    const ifExprMatch = content.match(/^IF\s+(.+)$/i);
    if (ifExprMatch) {
      const split = splitComparison(ifExprMatch[1]);
      if (split && split.lhs && split.rhs && parseExpression(split.lhs) && parseExpression(split.rhs)) {
        return {
          type: 'IF',
          variable: split.lhs,
          operator: split.op as '==' | '!=' | '>' | '<' | '>=' | '<=',
          value: split.rhs,
          isExpression: true,
          commands: [], // Will be populated by parseScript
        };
      }
    }
    
    // ENDIF or /IF
    if (/^(ENDIF|\/IF)$/i.test(content)) {
      return { type: 'ENDIF' } as unknown as ScriptCommand;
    }
    
    // BIND element_id.property to expression
    const bindMatch = content.match(/^BIND\s+(\w+)\.(\w+)\s+to\s+(.+)$/i);
    if (bindMatch) {
      return {
        type: 'BIND',
        elementId: bindMatch[1],
        property: bindMatch[2],
        expression: bindMatch[3].trim(),
      };
    }

    // UNBIND element_id.property
    const unbindMatch = content.match(/^UNBIND\s+(\w+)\.(\w+)$/i);
    if (unbindMatch) {
      return {
        type: 'UNBIND',
        elementId: unbindMatch[1],
        property: unbindMatch[2],
      };
    }

    // SLIDER var at x,y min=0 max=100 step=1 label="TEXT"
    const sliderMatch = content.match(/^SLIDER\s+(\w+)\s+at\s+([\d.]+)\s*,\s*([\d.]+)(.*)$/i);
    if (sliderMatch) {
      const params = sliderMatch[4] || '';
      const label = params.match(/label="([^"]*)"/i)?.[1];
      return {
        type: 'SLIDER',
        variable: sliderMatch[1],
        x: parseFloat(sliderMatch[2]),
        y: parseFloat(sliderMatch[3]),
        min: parseFloat(params.match(/min=(-?[\d.]+)/i)?.[1] ?? '0'),
        max: parseFloat(params.match(/max=(-?[\d.]+)/i)?.[1] ?? '100'),
        step: parseFloat(params.match(/step=([\d.]+)/i)?.[1] ?? '1'),
        ...(label !== undefined ? { label } : {}),
      };
    }

    // GAUGE var at x,y min=0 max=100 label="TEXT"
    const gaugeMatch = content.match(/^GAUGE\s+(\w+)\s+at\s+([\d.]+)\s*,\s*([\d.]+)(.*)$/i);
    if (gaugeMatch) {
      const params = gaugeMatch[4] || '';
      const label = params.match(/label="([^"]*)"/i)?.[1];
      return {
        type: 'GAUGE',
        variable: gaugeMatch[1],
        x: parseFloat(gaugeMatch[2]),
        y: parseFloat(gaugeMatch[3]),
        min: parseFloat(params.match(/min=(-?[\d.]+)/i)?.[1] ?? '0'),
        max: parseFloat(params.match(/max=(-?[\d.]+)/i)?.[1] ?? '100'),
        ...(label !== undefined ? { label } : {}),
      };
    }

    // HIDE_SLIDER var / HIDE_GAUGE var
    const hideSliderMatch = content.match(/^HIDE_SLIDER\s+(\w+)$/i);
    if (hideSliderMatch) {
      return { type: 'HIDE_SLIDER', variable: hideSliderMatch[1] };
    }
    const hideGaugeMatch = content.match(/^HIDE_GAUGE\s+(\w+)$/i);
    if (hideGaugeMatch) {
      return { type: 'HIDE_GAUGE', variable: hideGaugeMatch[1] };
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

    // Handle TICK blocks: body parses recursively (so IF nesting works
    // inside a tick). An unclosed [TICK ...] falls through to UNKNOWN.
    const tickOpen = line.match(/^\[TICK\s+(.+)\]$/i);
    if (tickOpen) {
      let closeIndex = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\[\/TICK\]$/i.test(lines[j].trim())) { closeIndex = j; break; }
      }
      if (closeIndex !== -1) {
        const body = lines.slice(i + 1, closeIndex).join('\n');
        const tickCmd: TickCommand = {
          type: 'TICK',
          interval: parseDuration(tickOpen[1]),
          commands: parseScript(body),
        };
        if (ifStack.length > 0) {
          ifStack[ifStack.length - 1].commands.push(tickCmd);
        } else {
          commands.push(tickCmd);
        }
        i = closeIndex + 1;
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
    case 'SET': {
      let valStr: string;
      if (cmd.isExpression) valStr = String(cmd.value); // raw expression source, unquoted
      else if (typeof cmd.value === 'string') valStr = `"${cmd.value}"`;
      else valStr = String(cmd.value);
      return `[SET ${cmd.variable} = ${valStr}]`;
    }
    case 'IF': {
      let valStr: string;
      if (cmd.isExpression) valStr = String(cmd.value); // raw expression source, unquoted
      else if (typeof cmd.value === 'string') valStr = `"${cmd.value}"`;
      else valStr = String(cmd.value);
      const inner = cmd.commands.map(c => commandToString(c)).join('\n');
      return `[IF ${cmd.variable} ${cmd.operator} ${valStr}]\n${inner}\n[ENDIF]`;
    }
    case 'CHOICE': {
      const opts = cmd.options.map(o => `- "${o.text}" -> ${o.target}`).join('\n');
      return `[CHOICE]\n${opts}\n[/CHOICE]`;
    }
    case 'TICK': {
      const dur = cmd.interval < 1 ? `${Math.round(cmd.interval * 1000)}ms` : `${cmd.interval}s`;
      const inner = cmd.commands.map(c => commandToString(c)).join('\n');
      return `[TICK ${dur}]\n${inner}\n[/TICK]`;
    }
    case 'BIND':
      return `[BIND ${cmd.elementId}.${cmd.property} to ${cmd.expression}]`;
    case 'UNBIND':
      return `[UNBIND ${cmd.elementId}.${cmd.property}]`;
    case 'SLIDER': {
      const step = cmd.step !== 1 ? ` step=${cmd.step}` : '';
      const label = cmd.label !== undefined ? ` label="${cmd.label}"` : '';
      return `[SLIDER ${cmd.variable} at ${cmd.x},${cmd.y} min=${cmd.min} max=${cmd.max}${step}${label}]`;
    }
    case 'GAUGE': {
      const label = cmd.label !== undefined ? ` label="${cmd.label}"` : '';
      return `[GAUGE ${cmd.variable} at ${cmd.x},${cmd.y} min=${cmd.min} max=${cmd.max}${label}]`;
    }
    case 'HIDE_SLIDER':
      return `[HIDE_SLIDER ${cmd.variable}]`;
    case 'HIDE_GAUGE':
      return `[HIDE_GAUGE ${cmd.variable}]`;
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
    case 'TICK':
      return { type: 'TICK', interval: 1, commands: [] };
    case 'BIND':
      return { type: 'BIND', elementId: 'element', property: 'rotation', expression: 'myVar' };
    case 'UNBIND':
      return { type: 'UNBIND', elementId: 'element', property: 'rotation' };
    case 'SLIDER':
      return { type: 'SLIDER', variable: 'myVar', x: 85, y: 20, min: 0, max: 100, step: 1 };
    case 'GAUGE':
      return { type: 'GAUGE', variable: 'myVar', x: 15, y: 20, min: 0, max: 100 };
    case 'HIDE_SLIDER':
      return { type: 'HIDE_SLIDER', variable: 'myVar' };
    case 'HIDE_GAUGE':
      return { type: 'HIDE_GAUGE', variable: 'myVar' };
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
    actors?: { id: string; name: string }[]; 
    scenes?: { id: string; name: string }[]; 
    buttons?: { id: string; name: string }[]; 
    sfx?: { id: string; name: string }[];
    info?: { worldState?: Record<string, unknown>; customPoses?: string[]; customExpressions?: string[] };
  },
  defaultPoses: string[] = [],
  defaultExpressions: string[] = []
): AutoCompleteSuggestion[] {
  const context = getCursorContext(script, cursorPos);
  const prefix = context.prefix.toLowerCase();
  
  switch (context.type) {
    case 'command': {
      // Palette lives in scriptDocs.ts (single source of truth)
      const commands: AutoCompleteSuggestion[] = COMMAND_AUTOCOMPLETE.map(entry => ({
        label: entry.label,
        insertText: entry.insertText,
        category: 'command' as const,
        description: entry.description,
      }));
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
