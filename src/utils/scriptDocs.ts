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
    description: 'Displays dialogue spoken by an actor. An optional acting tag switches the speaker\'s stage sprite (and portrait) to the matching graphic for this utterance: (Angry) picks any graphic with that expression; (Pointing/Angry) pins the exact pose too. Without a tag, speakers with multiple graphics auto-vary per utterance. Missing graphics warn and keep the current look. (thinking) renders as a thought balloon. Text supports {variable} interpolation against the live world state, resolved at speak time — numbers round to 1 decimal, unknown variables show ?? with a warning (the 1986 SAY_VAR, reborn).',
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
    syntax: '[MOVE actor_id to x,y over duration]  |  [MOVE actor_id to TARGET over duration]',
    description: 'Animates an actor moving to a new position over the specified duration. The destination may be literal coordinates, another stage element, or a named backdrop anchor — an object identified inside the backdrop art, like BOAT1 or RUBBER_TREE; unresolvable names warn and fall back to coordinates. Walk cycle: if the actor\'s graphics include poses named Walk1 and Walk2, the runner flips between those two frames every 250ms while the move is in flight, then restores the prior pose on arrival. Directional sets: when Walk1/Walk2 exist at several sprite angles (0=right, 45=down-right, 90=down, 135=down-left, 180=left, 225=up-left, 270=up, 315=up-right), the pair whose angle is nearest the travel direction is used. Actors without walk frames glide unchanged.',
    parameters: [
      { name: 'actor_id', type: 'string', description: 'The unique identifier of the actor' },
      { name: 'x', type: 'number', description: 'Target horizontal position (0-100)' },
      { name: 'y', type: 'number', description: 'Target vertical position (0-100)' },
      { name: 'duration', type: 'string', description: 'Animation duration (e.g., "2s", "500ms")', optional: true },
    ],
    example: '[MOVE detective to 50,50 over 1s]\n[MOVE witness to 25,50]\n[MOVE aldric to RUBBER_TREE over 3s]',
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
    syntax: '[CHOICE]  |  [CHOICE 10s -> fallback_scene]\n- "Option text" [(if condition)] -> target_scene [[SET var = value] ...]\n[/CHOICE]',
    description: 'Presents the player with branching dialogue options; each navigates to a scene. A single option is not a decision: it renders as a plain statement of what the player does and takes itself after a short reading pause. Options may carry a (if condition) gate — same grammar as IF — and only show when it holds; if every option is gated out, the choice is skipped with a warning. Options may carry trailing [SET ...] effects (a Narraton decision point), applied to in-scene or world variables at selection time, before the jump; the editor\'s test mode marks each option with the variables it twiddles. A timed header ([CHOICE 10s -> scene]) jumps to the fallback scene if the player hesitates.',
    parameters: [
      { name: 'options', type: 'array', description: 'List of choice options with text, optional gate, target scene, and optional SET effects' },
      { name: 'timeout', type: 'string', description: 'Optional header form: duration and fallback scene, e.g. [CHOICE 10s -> scene]' },
    ],
    example: `[CHOICE]
- "Investigate the desk" -> desk_scene
- "Bribe the clerk" (if gold >= 50) -> bribe_scene [SET gold -= 50] [SET suspicion += 10]
- "Leave the room" -> hallway
[/CHOICE]

[CHOICE 10s -> they_decide_for_you]
- "Give the order" -> burn_it [SET ruthless = ruthless + 1]
- "Stay your hand" -> spare_it
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
    syntax: '[SET variable = value_or_expression]  or  [SET variable += amount]  or  [SET variable -= amount]',
    description: 'Sets a variable. If the variable is declared in the scene\'s in-scene variables it stays scene-local, invisible to the Narraton selector and the meters, and resets when the scene is re-entered; otherwise it is world state that persists across scenes. += and -= increment or decrement a numeric variable (missing or non-numeric values count as 0). The right side can be a literal (string, number, boolean) or an arithmetic expression over other variables. Expressions support + - * / ( ), numeric literals, variable names, and the functions clamp(x,min,max), min(...), max(...), abs(x), floor(x), rand() (0 to 1), rand(max) (0 to max), rand(min,max). A bare variable name copies that variable\'s value. Bad expressions and unknown variables resolve to 0 with a console warning — scripts never crash.',
    parameters: [
      { name: 'variable', type: 'string', description: 'The variable name (alphanumeric, no spaces)' },
      { name: 'operator', type: 'string', description: '= to assign, += to add, -= to subtract' },
      { name: 'value', type: 'any', description: 'A literal (string, number, boolean) or an arithmetic expression' },
    ],
    example: `[SET hasKey = true]
[SET visitCount = 3]
[SET playerName = "Alex"]
[SET product = laborForce * productivity]
[SET wages = max(product - rent, survivalFloor)]
[SET rent = clamp(product * rentShare, 0, product)]
[SET boss_rep += 10]
[SET gang_morale -= 5]`,
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
    type: 'TWEEN',
    category: 'actor',
    syntax: '[TWEEN element.property to value over duration]',
    description: 'Animates any numeric element property to a target value: scale, rotation, opacity, x, y, zIndex. Like MOVE but for everything else — grow the billionaire as his hoard rises, fade a ghost in, tip a falling tower. Non-blocking: the script continues immediately (follow with WAIT to hold for the animation). Unknown properties are ignored with a warning.',
    parameters: [
      { name: 'element', type: 'string', description: 'Stage element id' },
      { name: 'property', type: 'string', description: 'scale | rotation | opacity | x | y | zIndex' },
      { name: 'value', type: 'number', description: 'Target value' },
      { name: 'duration', type: 'string', description: 'Animation duration (default 1s)' },
    ],
    example: '[TWEEN billionaire.scale to 3 over 2s]\n[TWEEN ghost.opacity to 0 over 1.5s]\n[TWEEN tower.rotation to 75 over 3s]',
    implemented: true,
  },
  {
    type: 'BACKDROP',
    category: 'actor',
    syntax: '[BACKDROP drop_id [over duration]]',
    description: 'Swaps the scene backdrop without changing scenes, crossfading over the given duration (instant when omitted). Day to night, before and after the fire, the same room ten years later. Unknown drop ids warn and keep the current backdrop.',
    parameters: [
      { name: 'drop_id', type: 'string', description: 'Id of a drop in the game' },
      { name: 'duration', type: 'string', description: 'Crossfade duration (default instant)' },
    ],
    example: '[BACKDROP wm_village_burnt over 2s]',
    implemented: true,
  },
  {
    type: 'FRAME',
    category: 'actor',
    syntax: '[FRAME fun|scary|sad|still]',
    description: 'Makes the CABINET around the stage react for a beat — a shudder and cold desaturation at something frightening, a warm swell at something good, a slow grieving dim. Use it sparingly: the frame is still almost all the time, and that stillness is what makes the exceptions land. [FRAME still] clears it. Suppressed entirely under reduced motion; an unknown mood is ignored.',
    parameters: [
      { name: 'mood', type: 'string', description: 'fun | scary | sad | still' },
    ],
    example: '[FRAME scary]\n[FRAME fun]\n[FRAME still]',
    implemented: true,
  },
  {
    type: 'ANIMATE',
    category: 'actor',
    syntax: '[ANIMATE element Pose1 Pose2 ... [every duration] [repeat n]]',
    description: 'Loops an element through named pose frames — embroidered flames flickering, a bird flapping across the sky, a machine pumping. Unlike the walk cycle this is not tied to movement: it runs until stopped or the scene changes. Non-blocking; the script continues immediately. Default 200ms per frame; omit "repeat" to loop forever. A second ANIMATE on the same element replaces the first rather than stacking. Under reduced-motion the first frame shows and holds.',
    parameters: [
      { name: 'element', type: 'string', description: 'Stage element id' },
      { name: 'poses', type: 'string', description: 'Two or more pose names, in cycle order' },
      { name: 'duration', type: 'string', description: 'Time per frame (default 200ms)', optional: true },
      { name: 'n', type: 'number', description: 'Number of full cycles; omitted means forever', optional: true },
    ],
    example: '[ANIMATE granary_fire Flame1 Flame2 Flame3 every 180ms]\n[ANIMATE gull Wings_Up Wings_Down every 250ms]\n[ANIMATE door Shut Ajar Open every 400ms repeat 1]',
    implemented: true,
  },
  {
    type: 'STOP_ANIMATE',
    category: 'actor',
    syntax: '[STOP_ANIMATE element]  |  [ANIMATE element off]',
    description: 'Stops a looping ANIMATE on an element, leaving it on whatever frame it reached. Scene changes stop every animation automatically, so this is only needed to stop one mid-scene.',
    parameters: [
      { name: 'element', type: 'string', description: 'Stage element id' },
    ],
    example: '[STOP_ANIMATE granary_fire]',
    implemented: true,
  },
  {
    type: 'FACE',
    category: 'actor',
    syntax: '[FACE element toward target]  |  [FACE element degrees]',
    description: 'Turns an actor to face something and snaps the sprite to the nearest directional graphic it actually has (this is facing, not mirroring — no flipped scars or sword hands). The target may be another stage element, an item on stage, or a named backdrop anchor — objects identified inside the backdrop art, like BOAT1 or RUBBER_TREE. Degrees are compass-style: 0 right, 90 down, 180 left, 270 up. Actors without directional art keep their current look, with a warning.',
    parameters: [
      { name: 'element', type: 'string', description: 'The stage element that turns' },
      { name: 'target', type: 'string', description: 'Element id or backdrop anchor id to face' },
      { name: 'degrees', type: 'number', description: 'Explicit facing angle instead of a target' },
    ],
    example: '[FACE aldric toward h_william]\n[FACE hereward toward BOAT1]\n[FACE crowd 270]',
    implemented: true,
  },
  {
    type: 'CAMERA',
    category: 'actor',
    syntax: '[CAMERA shot wide|closeup|two [on element] [over duration]]  |  [CAMERA zoom 1.5 [at x,y] [over duration]]  |  [CAMERA follow element]  |  [CAMERA reset]',
    description: 'Moves the camera over the stage. Named shots are the 1986 King of Chicago cuts: wide (full stage), two (a two-shot), closeup (push in) — add "on element" to center them. Free form takes an explicit zoom factor and optional focus point. "follow element" tracks a moving element continuously (pairs with MOVE walk cycles). "reset" returns to the full stage.',
    parameters: [
      { name: 'shot', type: 'string', description: 'wide | closeup | two | reset' },
      { name: 'element', type: 'string', description: 'Element to center on or follow' },
      { name: 'zoom', type: 'number', description: 'Free zoom factor (1 = full stage)' },
      { name: 'duration', type: 'string', description: 'Move duration (default 1s)' },
    ],
    example: '[CAMERA shot closeup on h_william over 1.5s]\n[CAMERA follow h_peasant]\n[CAMERA zoom 1.8 at 30,40 over 2s]\n[CAMERA reset over 1s]',
    implemented: true,
  },
  {
    type: 'LABEL',
    category: 'flow',
    syntax: '[LABEL name]',
    description: 'Marks a named jump target in the current scene\'s script. Does nothing on its own; GOTO jumps to it.',
    parameters: [
      { name: 'name', type: 'string', description: 'Label name (letters, digits, underscore)' },
    ],
    example: '[LABEL bargain]',
    implemented: true,
  },
  {
    type: 'GOTO',
    category: 'flow',
    syntax: '[GOTO name]',
    description: 'Jumps to [LABEL name] in the current scene — forwards or backwards. Good for retry loops and in-scene hubs without spinning up new scenes. Unknown labels warn and fall through. A GOTO chain that executes 10000 steps without yielding is stopped with a warning (runaway-loop guard). Not allowed inside TICK bodies.',
    parameters: [
      { name: 'name', type: 'string', description: 'The label to jump to' },
    ],
    example: '[LABEL haggle]\nMerchant: "Best I can do."\n[CHOICE]\n- "Push harder" -> this_scene\n[/CHOICE]\n[GOTO haggle]',
    implemented: true,
  },
  {
    type: 'RANDOM',
    category: 'flow',
    syntax: '[RANDOM]\n...branch...\n[OR]\n...branch...\n[/RANDOM]',
    description: 'Plays exactly one branch, chosen uniformly at random each time the block executes (the 1986 RNDSWITCH). Branches are separated by [OR] lines. Use it to keep repeated visits fresh — wrap alternate phrasings of a reply, or alternate small events. Nests inside IF/TICK and may contain them.',
    parameters: [],
    example: `[RANDOM]
Boss: "You're doin a great job, Ben."
[OR]
Boss: "That's swell."
[OR]
Boss: "Can't we do any better?"
[/RANDOM]`,
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
    description: 'Yields flow control to the Narraton selector (the 1986 King of Chicago storyteller). Candidates are every scene whose POOL names this pool. Hard gates (REQUIRES), play history (a scene plays once unless REPEATABLE), subplot PHASE order (MIDDLE waits for its subplot\'s BEGINNING, END for MIDDLE) and the story ACT gate (read from the `act` world variable; soft, dropped when nothing fits) filter the pool. Each survivor scores the least-squares distance of its KEY from the world state: sum over keys of ((current - target) x 100 / scale)^2, where scale is the variable\'s range (KEY SCALE, default 100), divided by the scene\'s WEIGHT, plus a rotation penalty when the scene belongs to the subplot that just played. A miss of more than half a key\'s scale excludes the scene. Lowest wins; exact ties break randomly. Metadata lives on the scene (the scene editor\'s Narraton panel; phase and subplot also in the Narraton tab). Every decision (candidates, gates, per-key deltas, scores, winner) is logged to the console. If no scene is eligible, the script continues past the command with a warning.',
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
    type: 'NARRATE',
    category: 'dialogue',
    syntax: '[NARRATE "text" [for duration]]',
    description: 'Says something WITHOUT waiting for a click — the one speech form allowed inside a TICK body, so a running simulation can describe itself. The line appears at the foot of the stage, is announced to screen readers, and clears itself after the duration (default 4s). Supports {variable} interpolation. Consecutive identical lines are suppressed, so a 1s tick can narrate a standing condition without flooding. Use it to explain what a change MEANS as the model propagates it, and as the audio-description channel for blind players.',
    parameters: [
      { name: 'text', type: 'string', description: 'The line to narrate; {variables} interpolate' },
      { name: 'duration', type: 'string', description: 'How long it stays up (default 4s)', optional: true },
    ],
    example: `[TICK 3s]
[SET hoard = hoard + squeeze * 0.4]
[IF hoard > 70]
[NARRATE "The hoard swells to {hoard}. Upstairs, nothing is spent; downstairs, the rent still comes due." for 6s]
[ENDIF]
[/TICK]`,
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
  { type: 'RANDOM', label: 'RANDOM', insertText: 'RANDOM]\n\n[OR]\n\n[/RANDOM', description: 'Play one branch at random' },
  { type: 'TWEEN', label: 'TWEEN', insertText: 'TWEEN ', description: 'Animate scale/rotation/opacity/position' },
  { type: 'BACKDROP', label: 'BACKDROP', insertText: 'BACKDROP ', description: 'Crossfade the backdrop mid-scene' },
  { type: 'FRAME', label: 'FRAME', insertText: 'FRAME ', description: 'The cabinet reacts for a beat' },
  { type: 'ANIMATE', label: 'ANIMATE', insertText: 'ANIMATE ', description: 'Loop an element through pose frames' },
  { type: 'STOP_ANIMATE', label: 'STOP_ANIMATE', insertText: 'STOP_ANIMATE ', description: 'Stop a looping animation' },
  { type: 'FACE', label: 'FACE', insertText: 'FACE ', description: 'Turn an actor to face a target' },
  { type: 'CAMERA', label: 'CAMERA', insertText: 'CAMERA ', description: 'Shots, zoom, pan, follow' },
  { type: 'LABEL', label: 'LABEL', insertText: 'LABEL ', description: 'Named jump target' },
  { type: 'GOTO', label: 'GOTO', insertText: 'GOTO ', description: 'Jump to a label in this scene' },
  { type: 'TICK', label: 'TICK', insertText: 'TICK 1s]\n\n[/TICK', description: 'Repeating simulation block' },
  { type: 'BIND', label: 'BIND', insertText: 'BIND ', description: 'Drive element property from expression' },
  { type: 'UNBIND', label: 'UNBIND', insertText: 'UNBIND ', description: 'Release a bound property' },
  { type: 'SLIDER', label: 'SLIDER', insertText: 'SLIDER ', description: 'Interactive variable slider' },
  { type: 'GAUGE', label: 'GAUGE', insertText: 'GAUGE ', description: 'Read-only variable dial' },
  { type: 'HIDE_SLIDER', label: 'HIDE_SLIDER', insertText: 'HIDE_SLIDER ', description: 'Hide a slider' },
  { type: 'HIDE_GAUGE', label: 'HIDE_GAUGE', insertText: 'HIDE_GAUGE ', description: 'Hide a gauge' },
  { type: 'NARRATON', label: 'NARRATON', insertText: 'NARRATON pool=main]', description: 'Let the storyteller pick the next scene' },
  { type: 'NARRATE', label: 'NARRATE', insertText: 'NARRATE ""', description: 'Non-blocking narration (works in TICK)' },
  { type: 'SET_TEXT', label: 'SET_TEXT', insertText: 'SET_TEXT ', description: 'Set element text ({var} interpolates)' },
  { type: 'AUTOPLAY', label: 'AUTOPLAY', insertText: 'AUTOPLAY on]', description: 'Toggle dialogue auto-advance' },
  { type: 'CHOICE', label: 'CHOICE', insertText: 'CHOICE]\n- "Option" -> scene\n[/CHOICE', description: 'Present choices (gates, effects, timeout)' },
];

// Validation helper: check if all command types are documented
export function validateDocumentation(): { missing: string[]; documented: string[] } {
  const allTypes: ScriptCommandType[] = [
    'DIALOGUE', 'ENTER', 'EXIT', 'MOVE', 'POSE', 'TWEEN', 'FRAME', 'ANIMATE', 'STOP_ANIMATE', 'BACKDROP', 'FACE', 'CAMERA',
    'BGM', 'AMBIENCE', 'SFX', 'EFFECT', 'CLEAR_EFFECT',
    'WAIT', 'SCENE', 'CHOICE', 'SET', 'IF', 'ELSEIF', 'ELSE', 'ENDIF', 'RANDOM', 'LABEL', 'GOTO', 'TICK',
    'BIND', 'UNBIND',
    'SLIDER', 'GAUGE', 'HIDE_SLIDER', 'HIDE_GAUGE',
    'NARRATON', 'SET_TEXT', 'NARRATE', 'AUTOPLAY',
    'BUTTON', 'HIDE_BUTTON', 'COMMENT', 'UNKNOWN'
  ];
  
  const documentedTypes = new Set(COMMAND_DOCS.map(doc => doc.type));
  const missing = allTypes.filter(type => !documentedTypes.has(type));
  const documented = allTypes.filter(type => documentedTypes.has(type));
  
  return { missing, documented };
}
