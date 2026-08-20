# DRAM Script Language Reference

**Version:** 1.0

DRAM Script is the scripting language used by Dramaton to control narrative flow, scene transitions, character dialogue, and interactive elements in visual novel-style games.

> **Note:** This document is auto-generated from `src/utils/scriptDocs.ts`. Do not edit directly.

---

## Table of Contents

1. [Overview](#overview)
2. [Basic Syntax](#basic-syntax)
3. [Commands](#commands)
   - [Scene Commands](#scene-commands)
   - [Actor Commands](#actor-commands)
   - [Dialogue Commands](#dialogue-commands)
   - [Audio Commands](#audio-commands)
   - [Effect Commands](#effect-commands)
   - [Button Commands](#button-commands)
   - [Instrument Commands](#instrument-commands)
   - [Choice Commands](#choice-commands)
   - [Flow Control](#flow-control)
4. [Examples](#examples)
5. [Best Practices](#best-practices)

---

## Overview

DRAM Script files are plain text scripts that define the sequence of events in a Dramaton game. Each line represents a single command that the engine executes in order during playback.

Scripts are attached to **Scenes** and executed when that scene is active. The script runner processes commands sequentially, with some commands (like CHOICE) pausing for user input.

---

## Basic Syntax

- One command per line
- Bracketed commands use `[COMMAND ...]` format
- Dialogue uses `ACTOR_NAME: "text"` format
- Comments start with `#` or `//`
- Blank lines are ignored
- Arguments can include strings (in quotes), numbers, and flags

```
[COMMAND argument1 argument2]
ACTOR_NAME: "dialogue text"
# This is a comment
```

---

## Commands

### Scene Commands

Commands for transitioning between scenes and managing backgrounds.

#### `SCENE`

Transitions to a different scene immediately.

**Syntax:**
```
[SCENE scene_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `scene_id` | string | The unique identifier of the target scene |

**Example:**
```
[SCENE forest_clearing]
[SCENE chapter2_intro]
```

---

### Actor Commands

Commands for controlling actor visibility, position, and appearance on stage.

#### `ENTER`

Makes an actor appear on stage at the specified position (percentage of stage dimensions).

**Syntax:**
```
[ENTER actor_id at x,y]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `actor_id` | string | The unique identifier of the actor |
| `x` | number | Horizontal position (0-100, percentage from left) |
| `y` | number | Vertical position (0-100, percentage from top) |

**Example:**
```
[ENTER detective at 25,50]
[ENTER witness at 75,50]
```

#### `EXIT`

Removes an actor from the stage.

**Syntax:**
```
[EXIT actor_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `actor_id` | string | The unique identifier of the actor to remove |

**Example:**
```
[EXIT detective]
```

#### `MOVE`

Animates an actor moving to a new position over the specified duration. Walk cycle: if the actor's graphics include poses named Walk1 and Walk2, the runner flips between those two frames every 250ms while the move is in flight, then restores the prior pose on arrival. Directional sets: when Walk1/Walk2 exist at several sprite angles (0=right, 45=down-right, 90=down, 135=down-left, 180=left, 225=up-left, 270=up, 315=up-right), the pair whose angle is nearest the travel direction is used. Actors without walk frames glide unchanged.

**Syntax:**
```
[MOVE actor_id to x,y over duration]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `actor_id` | string | The unique identifier of the actor |
| `x` | number | Target horizontal position (0-100) |
| `y` | number | Target vertical position (0-100) |
| `duration` | string | Animation duration (e.g., "2s", "500ms") *(optional)* |

**Example:**
```
[MOVE detective to 50,50 over 1s]
[MOVE witness to 25,50]
```

#### `POSE`

Changes an actor's pose and/or expression.

**Syntax:**
```
[POSE actor_id pose=PoseName expression=ExpressionName]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `actor_id` | string | The unique identifier of the actor |
| `pose` | string | The pose name to switch to *(optional)* |
| `expression` | string | The expression name to display *(optional)* |

**Example:**
```
[POSE detective pose=Thinking expression=Worried]
[POSE witness expression=Happy]
```

---

### Dialogue Commands

Commands for displaying character dialogue and narration.

#### `DIALOGUE`

Displays dialogue spoken by an actor. An optional acting tag switches the speaker's stage sprite (and portrait) to the matching graphic for this utterance: (Angry) picks any graphic with that expression; (Pointing/Angry) pins the exact pose too. Without a tag, speakers with multiple graphics auto-vary per utterance. Missing graphics warn and keep the current look. (thinking) renders as a thought balloon. Text supports {variable} interpolation against the live world state, resolved at speak time — numbers round to 1 decimal, unknown variables show ?? with a warning (the 1986 SAY_VAR, reborn).

**Syntax:**
```
ACTOR_NAME: "text"  |  ACTOR_NAME (Expression): "text"  |  ACTOR_NAME (Pose/Expression): "text"  |  ACTOR_NAME (thinking): "text"
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `actorName` | string | The name of the speaking actor (case-sensitive, starts with uppercase) |
| `acting tag` | string | Optional: thinking, an Expression, or Pose/Expression — must match a graphic in the actor's pose library *(optional)* |
| `text` | string | The dialogue text to display (in quotes) |

**Example:**
```
Detective: "I've seen things you wouldn't believe."
Detective (Angry): "You lied to me."
Detective (Pointing/Angry): "It was YOU."
Narrator: "The rain continued to fall."
Alice (thinking): "What should I do next?"
```

---

### Audio Commands

Commands for playing music, ambient sounds, and sound effects.

#### `BGM`

Plays background music. Can loop and set volume.

**Syntax:**
```
[BGM: "track_name" loop vol=XX%]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `track_name` | string | Name or ID of the music track |
| `loop` | flag | Add "loop" to repeat the track *(optional)* |
| `vol` | percentage | Volume level (0-100%) *(optional)* |

**Example:**
```
[BGM: "noir_jazz" loop vol=70%]
[BGM: "tension" vol=50%]
```

#### `AMBIENCE`

Plays ambient background sounds (rain, crowd noise, etc.).

**Syntax:**
```
[AMBIENCE: "track_name" loop vol=XX%]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `track_name` | string | Name or ID of the ambient track |
| `loop` | flag | Add "loop" to repeat the track *(optional)* |
| `vol` | percentage | Volume level (0-100%) *(optional)* |

**Example:**
```
[AMBIENCE: "city_rain" loop vol=40%]
```

#### `SFX`

Plays a one-shot sound effect.

**Syntax:**
```
[SFX: "effect_name" vol=XX%]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `effect_name` | string | Name or ID of the sound effect |
| `vol` | percentage | Volume level (0-100%) *(optional)* |

**Example:**
```
[SFX: "door_slam"]
[SFX: "thunder" vol=80%]
```

---

### Effect Commands

Commands for applying and removing visual effects on actors and elements.

#### `EFFECT`

Applies a visual effect (shader, filter, animation) to an actor or element.

**Syntax:**
```
[EFFECT sfx_id on target_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `sfx_id` | string | The ID of the SFX/effect to apply |
| `target_id` | string | The ID of the actor or element to affect |

**Example:**
```
[EFFECT glow on detective]
[EFFECT shake on stage]
```

#### `CLEAR_EFFECT`

Removes a previously applied visual effect from an actor or element.

**Syntax:**
```
[CLEAR_EFFECT sfx_id from target_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `sfx_id` | string | The ID of the SFX/effect to remove |
| `target_id` | string | The ID of the actor or element |

**Example:**
```
[CLEAR_EFFECT glow from detective]
```

#### `BIND`

Live-binds a stage element property to an expression over world state variables. The binding re-evaluates whenever variables change (SET, TICK, sliders), driving the element continuously. Bindable properties: x, y, scale, rotation, opacity, zIndex. Bindings clear on scene change. Bad expressions evaluate to 0 with a console warning.

**Syntax:**
```
[BIND element_id.property to expression]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `element_id` | string | The ID of the stage element to drive |
| `property` | string | One of: x, y, scale, rotation, opacity, zIndex |
| `expression` | string | Arithmetic expression (same grammar as SET) |

**Example:**
```
[BIND siphon_arm.rotation to rent * 0.9]
[BIND reservoir.scale to 0.5 + hoard / 200]
[BIND margin_floor.y to 80 - marginHeight]
[BIND prestige_shell.opacity to prestige / 100]
```

#### `UNBIND`

Releases a property binding created with BIND. The element keeps its last driven value.

**Syntax:**
```
[UNBIND element_id.property]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `element_id` | string | The ID of the stage element |
| `property` | string | The bound property to release |

**Example:**
```
[UNBIND siphon_arm.rotation]
```

#### `SET_TEXT`

Sets a stage element's text (balloons: news tickers, signs, counters). {variable} placeholders interpolate current worldState values at display time — numbers round to one decimal. Typically driven from a TICK body to make a live, non-blocking news readout. Repeated identical updates are free.

**Syntax:**
```
[SET_TEXT element_id "text"]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `element_id` | string | The ID of the stage element (usually a BALLOON) |
| `text` | string | The text to display; {varName} interpolates worldState |

**Example:**
```
[SET_TEXT news_ticker "WAGES FALL TO {wages} — RENT CLIMBS TO {rent}"]
[IF crisis == 1]
[SET_TEXT news_ticker "PANIC! MARKETS SEIZE — PRODUCT HALVED"]
[ENDIF]
```

---

### Button Commands

Commands for showing and hiding interactive buttons.

#### `BUTTON`

Displays an interactive button on the stage. Buttons can navigate to scenes, play sounds, or open URLs.

**Syntax:**
```
[BUTTON button_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `button_id` | string | The unique identifier of the button to show |

**Example:**
```
[BUTTON examine_desk]
[BUTTON open_door]
```

#### `HIDE_BUTTON`

Hides and deactivates a previously shown button.

**Syntax:**
```
[HIDE_BUTTON button_id]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `button_id` | string | The unique identifier of the button to hide |

**Example:**
```
[HIDE_BUTTON examine_desk]
```

---

### Instrument Commands

Interactive sliders and read-only gauges wired to world state variables — the instrument panel.

#### `SLIDER`

Shows an interactive slider that writes its worldState variable continuously as the player drags. Position is a percentage of the stage. min/max default to 0/100, step to 1; label defaults to the variable name. Dragging re-evaluates BINDs immediately, so sliders drive the stage live.

**Syntax:**
```
[SLIDER variable at x,y min=0 max=100 step=1 label="TEXT"]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `variable` | string | The worldState variable the slider writes |
| `x` | number | Horizontal position (0-100, percentage from left) |
| `y` | number | Vertical position (0-100, percentage from top) |
| `min` | number | Minimum value (default 0) *(optional)* |
| `max` | number | Maximum value (default 100) *(optional)* |
| `step` | number | Drag increment (default 1) *(optional)* |
| `label` | string | Panel label (default: variable name) *(optional)* |

**Example:**
```
[SLIDER greed at 85,20 min=0 max=100 label="GREED"]
[SLIDER rentShare at 85,35 min=0 max=1 step=0.05 label="RENT SHARE"]
```

#### `GAUGE`

Shows a read-only dial displaying one worldState variable, updating live as the variable changes (SET, TICK, sliders).

**Syntax:**
```
[GAUGE variable at x,y min=0 max=100 label="TEXT"]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `variable` | string | The worldState variable the gauge displays |
| `x` | number | Horizontal position (0-100, percentage from left) |
| `y` | number | Vertical position (0-100, percentage from top) |
| `min` | number | Dial minimum (default 0) *(optional)* |
| `max` | number | Dial maximum (default 100) *(optional)* |
| `label` | string | Panel label (default: variable name) *(optional)* |

**Example:**
```
[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]
```

#### `HIDE_SLIDER`

Hides the slider bound to the given variable.

**Syntax:**
```
[HIDE_SLIDER variable]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `variable` | string | The variable whose slider to hide |

**Example:**
```
[HIDE_SLIDER greed]
```

#### `HIDE_GAUGE`

Hides the gauge bound to the given variable.

**Syntax:**
```
[HIDE_GAUGE variable]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `variable` | string | The variable whose gauge to hide |

**Example:**
```
[HIDE_GAUGE wages]
```

---

### Choice Commands

Commands for presenting branching narrative choices to the player.

#### `CHOICE`

Presents the player with branching dialogue options. Each option navigates to a different scene.

**Syntax:**
```
[CHOICE]
- "Option text" -> target_scene
[/CHOICE]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `options` | array | List of choice options with text and target scenes |

**Example:**
```
[CHOICE]
- "Investigate the desk" -> desk_scene
- "Talk to the witness" -> witness_scene
- "Leave the room" -> hallway
[/CHOICE]
```

---

### Flow Control

Commands for controlling script execution, variables, and conditionals.

#### `WAIT`

Pauses script execution for the specified duration.

**Syntax:**
```
[WAIT duration]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `duration` | string | Wait time (e.g., "2s", "500ms", or just "2" for seconds) |

**Example:**
```
[WAIT 2s]
[WAIT 500ms]
```

#### `SET`

Sets a world state variable that persists across scenes. The right side can be a literal (string, number, boolean) or an arithmetic expression over other variables. Expressions support + - * / ( ), numeric literals, variable names, and the functions clamp(x,min,max), min(...), max(...), abs(x), floor(x), rand() (0 to 1), rand(max) (0 to max), rand(min,max). A bare variable name copies that variable's value. Bad expressions and unknown variables resolve to 0 with a console warning — scripts never crash.

**Syntax:**
```
[SET variable = value_or_expression]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `variable` | string | The variable name (alphanumeric, no spaces) |
| `value` | any | A literal (string, number, boolean) or an arithmetic expression |

**Example:**
```
[SET hasKey = true]
[SET visitCount = 3]
[SET playerName = "Alex"]
[SET product = laborForce * productivity]
[SET wages = max(product - rent, survivalFloor)]
[SET rent = clamp(product * rentShare, 0, product)]
```

#### `IF`

Conditionally executes commands based on world state. The simple form compares one variable against a literal. Either side may also be an arithmetic expression (same grammar as SET), in which case both sides evaluate numerically. Booleans count as 1/0 in expressions.

**Syntax:**
```
[IF condition]
...commands...
[ENDIF]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `lhs` | string | The variable to check, or an arithmetic expression |
| `operator` | string | Comparison operator: ==, !=, >, <, >=, <= |
| `rhs` | any | A literal, variable, or arithmetic expression to compare against |

**Example:**
```
[IF hasKey == true]
Detective: "I can unlock this door now."
[ENDIF]

[IF wages < survivalFloor + 10]
Narrator: "The humans are starving."
[ENDIF]

[IF speculation * greed > 5000]
[EFFECT shake on stage]
[ENDIF]
```

#### `ELSEIF`

Adds another conditional arm to an IF block: tried in order after the IF (and any earlier ELSEIFs) fail. Same condition grammar as IF. Must appear between [IF] and [ENDIF].

**Syntax:**
```
[ELSEIF condition]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `lhs` | string | The variable to check, or an arithmetic expression |
| `operator` | string | Comparison operator: ==, !=, >, <, >=, <= |
| `rhs` | any | A literal, variable, or arithmetic expression to compare against |

**Example:**
```
[IF heat > 80]
Narrator: "The city is burning."
[ELSEIF heat > 50]
Narrator: "The streets simmer."
[ELSE]
Narrator: "An uneasy calm."
[ENDIF]
```

#### `ELSE`

The fallback arm of an IF block: runs when the IF condition and every ELSEIF fail. Must appear between [IF] and [ENDIF], after any ELSEIFs.

**Syntax:**
```
[ELSE]
```

**Example:**
```
[IF singleTax == 1]
Narrator: "Rent flows to everyone."
[ELSE]
Narrator: "Rent flows to the landlord."
[ENDIF]
```

#### `ENDIF`

Marks the end of an IF conditional block (including any ELSEIF/ELSE arms).

**Syntax:**
```
[ENDIF]
```

**Example:**
```
[ENDIF]
```

#### `TICK`

A repeating block: the body runs every interval while the scene is active, concurrent with (never blocking) normal script and dialogue flow. Use it as a simulation heartbeat — typically SETs and IFs updating world state. One TICK block per scene; extra blocks are ignored with a warning. Blocking commands (DIALOGUE, CHOICE, WAIT, nested TICK) are skipped inside a tick body with a warning. The tick keeps running after the scene script completes and stops on scene transition.

**Syntax:**
```
[TICK interval]
...commands...
[/TICK]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `interval` | string | Repeat interval (e.g., "500ms", "2s") |

**Example:**
```
[TICK 500ms]
[SET productivity = productivity + 0.1]
[SET product = laborForce * productivity * (marginHeight / 100)]
[IF speculation > 70]
[EFFECT shake on stage]
[ENDIF]
[/TICK]
```

#### `NARRATON`

Yields flow control to the Narraton selector (the 1986 King of Chicago storyteller). It gathers every scene whose Narraton metadata names this pool, filters by hard requirements, play history (non-repeatable scenes play once), and subplot rotation (one scene per subplot, in order), then transitions to the survivor whose keys least-squares match the current world state: score = sum of ((current - target) / scale)^2 per key, divided by the scene's weight; lowest wins, exact ties break randomly. Scene metadata is set in the scene editor. Every selection decision (candidate pool, gates, per-key deltas, scores, winner) is logged to the console. If no scene is eligible, the script continues past the command with a warning.

**Syntax:**
```
[NARRATON pool=pool_name]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pool` | string | The selection pool to draw from (default: main) *(optional)* |

**Example:**
```
# Let the storyteller pick what happens next
[NARRATON pool=main]

# Era-specific pool
[NARRATON pool=era2_extraction]
```

#### `AUTOPLAY`

Turns dialogue auto-advance on or off from script. Use for autopilot modes where the episode plays itself; the player can still toggle manually.

**Syntax:**
```
[AUTOPLAY on|off]
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `state` | string | on or off |

**Example:**
```
[AUTOPLAY on]
[SCENE the_machine]
```

#### `COMMENT`

A comment line that is ignored during execution. Useful for notes and documentation.

**Syntax:**
```
# comment text  OR  // comment text
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `text` | string | Any comment text |

**Example:**
```
# This is a comment
// This is also a comment
```

---

## Examples

### Simple Dialogue Scene

```
[ENTER detective at 50,50]
Detective: "Another late night at the precinct."
[WAIT 1s]
Detective: "The case files aren't going to solve themselves."
[SFX: "phone_ring"]
Detective: "Now what?"
```

### Scene with Choices

```
[ENTER guide at 50,50]
Guide: "Which path will you take?"
[CHOICE]
- "The mountain pass" -> mountain
- "The forest trail" -> forest
- "Return to town" -> town
[/CHOICE]
```

### Interactive Scene with Buttons

```
[BUTTON examine_desk]
[BUTTON check_window]
[BUTTON read_letter]
Narrator: "The office is quiet. What catches your attention?"
```

### Conditional Logic

```
[IF hasKey == true]
Player: "I can use this key on the locked door."
[SCENE locked_room]
[ENDIF]

[IF visitCount > 1]
Shopkeeper: "Back again? I remember you."
[ENDIF]
```

---

## Best Practices

1. **Use descriptive IDs**: `forest_night` is better than `scene_7`
2. **Keep dialogue concise**: Break long speeches into multiple lines
3. **Test frequently**: Use Theater mode to preview your scripts
4. **Comment your logic**: Add notes for complex branching with `#` comments
5. **Organize by act**: Group related scenes together
6. **Use consistent naming**: Stick to snake_case for IDs

---

## Implementation Status

✅ **32 commands documented**

---

*This document is auto-generated from the Dramaton source code.*
