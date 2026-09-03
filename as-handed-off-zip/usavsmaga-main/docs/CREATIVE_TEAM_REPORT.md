# Dramaton Editor & Theater System Report
## Creative Team Technical Overview

*Generated: January 2026*

---

## Executive Summary

Dramaton is a visual novel / interactive theater authoring tool built on React with a custom scripting language called **DramScript**. The system comprises two major subsystems:

1. **The Editor** — A multi-tab asset management interface for creating games
2. **The Theater** — A runtime player that executes DramScript and renders interactive scenes

---

## Part 1: The Editor System

### Overview

The editor follows a standardized layout pattern across all asset types:
- **Stage/Image preview** at top (draggable/zoomable)
- **Consolidated action button row**
- **Scrollable configuration panels** underneath

Navigation tabs are ordered: **Actor → Item → Scene → Drop → Game → Page → FX → Episode → Buttons → Library**

---

### 1.1 Actor Editor (`ActorEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Actor creation/deletion | ✅ Complete | Full CRUD for actor entities |
| AI pose generation | ✅ Complete | Generates character graphics via AI with pose/expression/angle params |
| Pose library management | ✅ Complete | Browse, select, and delete actor graphics |
| Voice assignment | ✅ Complete | Voice browser integration for ElevenLabs voices |
| Background removal | ✅ Complete | Auto-removes backgrounds from generated images |
| Reference images | ✅ Complete | Close-up and full-body reference storage |
| Library save/load | ✅ Complete | Persist actors to global asset library |

**Data Structure:**
```typescript
interface Actor {
  id: string;
  name: string;
  image?: string;
  referenceImageCloseUp?: string;
  referenceImageFullBody?: string;
  voiceId?: string;
  graphics: ActorGraphic[];  // pose/expression/angle combinations
  note?: string;
  status?: AssetStatus;
  pageId?: string;           // Links to custom HTML page
}

interface ActorGraphic {
  id: string;
  pose: string;              // e.g., "Standing", "Sitting"
  expression: string;        // e.g., "Happy", "Angry", "Neutral"
  angle: number;             // 0, 45, 90, 135, 180, 225, 270, 315
  image: string;             // Base64 or URL
  generatedPrompt?: string;
}
```

**Planned/Unimplemented:**
- Sprite sheet export for external engines
- Skeletal animation rigging
- Auto-pose from reference image

---

### 1.2 Item Editor (`ItemEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Item creation/deletion | ✅ Complete | Full CRUD operations |
| Visual asset assignment | ✅ Complete | Image upload/generation |
| Category system | ✅ Complete | weapon, armor, consumable, key, misc |
| Acquisition types | ✅ Complete | pickup, earned, purchased |
| Effects system | ✅ Complete | Variable modifications on collect |
| Collectible flagging | ✅ Complete | Mark items as collectible with labels |
| Unlock conditions | ✅ Complete | Variable-based unlock logic |
| Page linking | ✅ Complete | Display HTML page when examined |

**Data Structure:**
```typescript
interface Item {
  id: string;
  name: string;
  description?: string;
  category: 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
  acquisition: 'pickup' | 'earned' | 'purchased';
  visualAsset?: string;
  effects: ItemEffect[];           // Variable modifications
  unlockCondition?: UnlockCondition;
  isCollectible?: boolean;
  collectibleLabel?: string;       // "PICKUP", "EARNED", etc.
  pageId?: string;
}
```

---

### 1.3 Scene Editor (`SceneEditor.tsx`)

**The most complex editor — combines visual stage editing with DramScript authoring.**

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Scene creation/deletion | ✅ Complete | Full CRUD |
| Background (Drop) assignment | ✅ Complete | Select from Drop library |
| Stage element placement | ✅ Complete | Click-to-place Actors, Items, Balloons |
| Drag/scale/rotate elements | ✅ Complete | Visual manipulation with mouse |
| Auto DramScript sync | ✅ Complete | Visual changes generate ENTER/EXIT/MOVE commands |
| Z-order management | ✅ Complete | Forward/back layering |
| Audio track management | ✅ Complete | BGM, Ambience, SFX per scene |
| AI scene suggestions | ✅ Complete | Suggests script improvements |
| Scene preview/playback | ✅ Complete | Test scene in embedded player |
| Scene types | ✅ Complete | Categorization for organization |

**Visual-Script Synchronization:**
When you drag an actor on stage, the system automatically generates:
```
[ENTER libby at 45,60 3 Standing Neutral 0]
```

**Unified Control Strip (above stage):**
Back | Status | Add to Stage | Library | Delete Element | Delete Scene | AI Suggest | Play

---

### 1.4 Drop Editor (`DropEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Drop creation/deletion | ✅ Complete | Full CRUD |
| AI background generation | ✅ Complete | Text prompt → image |
| Image editing/refinement | ✅ Complete | Iterative AI edits |
| Edit history | ✅ Complete | Track prompt evolution |
| Reference image upload | ✅ Complete | Guide AI generation |

**Data Structure:**
```typescript
interface Drop {
  id: string;
  name: string;
  prompt: string;
  image?: string;
  referenceImage?: string;
  editHistory?: string[];
  lastEditPrompt?: string;
  generatedPrompt?: string;
}
```

---

### 1.5 Button Editor (`ButtonEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Button creation/deletion | ✅ Complete | Full CRUD |
| Position/size editing | ✅ Complete | Visual placement on stage |
| Scene navigation | ✅ Complete | Click → go to scene |
| URL opening | ✅ Complete | External links |
| Page display | ✅ Complete | Show custom HTML |
| SFX on click | ✅ Complete | Play sound effect |
| Button styling | ✅ Complete | default, primary, danger variants |

---

### 1.6 SFX Editor (`SfxEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| SFX creation/deletion | ✅ Complete | Full CRUD |
| AI audio generation | ✅ Complete | ElevenLabs integration |
| Effect types | ✅ Complete | glow, pulse, shake, jiggle, fade, electric |
| Intensity/speed params | ✅ Complete | Per-effect customization |
| Color customization | ✅ Complete | For glow effects |

**Data Structure:**
```typescript
type SfxType = 'glow' | 'pulse' | 'shake' | 'jiggle' | 'fade' | 'electric';
type SfxCategory = 'ATTACH' | 'DO';

interface Sfx {
  id: string;
  name: string;
  type: SfxType;
  category: SfxCategory;
  params: {
    intensity: number;
    speed?: number;
    color?: string;
    duration?: number;
    audioUrl?: string;
    audioPrompt?: string;
  };
}
```

---

### 1.7 Episode Editor (`EpisodeEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Episode creation/deletion | ✅ Complete | Full CRUD |
| Scene inclusion/exclusion | ✅ Complete | Drag-and-drop ordering |
| Scene navigation | ✅ Complete | Quick jump to scene editor |
| Episode description | ✅ Complete | Narrative notes |

---

### 1.8 Page Editor (`PageEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| HTML page creation | ✅ Complete | Custom HTML content |
| CSS styling | ✅ Complete | Per-page CSS |
| Live preview | ✅ Complete | Embedded iframe preview |
| HTML file import | ✅ Complete | Load from file |

---

### 1.9 Collection Editor (`CollectionEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Collectible overview | ✅ Complete | View all collectible items |
| Category filtering | ✅ Complete | Pickup, Earned, Purchased sections |
| Effect display | ✅ Complete | Show variable modifications |
| Navigate to item | ✅ Complete | Quick link to Item Editor |

---

### 1.10 Settings Editor (`SettingsEditor.tsx`)

**Working Functionality:**
| Feature | Status | Description |
|---------|--------|-------------|
| Game title/author | ✅ Complete | Basic info |
| Style guide | ✅ Complete | AI generation guidance |
| World state variables | ✅ Complete | Define initial variables |
| Game mode | ✅ Complete | INTERACTIVE vs AUTO_PLAY |
| Autosave toggle | ✅ Complete | Enable/disable |
| Custom poses/expressions | ✅ Complete | Extend default lists |
| File load/save | ✅ Complete | JSON game files |

---

## Part 2: DramScript Language

### Overview

DramScript is a line-based scripting language for controlling narrative flow, character positions, dialogue, and interactivity.

### Command Categories & Implementation Status

#### ✅ Dialogue Commands (IMPLEMENTED)
```
Detective: "I've seen things you wouldn't believe."
Narrator: "The rain continued to fall."
Alice (thinking): "What should I do next?"
```

#### ✅ Actor Commands (IMPLEMENTED)
| Command | Syntax | Status |
|---------|--------|--------|
| ENTER | `[ENTER item_id at x,y z pose expression angle]` | ✅ Complete |
| EXIT | `[EXIT item_id]` | ✅ Complete |
| MOVE | `[MOVE item_id to x,y scale S tilt R over Ds]` | ✅ Complete (requires ENTER first) |
| ZORDER | `[ZORDER item_id forward\|back]` | ✅ Complete (requires ENTER first) |
| POSE | `[POSE actor_id pose=X expression=Y]` | ✅ Complete (requires ENTER first) |

**Important:** MOVE, ZORDER, POSE, and SAY commands require the target actor/item to be on stage first via an ENTER command. If a target hasn't entered the scene, an error dialog will appear with options to create the missing actor or item.

#### ✅ Button Commands (IMPLEMENTED)
| Command | Syntax | Status |
|---------|--------|--------|
| BUTTON | `[BUTTON button_id]` | ✅ Complete |
| HIDE_BUTTON | `[HIDE_BUTTON button_id]` | ✅ Complete |

#### ✅ Choice Commands (IMPLEMENTED)
```
[CHOICE]
- "Investigate the desk" -> desk_scene
- "Talk to the witness" -> witness_scene
- "Leave the room" -> hallway
[/CHOICE]
```

#### ✅ Flow Control (PARTIAL)
| Command | Syntax | Status |
|---------|--------|--------|
| SCENE | `[SCENE scene_id]` | ✅ Complete |
| WAIT | `[WAIT 2s]` | ✅ Complete |
| LOOP | `[LOOP count]...[/LOOP]` | ✅ Complete |
| BREAKLOOP | `[BREAKLOOP]` | ✅ Complete |
| COMMENT | `# comment` or `// comment` | ✅ Complete |
| SET | `[SET variable = value]` | ❌ Not implemented |
| IF/ENDIF | `[IF var op value]...[ENDIF]` | ❌ Not implemented |

#### ❌ Audio Commands (NOT IMPLEMENTED)
| Command | Syntax | Status |
|---------|--------|--------|
| BGM | `[BGM: "track" loop vol=70%]` | ❌ Planned |
| AMBIENCE | `[AMBIENCE: "track" loop vol=40%]` | ❌ Planned |
| SFX | `[SFX: "effect" vol=80%]` | ❌ Planned |

#### ❌ Effect Commands (NOT IMPLEMENTED)
| Command | Syntax | Status |
|---------|--------|--------|
| EFFECT | `[EFFECT sfx_id on target_id]` | ❌ Planned |
| CLEAR_EFFECT | `[CLEAR_EFFECT sfx_id from target_id]` | ❌ Planned |

### Random Value Support

Numeric parameters support `RND(high, low)` for randomization:
```
[ENTER prop at RND(80,20),RND(80,20) 1 Neutral Neutral 0]
[WAIT RND(5,2)s]
[LOOP RND(5,2)]
```

---

### DramScript Editor Features

| Feature | Status | Description |
|---------|--------|-------------|
| Syntax highlighting | ✅ Complete | Color-coded command types |
| Command auto-complete | ✅ Complete | Context-aware suggestions |
| Command validation | ✅ Complete | Real-time error detection |
| Visual indentation | ✅ Complete | LOOP/IF block nesting indicators |
| Block connectors | ✅ Complete | Visual lines linking block pairs |
| Multi-select | ✅ Complete | Shift-click range selection |
| Batch delete | ✅ Complete | Delete multiple commands |
| Batch move | ✅ Complete | Move selected up/down |
| Command reordering | ✅ Complete | Up/down arrows per command |
| Recent commands | ✅ Complete | Quick re-use of recent types |

---

## Part 3: The Theater System

### Overview

The Theater (`Theater.tsx`) is the runtime player that executes DramScript and renders the interactive game experience.

### Working Functionality

| Feature | Status | Description |
|---------|--------|-------------|
| Script execution | ✅ Complete | Line-by-line command processing |
| Dialogue display | ✅ Complete | Typewriter effect with speech/thought |
| Choice presentation | ✅ Complete | Branching dialogue options |
| Element animations | ✅ Complete | Smooth MOVE transitions (cubic ease-out) |
| Button interactions | ✅ Complete | Clickable stage buttons |
| Scene transitions | ✅ Complete | Immediate or animated |
| Item collection | ✅ Complete | Collectible pickup with effects |
| Audio playback | ✅ Complete | BGM, ambience, SFX via scene audioTracks |
| Keyboard controls | ✅ Complete | Space/Enter to advance, M to mute |
| Title screen | ✅ Complete | Game info with start button |
| Player name dialog | ✅ Complete | Optional name entry |
| Auto-play mode | ✅ Complete | Automatic advancement |
| Step mode | ✅ Complete | Single command execution |
| Page overlays | ✅ Complete | Display custom HTML pages |

### Scene Preview Features

| Feature | Status | Description |
|---------|--------|-------------|
| Play/Pause | ✅ Complete | Toggle auto-play |
| Step | ✅ Complete | Execute single command |
| Step Back | ✅ Complete | Undo to previous state |
| Restart | ✅ Complete | Reset to scene start |
| Command counter | ✅ Complete | "Cmd 5/10" debug display |
| Command history | ✅ Complete | Shows last 3 commands, click to jump back |
| Audio mute | ✅ Complete | Toggle audio |
| Script validation | ✅ Complete | Error dialog for missing actors/items |

---

## Part 4: Type System

### Core Types

```typescript
// Selection system
type SelectionType = 'settings' | 'actor' | 'scene' | 'drop' | 
                     'item' | 'sfx' | 'button' | 'episode' | 
                     'page' | 'collection';

// Asset workflow status
type AssetStatus = 'new' | 'work' | 'done';

// Stage element types
interface StageElement {
  id: string;
  assetId: string;
  type: 'ACTOR' | 'ITEM' | 'BALLOON';
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  rotation: number;
  pose?: string;
  expression?: string;
  spriteAngle?: number;
  activeSfx?: string[];
  text?: string;
  balloonType?: 'SPEECH' | 'THOUGHT';
}

// Complete game data structure
interface GameData {
  info: GameInfo;
  actors: Actor[];
  scenes: Scene[];
  drops: Drop[];
  items: Item[];
  sfx: Sfx[];
  buttons: Button[];
  episodes: Episode[];
  pages: Page[];
}
```

### Script Command Types

```typescript
type ScriptCommandType = 
  // Implemented
  | 'DIALOGUE' | 'ENTER' | 'EXIT' | 'ZORDER' | 'MOVE'
  | 'WAIT' | 'SCENE' | 'CHOICE' | 'BUTTON' | 'HIDE_BUTTON'
  | 'LOOP' | 'ENDLOOP' | 'BREAKLOOP' | 'COMMENT' | 'UNKNOWN'
  // Planned
  | 'POSE' | 'BGM' | 'AMBIENCE' | 'SFX' 
  | 'EFFECT' | 'CLEAR_EFFECT' | 'SET' | 'IF' | 'ENDIF';
```

---

## Part 5: Future Roadmap & Musings

### Near-Term Priorities

1. **Variable System (SET/IF/ENDIF)**
   - Enable conditional story branching based on player choices
   - Track inventory, relationship stats, flags
   - Critical for meaningful player agency

2. **Audio Commands in Script**
   - `[BGM]`, `[AMBIENCE]`, `[SFX]` commands
   - Dynamic soundtrack changes during scenes
   - Currently audio is scene-level, not script-level

3. **POSE Command**
   - Change actor appearance mid-scene without ENTER/EXIT
   - More natural character expression shifts

### Medium-Term Enhancements

4. **Effect System**
   - `[EFFECT glow on detective]`
   - Visual emphasis, status indicators
   - Particle effects, screen shakes

5. **Advanced Animation**
   - Keyframe sequences
   - Path-based movement
   - Easing curve selection

6. **Voice Synthesis Integration**
   - Auto-generate dialogue audio from text
   - Voice ID per actor already supported

### Long-Term Vision

7. **Branching Visualization**
   - Node-based scene graph editor
   - Visual representation of story paths
   - Analytics on player choices

8. **Collaborative Editing**
   - Real-time multiplayer editing
   - Role-based permissions (writer, artist, QA)
   - Version control integration

9. **Export Targets**
   - Static HTML export (current)
   - Electron app packaging
   - Mobile-native wrappers

10. **AI Co-Authoring**
    - Suggest dialogue variations
    - Auto-generate scene descriptions
    - Character consistency checking

---

## Appendix: File Structure

```
src/
├── components/
│   ├── editors/
│   │   ├── ActorEditor.tsx
│   │   ├── AutoCompleteTextarea.tsx
│   │   ├── ButtonEditor.tsx
│   │   ├── CollectionEditor.tsx
│   │   ├── CommandRow.tsx
│   │   ├── CommandTypeSelector.tsx
│   │   ├── DramScriptEditor.tsx
│   │   ├── DropEditor.tsx
│   │   ├── EpisodeEditor.tsx
│   │   ├── ItemEditor.tsx
│   │   ├── PageEditor.tsx
│   │   ├── ParameterControls.tsx
│   │   ├── SceneEditor.tsx
│   │   ├── SettingsEditor.tsx
│   │   └── SfxEditor.tsx
│   ├── theater/
│   │   ├── ChoicePanel.tsx
│   │   ├── CollectionPanel.tsx
│   │   ├── DialogueBox.tsx
│   │   ├── ScenePreview.tsx
│   │   ├── StageButtonStrip.tsx
│   │   └── TheaterControls.tsx
│   └── Stage.tsx
├── hooks/
│   └── useScriptRunner.ts
├── pages/
│   ├── Index.tsx          # Main editor hub
│   └── Theater.tsx        # Game player
├── utils/
│   ├── scriptParser.ts    # DramScript parsing/serialization
│   └── scriptDocs.ts      # Command documentation registry
└── types.ts               # Core type definitions
```

---

## Conclusion

Dramaton provides a comprehensive visual novel authoring environment with:
- **10 specialized editors** for different asset types
- **DramScript** with 15 implemented commands and visual editing
- **Theater runtime** with full playback and interaction support
- **AI integration** for asset generation

The system is production-ready for linear and branching narratives. The primary gaps are conditional logic (SET/IF) and script-level audio commands, both documented and planned.

---

*Report prepared for the Dramaton Creative Team*
