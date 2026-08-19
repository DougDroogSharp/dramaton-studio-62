// Dramaton Editor Types

export type SelectionType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button' | 'episode';
export type AssetStatus = 'new' | 'work' | 'done';

export interface SelectionState {
  type: SelectionType;
  id: string | null;
  subId?: string;
  returnTo?: { type: SelectionType; id: string };
}

export interface GameInfo {
  title: string;
  author: string;
  styleGuide: string | null;
  // Art style pack: folder name under STYLE_PACKS_DIR whose images +
  // style.txt ride every image generation. One style per game —
  // changing it mid-project means regenerating existing art.
  stylePack?: string;
  worldState: Record<string, string | number | boolean>;
  gameMode: 'INTERACTIVE' | 'AUTO_PLAY';
  titleSceneId?: string;
  enableAutosave: boolean;
  customPoses?: string[];
  customExpressions?: string[];
}

export interface ActorGraphic {
  id: string;
  pose: string;
  expression: string;
  angle: number;
  image: string;
  generatedPrompt?: string;  // Full prompt used to generate this graphic
}

export interface Actor {
  id: string;
  name: string;
  image?: string;
  referenceImageCloseUp?: string;
  referenceImageFullBody?: string;
  voiceId?: string;
  graphics: ActorGraphic[];
  note?: string;
  status?: AssetStatus;
}

export interface StageElement {
  id: string;
  assetId: string;
  type: 'ACTOR' | 'ITEM' | 'BALLOON';
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  rotation: number;
  opacity?: number;  // 0-1; undefined = fully opaque (runtime/BIND-driven)
  pose?: string;
  expression?: string;
  spriteAngle?: number;
  activeSfx?: string[];
  text?: string;
  balloonType?: 'SPEECH' | 'THOUGHT';
}

// Runtime-only override applied to a StageElement by the script runner
// (ENTER/MOVE/POSE, and later BIND). transitionDuration lets a MOVE
// animate at its scripted speed instead of the default CSS easing.
export type StageElementOverride = Partial<StageElement> & { transitionDuration?: number };

export interface SceneAudio {
  id: string;
  name: string;
  type: 'bgm' | 'ambience' | 'sfx';
  url: string;  // URL to audio file (stored in blob storage)
  loop: boolean;
  volume: number;
}

// Scene taxonomy salvaged from Dramaton Editor 2.0:
// AGENCY = the player acts; WITNESS = the player watches, but reacts.
export type SceneType = 'AGENCY' | 'WITNESS';

// ============ NARRATON ============
// The 1986 King of Chicago storyteller: scenes carry selection keys and
// the [NARRATON pool=x] command picks the scene whose keys least-squares
// match the current world state. See src/utils/narraton.ts.

export interface NarratonRequirement {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

// A selection key: the scene "wants" the variable near target.
// scale normalizes the delta before squaring (default 100, i.e. a
// 0-100 variable); without it, big-range variables like hoard would
// drown out everything else.
export interface NarratonKey {
  target: number;
  scale?: number;
}

export interface NarratonMeta {
  pool: string;                                   // selection pool membership
  keys?: Record<string, number | NarratonKey>;    // target values, least-squares matched
  requires?: NarratonRequirement[];               // hard gates
  repeatable?: boolean;                           // default false: plays once
  subplot?: string;                               // one scene per subplot in rotation
  weight?: number;                                // bias: score divides by this (default 1)
}

export interface Scene {
  id: string;
  name: string;
  sceneType?: SceneType;
  dropId?: string;
  stage?: StageElement[];
  script?: string;
  audioTracks?: SceneAudio[];
  audioData?: Record<string, string>;
  narraton?: NarratonMeta;
  note?: string;
  status?: AssetStatus;
}

export interface Drop {
  id: string;
  name: string;
  prompt: string;
  image?: string;
  referenceImage?: string;      // Reference image for composition/layout
  editHistory?: string[];       // Track previous versions
  lastEditPrompt?: string;      // Last edit instruction used
  generatedPrompt?: string;     // Full prompt used to generate this image
  note?: string;
  status?: AssetStatus;
}

// costume/prop/knowledge/gear is the canonical item grammar salvaged from
// Dramaton Editor 2.0; the original trunk categories stay valid so saved
// games keep loading.
export type ItemCategory =
  | 'costume' | 'prop' | 'knowledge' | 'gear'
  | 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
export type AcquisitionType = 'pickup' | 'earned' | 'purchased';
export type Operator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface ItemEffect {
  variable: string;
  value: string | number | boolean;
}

export interface UnlockCondition {
  variable: string;
  operator: Operator;
  threshold: string | number;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  category: ItemCategory;
  acquisition: AcquisitionType;
  visualAsset?: string;
  effects: ItemEffect[];
  unlockCondition?: UnlockCondition;
  note?: string;
  status?: AssetStatus;
}

export type SfxType = 'glow' | 'pulse' | 'shake' | 'jiggle' | 'fade' | 'electric' | 'flame';
export type SfxCategory = 'ATTACH' | 'DO';

export interface SfxParams {
  intensity: number;
  speed?: number;
  color?: string;
  duration?: number;
  audioUrl?: string;       // Generated sound effect audio URL (blob or data URL)
  audioPrompt?: string;    // Text prompt used to generate the audio
}

export interface Sfx {
  id: string;
  name: string;
  type: SfxType;
  category: SfxCategory;
  params: SfxParams;
  prompt?: string;
  note?: string;
  status?: AssetStatus;
}

// A worldState write applied when a button is clicked. value uses SET
// semantics: literal (true/false/number/"string") or an arithmetic
// expression over variables — "1 - singleTax" makes a toggle.
export interface ButtonEffect {
  variable: string;
  value: string;
}

// Button type for interactive elements in scenes
export interface Button {
  id: string;
  name: string;
  label: string;           // Text shown on the button
  x: number;               // Position as percentage (0-100)
  y: number;               // Position as percentage (0-100)
  width: number;           // Width as percentage (5-50)
  height: number;          // Height as percentage (5-20)
  targetSceneId?: string;  // Scene to navigate to when clicked
  sfxId?: string;          // Sound effect to play on click
  pageUrl?: string;        // External page URL to open
  effects?: ButtonEffect[]; // worldState writes applied on click
  style?: 'default' | 'primary' | 'danger';  // Button style variant
  note?: string;
  status?: AssetStatus;
}

// Episode type for organizing scenes into releases
export interface Episode {
  id: string;
  name: string;
  description?: string;
  sceneIds: string[];      // Unordered collection - scenes can be in multiple episodes
  note?: string;
  status?: AssetStatus;
}

export interface GameData {
  info: GameInfo;
  actors: Actor[];
  scenes: Scene[];
  drops: Drop[];
  items: Item[];
  sfx: Sfx[];
  buttons: Button[];
  episodes: Episode[];
}

// Library Types for cross-game asset reuse
export interface LibraryAsset {
  libraryId: string;      // Unique ID within the library
  addedAt: number;        // Timestamp when added
  source: string;         // Original game title
  tags?: string[];        // Optional categorization
}

export interface LibraryActor extends Actor, LibraryAsset {}
export interface LibraryScene extends Scene, LibraryAsset {}
export interface LibraryDrop extends Drop, LibraryAsset {}
export interface LibraryItem extends Item, LibraryAsset {}
export interface LibrarySfx extends Sfx, LibraryAsset {}
export interface LibraryEpisode extends Episode, LibraryAsset {}

export interface AssetLibrary {
  version: number;
  actors: LibraryActor[];
  scenes: LibraryScene[];
  drops: LibraryDrop[];
  items: LibraryItem[];
  sfx: LibrarySfx[];
  episodes: LibraryEpisode[];
}

export const createDefaultLibrary = (): AssetLibrary => ({
  version: 1,
  actors: [],
  scenes: [],
  drops: [],
  items: [],
  sfx: [],
  episodes: [],
});

// Migrate old game data to current format
export const migrateGameData = (data: any): GameData => {
  const migrated = { ...data };
  
  // Ensure buttons array exists
  if (!migrated.buttons) {
    migrated.buttons = [];
  }

  // Dramaton Editor 2.0 called drops "screens"; rename the collection and
  // each scene's screenId reference.
  if (!migrated.drops && migrated.screens) {
    migrated.drops = migrated.screens;
    delete migrated.screens;
  }
  if (!migrated.drops) {
    migrated.drops = [];
  }
  if (migrated.scenes) {
    migrated.scenes = migrated.scenes.map((s: any) => {
      if (s.dropId || !s.screenId) return s;
      const { screenId, ...rest } = s;
      return { ...rest, dropId: screenId };
    });
  }

  // Normalize sceneType to the AGENCY/WITNESS pair.
  // Dramaton Editor 2.0 saves carried the pair in a `type` field; honor it.
  // Anything else ('Dialogue', 'Cutscene', undefined, ...) defaults to AGENCY.
  if (migrated.scenes) {
    const isPair = (v: any): v is SceneType => v === 'AGENCY' || v === 'WITNESS';
    migrated.scenes = migrated.scenes.map((s: any) => {
      if (isPair(s.sceneType)) return s;
      return { ...s, sceneType: isPair(s.type) ? s.type : ('AGENCY' as SceneType) };
    });
  }
  
  // Ensure episodes array exists - create default episode with all scenes if missing
  if (!migrated.episodes) {
    if (migrated.scenes && migrated.scenes.length > 0) {
      migrated.episodes = [{
        id: `episode_legacy_${Date.now()}`,
        name: 'Episode 1',
        description: 'Migrated from legacy game file',
        sceneIds: migrated.scenes.map((s: Scene) => s.id),
        status: 'work' as AssetStatus,
      }];
    } else {
      migrated.episodes = [];
    }
  }
  
  return migrated as GameData;
};

// Default game state
export const createDefaultGame = (): GameData => ({
  info: {
    title: 'Untitled Game',
    author: 'Unknown Creator',
    styleGuide: null,
    worldState: {},
    gameMode: 'INTERACTIVE',
    enableAutosave: true,
  },
  actors: [],
  scenes: [],
  drops: [],
  items: [],
  sfx: [],
  buttons: [],
  episodes: [],
});
