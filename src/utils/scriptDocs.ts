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
  category: 'scene' | 'actor' | 'dialogue' | 'audio' | 'button' | 'choice' | 'flow' | 'effect' | 'instrument';
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
    syntax: 'ACTOR_NAME: "text"  |  ACTOR_NAME (Expression): "text"  |  ACTOR_NAME (Pose/Expression): "text"  |  ACTOR_NAME (thinking): "text"',
    description: 'Displays dialogue spoken by an actor. An optional acting tag switches the speaker\'s stage sprite (and portrait) to the matching graphic for this utterance: (Angry) picks any graphic with that expression; (Pointing/Angry) pins the exact pose too. Without a tag, speakers with multiple graphics auto-vary per utterance. Missing graphics warn and keep the current look. (thinking) renders as a thought balloon.',
    parameters: [
      { name: 'actorName', type: 'string', description: 'The name of the speaking actor (case-sensitive, starts with uppercase)' },
      { name: 'acting tag', type: 'string', description: 'Optional: thinking, an Expression, or Pose/Expression — must match a graphic in the actor\'s pose library', optional: true },
      { name: 'text', type: 'string', description: 'The dialogue text to display (in quotes)' },
    ],
    example: `Detective: "I've seen things you wouldn't believe."
Detective (Angry): "You lied to me."
Detective (Pointing/Angry): "It was YOU."
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
    description: 'Animates an actor moving to a new position over the specified duration. Walk cycle: if the actor\'s graphics include poses named Walk1 and Walk2, the runner flips between those two frames every 250ms while the move is in flight, then restores the prior pose on arrival. Directional sets: when Walk1/Walk2 exist at several sprite angles (0=right, 45=down-right, 90=down, 135=down-left, 180=left, 225=up-left, 270=up, 315=up-right), the pair whose angle is nearest the travel direction is used. Actors without walk frames glide unchanged.',
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

  {
    type: 'BIND',
    category: 'effect',
    syntax: '[BIND element_id.property to expression]',
    description: 'Live-binds a stage element property to an expression over world state variables. The binding re-evaluates whenever variables change (SET, TICK, sliders), driving the element continuously. Bindable properties: x, y, scale, rotation, opacity, zIndex. Bindings clear on scene change. Bad expressions evaluate to 0 with a console warning.',
    parameters: [
      { name: 'element_id', type: 'string', description: 'The ID of the stage element to drive' },
      { name: 'property', type: 'string', description: 'One of: x, y, scale, rotation, opacity, zIndex' },
      { name: 'expression', type: 'string', description: 'Arithmetic expression (same grammar as SET)' },
    ],
    example: `[BIND siphon_arm.rotation to rent * 0.9]
[BIND reservoir.scale to 0.5 + hoard / 200]
[BIND margin_floor.y to 80 - marginHeight]
[BIND prestige_shell.opacity to prestige / 100]`,
    implemented: true,
  },
  {
    type: 'UNBIND',
    category: 'effect',
    syntax: '[UNBIND element_id.property]',
    description: 'Releases a property binding created with BIND. The element keeps its last driven value.',
    parameters: [
      { name: 'element_id', type: 'string', description: 'The ID of the stage element' },
      { name: 'property', type: 'string', description: 'The bound property to release' },
    ],
    example: '[UNBIND siphon_arm.rotation]',
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

  // ============ INSTRUMENT COMMANDS ============
  {
    type: 'SLIDER',
    category: 'instrument',
    syntax: '[SLIDER variable at x,y min=0 max=100 step=1 label="TEXT"]',
    description: 'Shows an interactive slider that writes its worldState variable continuously as the player drags. Position is a percentage of the stage. min/max default to 0/100, step to 1; label defaults to the variable name. Dragging re-evaluates BINDs immediately, so sliders drive the stage live.',
    parameters: [
      { name: 'variable', type: 'string', description: 'The worldState variable the slider writes' },
      { name: 'x', type: 'number', description: 'Horizontal position (0-100, percentage from left)' },
      { name: 'y', type: 'number', description: 'Vertical position (0-100, percentage from top)' },
      { name: 'min', type: 'number', description: 'Minimum value (default 0)', optional: true },
      { name: 'max', type: 'number', description: 'Maximum value (default 100)', optional: true },
      { name: 'step', type: 'number', description: 'Drag increment (default 1)', optional: true },
      { name: 'label', type: 'string', description: 'Panel label (default: variable name)', optional: true },
    ],
    example: '[SLIDER greed at 85,20 min=0 max=100 label="GREED"]\n[SLIDER rentShare at 85,35 min=0 max=1 step=0.05 label="RENT SHARE"]',
    implemented: true,
  },
  {
    type: 'GAUGE',
    category: 'instrument',
    syntax: '[GAUGE variable at x,y min=0 max=100 label="TEXT"]',
    description: 'Shows a read-only dial displaying one worldState variable, updating live as the variable changes (SET, TICK, sliders).',
    parameters: [
      { name: 'variable', type: 'string', description: 'The worldState variable the gauge displays' },
      { name: 'x', type: 'number', description: 'Horizontal position (0-100, percentage from left)' },
      { name: 'y', type: 'number', description: 'Vertical position (0-100, percentage from top)' },
      { name: 'min', type: 'number', description: 'Dial minimum (default 0)', optional: true },
      { name: 'max', type: 'number', description: 'Dial maximum (default 100)', optional: true },
      { name: 'label', type: 'string', description: 'Panel label (default: variable name)', optional: true },
    ],
    example: '[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]',
    implemented: true,
  },
  {
    type: 'HIDE_SLIDER',
    category: 'instrument',
    syntax: '[HIDE_SLIDER variable]',
    description: 'Hides the slider bound to the given variable.',
    parameters: [
      { name: 'variable', type: 'string', description: 'The variable whose slider to hide' },
    ],
    example: '[HIDE_SLIDER greed]',
    implemented: true,
  },
  {
    type: 'HIDE_GAUGE',
    category: 'instrument',
    syntax: '[HIDE_GAUGE variable]',
    description: 'Hides the gauge bound to the given variable.',
    parameters: [
      { name: 'variable', type: 'string', description: 'The variable whose gauge to hide' },
    ],
    example: '[HIDE_GAUGE wages]',
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
    description: 'Sets a world state variable that persists across scenes. The right side can be a literal (string, number, boolean) or an arithmetic expression over other variables. Expressions support + - * / ( ), numeric literals, variable names, and the functions clamp(x,min,max), min(...), max(...), abs(x), floor(x), rand() (0 to 1), rand(max) (0 to max), rand(min,max). A bare variable name copies that variable\'s value. Bad expressions and unknown variables resolve to 0 with a console warning — scripts never crash.',
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
    type: 'ELSEIF',
    category: 'flow',
    syntax: '[ELSEIF condition]',
    description: 'Adds another conditional arm to an IF block: tried in order after the IF (and any earlier ELSEIFs) fail. Same condition grammar as IF. Must appear between [IF] and [ENDIF].',
    parameters: [
      { name: 'lhs', type: 'string', description: 'The variable to check, or an arithmetic expression' },
      { name: 'operator', type: 'string', description: 'Comparison operator: ==, !=, >, <, >=, <=' },
      { name: 'rhs', type: 'any', description: 'A literal, variable, or arithmetic expression to compare against' },
    ],
    example: `[IF heat > 80]
Narrator: "The city is burning."
[ELSEIF heat > 50]
Narrator: "The streets simmer."
[ELSE]
Narrator: "An uneasy calm."
[ENDIF]`,
    implemented: true,
  },
  {
    type: 'ELSE',
    category: 'flow',
    syntax: '[ELSE]',
    description: 'The fallback arm of an IF block: runs when the IF condition and every ELSEIF fail. Must appear between [IF] and [ENDIF], after any ELSEIFs.',
    parameters: [],
    example: `[IF singleTax == 1]
Narrator: "Rent flows to everyone."
[ELSE]
Narrator: "Rent flows to the landlord."
[ENDIF]`,
    implemented: true,
  },
  {
    type: 'ENDIF',
    category: 'flow',
    syntax: '[ENDIF]',
    description: 'Marks the end of an IF conditional block (including any ELSEIF/ELSE arms).',
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

  {
    type: 'NARRATON',
    category: 'flow',
    syntax: '[NARRATON pool=pool_name]',
    description: 'Yields flow control to the Narraton selector (the 1986 King of Chicago storyteller). It gathers every scene whose Narraton metadata names this pool, filters by hard requirements, play history (non-repeatable scenes play once), and subplot rotation (one scene per subplot, in order), then transitions to the survivor whose keys least-squares match the current world state: score = sum of ((current - target) / scale)^2 per key, divided by the scene\'s weight; lowest wins, exact ties break randomly. Scene metadata is set in the scene editor. Every selection decision (candidate pool, gates, per-key deltas, scores, winner) is logged to the console. If no scene is eligible, the script continues past the command with a warning.',
    parameters: [
      { name: 'pool', type: 'string', description: 'The selection pool to draw from (default: main)', optional: true },
    ],
    example: `# Let the storyteller pick what happens next
[NARRATON pool=main]

# Era-specific pool
[NARRATON pool=era2_extraction]`,
    implemented: true,
  },

  {
    type: 'SET_TEXT',
    category: 'effect',
    syntax: '[SET_TEXT element_id "text"]',
    description: 'Sets a stage element\'s text (balloons: news tickers, signs, counters). {variable} placeholders interpolate current worldState values at display time — numbers round to one decimal. Typically driven from a TICK body to make a live, non-blocking news readout. Repeated identical updates are free.',
    parameters: [
      { name: 'element_id', type: 'string', description: 'The ID of the stage element (usually a BALLOON)' },
      { name: 'text', type: 'string', description: 'The text to display; {varName} interpolates worldState' },
    ],
    example: `[SET_TEXT news_ticker "WAGES FALL TO {wages} — RENT CLIMBS TO {rent}"]
[IF crisis == 1]
[SET_TEXT news_ticker "PANIC! MARKETS SEIZE — PRODUCT HALVED"]
[ENDIF]`,
    implemented: true,
  },
  {
    type: 'AUTOPLAY',
    category: 'flow',
    syntax: '[AUTOPLAY on|off]',
    description: 'Turns dialogue auto-advance on or off from script. Use for autopilot modes where the episode plays itself; the player can still toggle manually.',
    parameters: [
      { name: 'state', type: 'string', description: 'on or off' },
    ],
    example: '[AUTOPLAY on]\n[SCENE the_machine]',
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
  instrument: {
    title: 'Instrument Commands',
    description: 'Interactive sliders and read-only gauges wired to world state variables — the instrument panel.',
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
  { type: 'ELSEIF', label: 'ELSEIF', insertText: 'ELSEIF ', description: 'Additional conditional arm' },
  { type: 'ELSE', label: 'ELSE', insertText: 'ELSE]', description: 'Fallback arm of an IF' },
  { type: 'TICK', label: 'TICK', insertText: 'TICK 1s]\n\n[/TICK', description: 'Repeating simulation block' },
  { type: 'BIND', label: 'BIND', insertText: 'BIND ', description: 'Drive element property from expression' },
  { type: 'UNBIND', label: 'UNBIND', insertText: 'UNBIND ', description: 'Release a bound property' },
  { type: 'SLIDER', label: 'SLIDER', insertText: 'SLIDER ', description: 'Interactive variable slider' },
  { type: 'GAUGE', label: 'GAUGE', insertText: 'GAUGE ', description: 'Read-only variable dial' },
  { type: 'HIDE_SLIDER', label: 'HIDE_SLIDER', insertText: 'HIDE_SLIDER ', description: 'Hide a slider' },
  { type: 'HIDE_GAUGE', label: 'HIDE_GAUGE', insertText: 'HIDE_GAUGE ', description: 'Hide a gauge' },
  { type: 'NARRATON', label: 'NARRATON', insertText: 'NARRATON pool=main]', description: 'Let the storyteller pick the next scene' },
  { type: 'SET_TEXT', label: 'SET_TEXT', insertText: 'SET_TEXT ', description: 'Set element text ({var} interpolates)' },
  { type: 'AUTOPLAY', label: 'AUTOPLAY', insertText: 'AUTOPLAY on]', description: 'Toggle dialogue auto-advance' },
  { type: 'CHOICE', label: 'CHOICE', insertText: 'CHOICE]\n- "Option" -> scene\n[/CHOICE', description: 'Present choices' },
];

// Validation helper: check if all command types are documented
export function validateDocumentation(): { missing: string[]; documented: string[] } {
  const allTypes: ScriptCommandType[] = [
    'DIALOGUE', 'ENTER', 'EXIT', 'MOVE', 'POSE',
    'BGM', 'AMBIENCE', 'SFX', 'EFFECT', 'CLEAR_EFFECT',
    'WAIT', 'SCENE', 'CHOICE', 'SET', 'IF', 'ELSEIF', 'ELSE', 'ENDIF', 'TICK',
    'BIND', 'UNBIND',
    'SLIDER', 'GAUGE', 'HIDE_SLIDER', 'HIDE_GAUGE',
    'NARRATON', 'SET_TEXT', 'AUTOPLAY',
    'BUTTON', 'HIDE_BUTTON', 'COMMENT', 'UNKNOWN'
  ];
  
  const documentedTypes = new Set(COMMAND_DOCS.map(doc => doc.type));
  const missing = allTypes.filter(type => !documentedTypes.has(type));
  const documented = allTypes.filter(type => documentedTypes.has(type));
  
  return { missing, documented };
}
