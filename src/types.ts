// Dramaton Editor Types

export type SelectionType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button' | 'episode' | 'narraton' | 'skin';
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
  worldState: Record<string, string | number | boolean>;
  gameMode: 'INTERACTIVE' | 'AUTO_PLAY';
  titleSceneId?: string;
  enableAutosave: boolean;
  customPoses?: string[];
  customExpressions?: string[];
  // Skin lockdown: when non-empty, only skins whose skinType is listed here
  // may be assigned in this world (the "land can lock down skin types" rule).
  allowedSkinTypes?: string[];
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
  // 3-D skin worn by this actor (Vita); its animation manifest feeds pose
  // autocomplete in Dramscript.
  skinId?: string;
  // Vita instrumentation, exposed to scripting via world variables.
  gauges?: Gauge[];
  knobs?: Knob[];
  note?: string;
  status?: AssetStatus;
}

// Vita instrumentation: every Vita exposes its gauges and knobs as script
// variables. A GAUGE is a live meter (level) with a danger threshold
// (redLine) and a target (goal); a KNOB is a behavior dial. All 0-100 by
// convention. Exposed variable names: <actorId>_<gauge> (level),
// <actorId>_<gauge>_redline, <actorId>_<gauge>_goal, <actorId>_<knob>.
export interface Gauge {
  name: string;
  level: number;
  redLine: number;
  goal: number;
}

export interface Knob {
  name: string;
  value: number;
}

// Named bundle of gauge/knob settings (Happy Voracious, Starving Lazy, ...).
// Presets are the friendly surface; advanced users edit the raw values.
export interface VitaPreset {
  id: string;
  name: string;
  gauges: Gauge[];
  knobs: Knob[];
  note?: string;
}

// User-generated 3-D skin (GLB/glTF model). The editor stores the MANIFEST,
// not the binary: the model file itself lives in the models/ folder (Dropbox)
// per the stage-registry convention. animations lists EVERY clip found at
// import, including non-standard ones — each is a valid [POSE ... pose=X]
// argument for the wearing actor.
export interface Skin {
  id: string;
  name: string;
  skinType?: string;        // e.g. 'human', 'animal', 'machine' — lockdown unit
  fileName?: string;        // source file the manifest was read from
  animations: string[];
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
  pose?: string;
  expression?: string;
  spriteAngle?: number;
  activeSfx?: string[];
  text?: string;
  balloonType?: 'SPEECH' | 'THOUGHT';
}

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

// Narraton (King-of-Chicago mechanism, CGDC 1989): each scene may carry a KEY —
// target values (0–100) for one or more world-state variables. The selector
// ranks candidate scenes by least-squares distance from the live world state.
export type SceneKey = Record<string, number>;

// Phase marker within a subplot's arc (KoC: position in a sequence's bag).
export type ScenePhase = 'BEGINNING' | 'MIDDLE' | 'END';

export interface Scene {
  id: string;
  name: string;
  sceneType?: SceneType;
  dropId?: string;
  stage?: StageElement[];
  script?: string;
  audioTracks?: SceneAudio[];
  audioData?: Record<string, string>;
  note?: string;
  status?: AssetStatus;
  // Narraton fields — all optional; absent on scenes the selector ignores.
  key?: SceneKey;
  phase?: ScenePhase;
  subplotId?: string;
  // In-scene variables: scene-local initial values, invisible to the Narraton
  // selector and never written to info.worldState.
  localVars?: Record<string, string | number | boolean>;
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

export type SfxType = 'glow' | 'pulse' | 'shake' | 'jiggle' | 'fade' | 'electric';
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
  style?: 'default' | 'primary' | 'danger';  // Button style variant
  note?: string;
  status?: AssetStatus;
}

// Subplot: an owned bag of scenes (KoC "sequence"). Narraton braids subplots
// by rotating unpredictably between owners' bags when picking the next scene.
export interface Subplot {
  id: string;
  name: string;
  owner?: string;          // whose subplot this is (KoC: Pinky's, Tony's, ...)
  description?: string;
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
  subplots: Subplot[];
  skins: Skin[];
  vitaPresets: VitaPreset[];
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

// Starter Vita presets (Doug's naming style: mood + appetite). Editable
// starting points; delete or reshape freely.
export const createStarterVitaPresets = (): VitaPreset[] => [
  {
    id: 'preset_happy_voracious',
    name: 'Happy Voracious',
    gauges: [
      { name: 'hunger', level: 25, redLine: 90, goal: 20 },
      { name: 'energy', level: 80, redLine: 10, goal: 75 },
    ],
    knobs: [
      { name: 'appetite', value: 90 },
      { name: 'laziness', value: 15 },
    ],
  },
  {
    id: 'preset_starving_lazy',
    name: 'Starving Lazy',
    gauges: [
      { name: 'hunger', level: 85, redLine: 90, goal: 20 },
      { name: 'energy', level: 30, redLine: 10, goal: 75 },
    ],
    knobs: [
      { name: 'appetite', value: 40 },
      { name: 'laziness', value: 90 },
    ],
  },
];

// Migrate old game data to current format
export const migrateGameData = (data: any): GameData => {
  const migrated = { ...data };
  
  // Ensure buttons array exists
  if (!migrated.buttons) {
    migrated.buttons = [];
  }

  // Ensure subplots array exists (Narraton, added 2026-08-31)
  if (!migrated.subplots) {
    migrated.subplots = [];
  }

  // Ensure skins array exists (skin library, added 2026-08-31)
  if (!migrated.skins) {
    migrated.skins = [];
  }

  // Seed the starter Vita presets (added 2026-08-31). Values are editable
  // starting points, not canon.
  if (!migrated.vitaPresets) {
    migrated.vitaPresets = createStarterVitaPresets();
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
  subplots: [],
  skins: [],
  vitaPresets: createStarterVitaPresets(),
});
