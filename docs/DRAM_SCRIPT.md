# DRAM Script Language Reference

**Version:** 1.0  
**Last Updated:** 2026-01-18

DRAM Script is the scripting language used by Dramaton to control narrative flow, scene transitions, character dialogue, and interactive elements in visual novel-style games.

---

## Table of Contents

1. [Overview](#overview)
2. [Basic Syntax](#basic-syntax)
3. [Commands](#commands)
   - [Scene Commands](#scene-commands)
   - [Actor Commands](#actor-commands)
   - [Dialogue Commands](#dialogue-commands)
   - [Drop Commands](#drop-commands)
   - [Button Commands](#button-commands)
   - [Audio Commands](#audio-commands)
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
- Commands are **UPPERCASE**
- Arguments follow the command, separated by spaces
- Text content uses quotes for multi-word strings
- Comments start with `//` (not yet implemented)
- Blank lines are ignored

```
COMMAND argument1 argument2
COMMAND "multi word argument"
```

---

## Commands

### Scene Commands

#### `SCENE scene_id`
Transitions to a different scene.

```
SCENE forest_clearing
```

#### `BG drop_id`
Sets the background drop for the current scene.

```
BG sunset_cityscape
```

---

### Actor Commands

#### `SHOW actor_id`
Displays an actor on stage.

```
SHOW detective
```

#### `HIDE actor_id`
Removes an actor from the stage.

```
HIDE detective
```

#### `MOVE actor_id x y`
Moves an actor to a specific position (in percentage of stage).

```
MOVE detective 25 50
```

---

### Dialogue Commands

#### `actor_id "Dialogue text"`
Displays dialogue spoken by an actor. The actor must be defined in the game's actors list.

```
detective "I've seen things you wouldn't believe."
narrator "The rain continued to fall."
```

#### `WAIT seconds`
Pauses execution for a specified duration.

```
WAIT 2
```

---

### Drop Commands

#### `DROP drop_id`
Displays a drop (background or overlay image).

```
DROP rain_overlay
```

#### `HIDE_DROP drop_id`
Hides a previously shown drop.

```
HIDE_DROP rain_overlay
```

---

### Button Commands

#### `BUTTON button_id`
Activates and displays an interactive button on the stage.

```
BUTTON examine_desk
```

#### `HIDE_BUTTON button_id`
Hides and deactivates a button.

```
HIDE_BUTTON examine_desk
```

Buttons can be configured in the editor with:
- **Label**: Text displayed on the button
- **Position & Size**: X, Y, width, height
- **Target Scene**: Scene to navigate to when clicked
- **Sound Effect**: SFX to play when clicked
- **Page URL**: External link to open when clicked

---

### Audio Commands

#### `SFX sfx_id`
Plays a sound effect.

```
SFX thunder_rumble
```

#### `MUSIC music_id` *(planned)*
Starts playing background music.

```
MUSIC noir_jazz
```

#### `STOP_MUSIC` *(planned)*
Stops the currently playing music.

---

### Choice Commands

#### `CHOICE`
Presents the player with branching options. Must be followed by OPTION commands and ended with END_CHOICE.

```
CHOICE
OPTION "Investigate the desk" -> desk_scene
OPTION "Talk to the witness" -> witness_scene  
OPTION "Leave the room" -> hallway
END_CHOICE
```

#### `OPTION "text" -> scene_id`
Defines a single choice option that navigates to a scene.

#### `END_CHOICE`
Marks the end of a choice block.

---

### Flow Control

#### `GOTO scene_id` *(planned)*
Jumps to another scene without visual transition.

#### `END`
Marks the end of the script. Playback stops.

```
END
```

#### `TITLE "text"` *(planned)*
Displays a title card or chapter heading.

---

## Examples

### Simple Dialogue Scene

```
BG office_night
SHOW detective 50 50
detective "Another late night at the precinct."
WAIT 1
detective "The case files aren't going to solve themselves."
SFX phone_ring
detective "Now what?"
END
```

### Scene with Choices

```
BG crossroads
SHOW guide 50 50
guide "Which path will you take?"
CHOICE
OPTION "The mountain pass" -> mountain
OPTION "The forest trail" -> forest
OPTION "Return to town" -> town
END_CHOICE
```

### Interactive Scene with Buttons

```
BG detective_office
BUTTON examine_desk
BUTTON check_window
BUTTON read_letter
narrator "The office is quiet. What catches your attention?"
```

---

## Best Practices

1. **Use descriptive IDs**: `forest_night` is better than `scene_7`
2. **Keep dialogue concise**: Break long speeches into multiple lines
3. **Test frequently**: Use Theater mode to preview your scripts
4. **Comment your logic**: Add notes for complex branching
5. **Organize by act**: Group related scenes together

---

## Planned Features

- [ ] Variables and conditions (`IF`, `SET`, `CHECK`)
- [ ] Character expressions (`EXPRESSION actor_id happy`)
- [ ] Animation triggers (`ANIMATE actor_id walk_left`)
- [ ] Inventory system (`GIVE item_id`, `TAKE item_id`)
- [ ] Music and ambient audio
- [ ] Text formatting (bold, italic, colors)
- [ ] Screen effects (fade, shake, flash)

---

*This document is maintained as part of the Dramaton project.*
