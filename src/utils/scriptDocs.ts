// DRAM Script Documentation Registry
// This file serves as the source of truth for all DRAM script commands
// Run `npm run docs:dram` to regenerate docs/DRAM_SCRIPT.md

import type { ScriptCommandType } from './scriptParser';

export interface CommandParameter {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

export interface CommandDoc {
  type: ScriptCommandType;
  category: 'scene' | 'actor' | 'dialogue' | 'audio' | 'button' | 'choice' | 'flow' | 'effect';
  syntax: string;
  description: string;
  parameters?: CommandParameter[];
  example: string;
  implemented: boolean;
}

export const COMMAND_DOCS: CommandDoc[] = [
  // ============ DIALOGUE COMMANDS ============
  {
    type: 'DIALOGUE',
    category: 'dialogue',
    syntax: 'ACTOR_NAME: "dialogue text"',
    description: 'Displays dialogue spoken by an actor. The actor name must match a defined actor.',
    parameters: [
      { name: 'actorName', type: 'string', description: 'The name of the speaking actor (case-sensitive, starts with uppercase)' },
      { name: 'text', type: 'string', description: 'The dialogue text to display (in quotes)' },
    ],
    example: `Detective: "I've seen things you wouldn't believe."
Narrator: "The rain continued to fall."
Alice (thinking): "What should I do next?"`,
    implemented: true,
  },

  // ============ ACTOR COMMANDS ============
  {
    type: 'ENTER',
    category: 'actor',
    syntax: '[ENTER actor_id at x,y]',
    description: 'Makes an actor appear on stage at the specified position (percentage of stage dimensions).',
    parameters: [
      { name: 'actor_id', type: 'string', description: 'The unique identifier of the actor' },
      { name: 'x', type: 'number', description: 'Horizontal position (0-100, percentage from left)' },
      { name: 'y', type: 'number', description: 'Vertical position (0-100, percentage from top)' },
    ],
    example: '[ENTER detective at 25,50]\n[ENTER witness at 75,50]',
    implemented: true,
  },
  {
    type: 'EXIT',
    category: 'actor',
    syntax: '[EXIT actor_id]',
    description: 'Removes an actor from the stage.',
    parameters: [
      { name: 'actor_id', type: 'string', description: 'The unique identifier of the actor to remove' },
    ],
    example: '[EXIT detective]',
    implemented: true,
  },
  {
    type: 'MOVE',
    category: 'actor',
    syntax: '[MOVE actor_id to x,y over duration]',
    description: 'Animates an actor moving to a new position over the specified duration.',
    parameters: [
      { name: 'actor_id', type: 'string', description: 'The unique identifier of the actor' },
      { name: 'x', type: 'number', description: 'Target horizontal position (0-100)' },
      { name: 'y', type: 'number', description: 'Target vertical position (0-100)' },
      { name: 'duration', type: 'string', description: 'Animation duration (e.g., "2s", "500ms")', optional: true },
    ],
    example: '[MOVE detective to 50,50 over 1s]\n[MOVE witness to 25,50]',
    implemented: true,
  },
  {
    type: 'POSE',
    category: 'actor',
    syntax: '[POSE actor_id pose=PoseName expression=ExpressionName]',
    description: 'Changes an actor\'s pose and/or expression.',
    parameters: [
      { name: 'actor_id', type: 'string', description: 'The unique identifier of the actor' },
      { name: 'pose', type: 'string', description: 'The pose name to switch to', optional: true },
      { name: 'expression', type: 'string', description: 'The expression name to display', optional: true },
    ],
    example: '[POSE detective pose=Thinking expression=Worried]\n[POSE witness expression=Happy]',
    implemented: true,
  },

  // ============ AUDIO COMMANDS ============
  {
    type: 'BGM',
    category: 'audio',
    syntax: '[BGM: "track_name" loop vol=XX%]',
    description: 'Plays background music. Can loop and set volume.',
    parameters: [
      { name: 'track_name', type: 'string', description: 'Name or ID of the music track' },
      { name: 'loop', type: 'flag', description: 'Add "loop" to repeat the track', optional: true },
      { name: 'vol', type: 'percentage', description: 'Volume level (0-100%)', optional: true },
    ],
    example: '[BGM: "noir_jazz" loop vol=70%]\n[BGM: "tension" vol=50%]',
    implemented: true,
  },
  {
    type: 'AMBIENCE',
    category: 'audio',
    syntax: '[AMBIENCE: "track_name" loop vol=XX%]',
    description: 'Plays ambient background sounds (rain, crowd noise, etc.).',
    parameters: [
      { name: 'track_name', type: 'string', description: 'Name or ID of the ambient track' },
      { name: 'loop', type: 'flag', description: 'Add "loop" to repeat the track', optional: true },
      { name: 'vol', type: 'percentage', description: 'Volume level (0-100%)', optional: true },
    ],
    example: '[AMBIENCE: "city_rain" loop vol=40%]',
    implemented: true,
  },
  {
    type: 'SFX',
    category: 'audio',
    syntax: '[SFX: "effect_name" vol=XX%]',
    description: 'Plays a one-shot sound effect.',
    parameters: [
      { name: 'effect_name', type: 'string', description: 'Name or ID of the sound effect' },
      { name: 'vol', type: 'percentage', description: 'Volume level (0-100%)', optional: true },
    ],
    example: '[SFX: "door_slam"]\n[SFX: "thunder" vol=80%]',
    implemented: true,
  },

  // ============ EFFECT COMMANDS ============
  {
    type: 'EFFECT',
    category: 'effect',
    syntax: '[EFFECT sfx_id on target_id]',
    description: 'Applies a visual effect (shader, filter, animation) to an actor or element.',
    parameters: [
      { name: 'sfx_id', type: 'string', description: 'The ID of the SFX/effect to apply' },
      { name: 'target_id', type: 'string', description: 'The ID of the actor or element to affect' },
    ],
    example: '[EFFECT glow on detective]\n[EFFECT shake on stage]',
    implemented: true,
  },
  {
    type: 'CLEAR_EFFECT',
    category: 'effect',
    syntax: '[CLEAR_EFFECT sfx_id from target_id]',
    description: 'Removes a previously applied visual effect from an actor or element.',
    parameters: [
      { name: 'sfx_id', type: 'string', description: 'The ID of the SFX/effect to remove' },
      { name: 'target_id', type: 'string', description: 'The ID of the actor or element' },
    ],
    example: '[CLEAR_EFFECT glow from detective]',
    implemented: true,
  },

  // ============ BUTTON COMMANDS ============
  {
    type: 'BUTTON',
    category: 'button',
    syntax: '[BUTTON button_id]',
    description: 'Displays an interactive button on the stage. Buttons can navigate to scenes, play sounds, or open URLs.',
    parameters: [
      { name: 'button_id', type: 'string', description: 'The unique identifier of the button to show' },
    ],
    example: '[BUTTON examine_desk]\n[BUTTON open_door]',
    implemented: true,
  },
  {
    type: 'HIDE_BUTTON',
    category: 'button',
    syntax: '[HIDE_BUTTON button_id]',
    description: 'Hides and deactivates a previously shown button.',
    parameters: [
      { name: 'button_id', type: 'string', description: 'The unique identifier of the button to hide' },
    ],
    example: '[HIDE_BUTTON examine_desk]',
    implemented: true,
  },

  // ============ CHOICE COMMANDS ============
  {
    type: 'CHOICE',
    category: 'choice',
    syntax: '[CHOICE]\n- "Option text" -> target_scene\n[/CHOICE]',
    description: 'Presents the player with branching dialogue options. Each option navigates to a different scene.',
    parameters: [
      { name: 'options', type: 'array', description: 'List of choice options with text and target scenes' },
    ],
    example: `[CHOICE]
- "Investigate the desk" -> desk_scene
- "Talk to the witness" -> witness_scene
- "Leave the room" -> hallway
[/CHOICE]`,
    implemented: true,
  },

  // ============ FLOW CONTROL ============
  {
    type: 'SCENE',
    category: 'scene',
    syntax: '[SCENE scene_id]',
    description: 'Transitions to a different scene immediately.',
    parameters: [
      { name: 'scene_id', type: 'string', description: 'The unique identifier of the target scene' },
    ],
    example: '[SCENE forest_clearing]\n[SCENE chapter2_intro]',
    implemented: true,
  },
  {
    type: 'WAIT',
    category: 'flow',
    syntax: '[WAIT duration]',
    description: 'Pauses script execution for the specified duration.',
    parameters: [
      { name: 'duration', type: 'string', description: 'Wait time (e.g., "2s", "500ms", or just "2" for seconds)' },
    ],
    example: '[WAIT 2s]\n[WAIT 500ms]',
    implemented: true,
  },
  {
    type: 'SET',
    category: 'flow',
    syntax: '[SET variable = value_or_expression]',
    description: 'Sets a world state variable that persists across scenes. The right side can be a literal (string, number, boolean) or an arithmetic expression over other variables. Expressions support + - * / ( ), numeric literals, variable names, and the functions clamp(x,min,max), min(...), max(...), abs(x), floor(x), rand(). A bare variable name copies that variable\'s value. Bad expressions and unknown variables resolve to 0 with a console warning — scripts never crash.',
    parameters: [
      { name: 'variable', type: 'string', description: 'The variable name (alphanumeric, no spaces)' },
      { name: 'value', type: 'any', description: 'A literal (string, number, boolean) or an arithmetic expression' },
    ],
    example: `[SET hasKey = true]
[SET visitCount = 3]
[SET playerName = "Alex"]
[SET product = laborForce * productivity]
[SET wages = max(product - rent, survivalFloor)]
[SET rent = clamp(product * rentShare, 0, product)]`,
    implemented: true,
  },
  {
    type: 'IF',
    category: 'flow',
    syntax: '[IF condition]\n...commands...\n[ENDIF]',
    description: 'Conditionally executes commands based on world state. The simple form compares one variable against a literal. Either side may also be an arithmetic expression (same grammar as SET), in which case both sides evaluate numerically. Booleans count as 1/0 in expressions.',
    parameters: [
      { name: 'lhs', type: 'string', description: 'The variable to check, or an arithmetic expression' },
      { name: 'operator', type: 'string', description: 'Comparison operator: ==, !=, >, <, >=, <=' },
      { name: 'rhs', type: 'any', description: 'A literal, variable, or arithmetic expression to compare against' },
    ],
    example: `[IF hasKey == true]
Detective: "I can unlock this door now."
[ENDIF]

[IF wages < survivalFloor + 10]
Narrator: "The humans are starving."
[ENDIF]

[IF speculation * greed > 5000]
[EFFECT shake on stage]
[ENDIF]`,
    implemented: true,
  },
  {
    type: 'ENDIF',
    category: 'flow',
    syntax: '[ENDIF]',
    description: 'Marks the end of an IF conditional block.',
    parameters: [],
    example: '[ENDIF]',
    implemented: true,
  },
  {
    type: 'TICK',
    category: 'flow',
    syntax: '[TICK interval]\n...commands...\n[/TICK]',
    description: 'A repeating block: the body runs every interval while the scene is active, concurrent with (never blocking) normal script and dialogue flow. Use it as a simulation heartbeat — typically SETs and IFs updating world state. One TICK block per scene; extra blocks are ignored with a warning. Blocking commands (DIALOGUE, CHOICE, WAIT, nested TICK) are skipped inside a tick body with a warning. The tick keeps running after the scene script completes and stops on scene transition.',
    parameters: [
      { name: 'interval', type: 'string', description: 'Repeat interval (e.g., "500ms", "2s")' },
    ],
    example: `[TICK 500ms]
[SET productivity = productivity + 0.1]
[SET product = laborForce * productivity * (marginHeight / 100)]
[IF speculation > 70]
[EFFECT shake on stage]
[ENDIF]
[/TICK]`,
    implemented: true,
  },

  // ============ SPECIAL ============
  {
    type: 'COMMENT',
    category: 'flow',
    syntax: '# comment text  OR  // comment text',
    description: 'A comment line that is ignored during execution. Useful for notes and documentation.',
    parameters: [
      { name: 'text', type: 'string', description: 'Any comment text' },
    ],
    example: `# This is a comment
// This is also a comment`,
    implemented: true,
  },
  {
    type: 'UNKNOWN',
    category: 'flow',
    syntax: '(any unrecognized text)',
    description: 'Represents any line that could not be parsed. Skipped during execution.',
    parameters: [],
    example: 'some unrecognized command',
    implemented: true,
  },
];

// Category metadata for documentation
export const CATEGORY_INFO: Record<CommandDoc['category'], { title: string; description: string }> = {
  scene: {
    title: 'Scene Commands',
    description: 'Commands for transitioning between scenes and managing backgrounds.',
  },
  actor: {
    title: 'Actor Commands',
    description: 'Commands for controlling actor visibility, position, and appearance on stage.',
  },
  dialogue: {
    title: 'Dialogue Commands',
    description: 'Commands for displaying character dialogue and narration.',
  },
  audio: {
    title: 'Audio Commands',
    description: 'Commands for playing music, ambient sounds, and sound effects.',
  },
  button: {
    title: 'Button Commands',
    description: 'Commands for showing and hiding interactive buttons.',
  },
  choice: {
    title: 'Choice Commands',
    description: 'Commands for presenting branching narrative choices to the player.',
  },
  flow: {
    title: 'Flow Control',
    description: 'Commands for controlling script execution, variables, and conditionals.',
  },
  effect: {
    title: 'Effect Commands',
    description: 'Commands for applying and removing visual effects on actors and elements.',
  },
};

// ============ EDITOR AUTOCOMPLETE PALETTE ============
// The script editor's command palette, kept here (next to the docs) as
// the single source of truth. Order = display order in the editor.

export interface CommandAutocompleteEntry {
  type: ScriptCommandType;
  label: string;
  insertText: string;
  description: string;
}

export const COMMAND_AUTOCOMPLETE: CommandAutocompleteEntry[] = [
  { type: 'ENTER', label: 'ENTER', insertText: 'ENTER ', description: 'Make actor appear' },
  { type: 'EXIT', label: 'EXIT', insertText: 'EXIT ', description: 'Remove actor' },
  { type: 'MOVE', label: 'MOVE', insertText: 'MOVE ', description: 'Animate actor movement' },
  { type: 'POSE', label: 'POSE', insertText: 'POSE ', description: 'Change pose/expression' },
  { type: 'BGM', label: 'BGM:', insertText: 'BGM: ""', description: 'Play background music' },
  { type: 'AMBIENCE', label: 'AMBIENCE:', insertText: 'AMBIENCE: ""', description: 'Play ambient sound' },
  { type: 'SFX', label: 'SFX:', insertText: 'SFX: ""', description: 'Play sound effect' },
  { type: 'EFFECT', label: 'EFFECT', insertText: 'EFFECT ', description: 'Apply visual effect' },
  { type: 'CLEAR_EFFECT', label: 'CLEAR_EFFECT', insertText: 'CLEAR_EFFECT ', description: 'Remove effect' },
  { type: 'WAIT', label: 'WAIT', insertText: 'WAIT 1s]', description: 'Pause execution' },
  { type: 'SCENE', label: 'SCENE', insertText: 'SCENE ', description: 'Go to scene' },
  { type: 'BUTTON', label: 'BUTTON', insertText: 'BUTTON ', description: 'Show button' },
  { type: 'HIDE_BUTTON', label: 'HIDE_BUTTON', insertText: 'HIDE_BUTTON ', description: 'Hide button' },
  { type: 'SET', label: 'SET', insertText: 'SET ', description: 'Set variable (literal or expression)' },
  { type: 'IF', label: 'IF', insertText: 'IF ', description: 'Conditional block' },
  { type: 'TICK', label: 'TICK', insertText: 'TICK 1s]\n\n[/TICK', description: 'Repeating simulation block' },
  { type: 'CHOICE', label: 'CHOICE', insertText: 'CHOICE]\n- "Option" -> scene\n[/CHOICE', description: 'Present choices' },
];

// Validation helper: check if all command types are documented
export function validateDocumentation(): { missing: string[]; documented: string[] } {
  const allTypes: ScriptCommandType[] = [
    'DIALOGUE', 'ENTER', 'EXIT', 'MOVE', 'POSE',
    'BGM', 'AMBIENCE', 'SFX', 'EFFECT', 'CLEAR_EFFECT',
    'WAIT', 'SCENE', 'CHOICE', 'SET', 'IF', 'ENDIF', 'TICK',
    'BUTTON', 'HIDE_BUTTON', 'COMMENT', 'UNKNOWN'
  ];
  
  const documentedTypes = new Set(COMMAND_DOCS.map(doc => doc.type));
  const missing = allTypes.filter(type => !documentedTypes.has(type));
  const documented = allTypes.filter(type => documentedTypes.has(type));
  
  return { missing, documented };
}
