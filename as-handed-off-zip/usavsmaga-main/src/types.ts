// Dramaton Editor Types - MVP Implementation (Backwards Compatible)

export type SelectionType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button' | 'episode' | 'page' | 'collection';
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
  restSceneId?: string; // Scene to display during rest period
  enableAutosave: boolean;
  collectedItems?: string[]; // Array of collected item IDs (for save/load)
  customPoses?: string[];
  customExpressions?: string[];
  currentEpisodeId?: string;
  startingEpisodeId?: string;
}

// ============ MOUTH POSITION TYPE ============

export interface MouthPosition {
  x: number;  // 0-100 percentage from left
  y: number;  // 0-100 percentage from top
}

// ============ ANIMATION TYPES ============

export type AnimationGait = 'walk' | 'run' | string; // string allows custom gaits
export type AnimationDirection = 'left' | 'right' | 'forward' | 'backward';

export interface AnimationFrame {
  id: string;
  frameIndex: number;
  image: string;  // Base64 or URL
  duration: number;  // ms per frame (e.g., 100ms)
}

export interface ActorAnimation {
  id: string;
  name: string;  // e.g., "walk_left", "run_forward", "sneak_right"
  gait: AnimationGait;
  direction: AnimationDirection;
  frames: AnimationFrame[];
  transitionFrames?: AnimationFrame[];  // Optional morph frames to any pose
  generatedPrompt?: string;
}

// ============ ACTOR TYPES ============

export interface ActorGraphic {
  id: string;
  pose: string;
  expression: string;
  angle: number;
  image: string;
  generatedPrompt?: string;
  mouthPosition?: MouthPosition;
}

export interface Actor {
  id: string;
  name: string;
  image?: string;
  referenceImageCloseUp?: string;
  referenceImageFullBody?: string;
  voiceId?: string;
  graphics: ActorGraphic[];
  animations: ActorAnimation[];  // Library of movement animations
  note?: string;
  status?: AssetStatus;
  pageId?: string;
}

// ============ STAGE ELEMENT ============

export type BalloonCategory = 'COMM' | 'TEXT';

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
  balloonCategory?: BalloonCategory;
  targetElementId?: string; // For COMM balloons - the element this balloon is attached to
}

export interface SceneAudio {
  id: string;
  name: string;
  type: 'bgm' | 'ambience' | 'sfx';
  url: string;
  loop: boolean;
  volume: number;
}

export interface Scene {
  id: string;
  name: string;
  sceneType?: string;
  dropId?: string;
  stage?: StageElement[];
  script?: string;
  audioTracks?: SceneAudio[];
  audioData?: Record<string, string>;
  note?: string;
  status?: AssetStatus;
  tags?: string[];
  tagsUpdatedAt?: number;
}

export interface Drop {
  id: string;
  name: string;
  prompt: string;
  image?: string;
  referenceImage?: string;
  editHistory?: string[];
  lastEditPrompt?: string;
  generatedPrompt?: string;
  note?: string;
  status?: AssetStatus;
}

export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
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
  mouthPosition?: MouthPosition;
  effects: ItemEffect[];
  unlockCondition?: UnlockCondition;
  note?: string;
  status?: AssetStatus;
  pageId?: string;
  // Collectible fields
  isCollectible?: boolean;
  collectibleLabel?: string; // e.g., "PICKUP", "EARNED"
}

export type SfxType = 'glow' | 'pulse' | 'shake' | 'jiggle' | 'fade' | 'electric';
export type SfxCategory = 'ATTACH' | 'DO';

export interface SfxParams {
  intensity: number;
  speed?: number;
  color?: string;
  duration?: number;
  audioUrl?: string;
  audioPrompt?: string;
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

export interface Button {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetSceneId?: string;
  sfxId?: string;
  pageUrl?: string;
  pageId?: string;
  style?: 'default' | 'primary' | 'danger';
  note?: string;
  status?: AssetStatus;
}

export interface Episode {
  id: string;
  name: string;
  description?: string;
  sceneIds: string[];
  note?: string;
  status?: AssetStatus;
}

export interface Page {
  id: string;
  name: string;
  htmlContent: string;
  cssStyles?: string;
  note?: string;
  status?: AssetStatus;
  tags?: string[];
  tagsUpdatedAt?: number;
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
  pages: Page[];
}

// ============ LIBRARY TYPES ============

export interface LibraryAsset {
  libraryId: string;
  addedAt: number;
  source: string;
  tags?: string[];
}

export interface LibraryActor extends Actor, LibraryAsset {}
export interface LibraryScene extends Scene, LibraryAsset {}
export interface LibraryDrop extends Drop, LibraryAsset {}
export interface LibraryItem extends Item, LibraryAsset {}
export interface LibrarySfx extends Sfx, LibraryAsset {}
export interface LibraryEpisode extends Episode, LibraryAsset {}
export interface LibraryPage extends Page, LibraryAsset {}

export interface LibraryGame extends LibraryAsset {
  id: string;
  title: string;
  author: string;
  gameData: GameData;
  thumbnail?: string;
}

export interface AssetLibrary {
  version: number;
  username?: string;
  actors: LibraryActor[];
  scenes: LibraryScene[];
  drops: LibraryDrop[];
  items: LibraryItem[];
  sfx: LibrarySfx[];
  episodes: LibraryEpisode[];
  pages: LibraryPage[];
  games: LibraryGame[];
}

export const createDefaultLibrary = (): AssetLibrary => ({
  version: 1,
  actors: [],
  scenes: [],
  drops: [],
  items: [],
  sfx: [],
  episodes: [],
  pages: [],
  games: [],
});

// Migrate old game data to current format
export const migrateGameData = (data: any): GameData => {
  const migrated = { ...data };
  
  if (!migrated.buttons) migrated.buttons = [];
  if (!migrated.pages) migrated.pages = [];
  
  if (!migrated.episodes) {
    if (migrated.scenes && migrated.scenes.length > 0) {
      const defaultEpisodeId = `episode_legacy_${Date.now()}`;
      migrated.episodes = [{
        id: defaultEpisodeId,
        name: 'Episode 1',
        description: 'Migrated from legacy game file',
        sceneIds: migrated.scenes.map((s: Scene) => s.id),
        status: 'work' as AssetStatus,
      }];
      if (!migrated.info.currentEpisodeId) {
        migrated.info.currentEpisodeId = defaultEpisodeId;
      }
    } else {
      migrated.episodes = [];
    }
  }
  
  if (!migrated.info.currentEpisodeId && migrated.episodes && migrated.episodes.length > 0) {
    migrated.info.currentEpisodeId = migrated.episodes[0].id;
  }
  
  // Migrate actors to include animations array
  if (migrated.actors) {
    migrated.actors = migrated.actors.map((actor: any) => ({
      ...actor,
      animations: actor.animations || [],
    }));
  }
  
  return migrated as GameData;
};

export const createDefaultGame = (): GameData => {
  const defaultEpisodeId = `episode_${Date.now()}`;
  return {
    info: {
      title: 'Untitled Game',
      author: 'Unknown Creator',
      styleGuide: null,
      worldState: {},
      gameMode: 'INTERACTIVE',
      enableAutosave: true,
      currentEpisodeId: defaultEpisodeId,
    },
    actors: [],
    scenes: [],
    drops: [],
    items: [],
    sfx: [],
    buttons: [],
    pages: [],
    episodes: [{
      id: defaultEpisodeId,
      name: 'Episode 1',
      description: '',
      sceneIds: [],
      status: 'new' as AssetStatus,
    }],
  };
};

// ============ MVP HELPER FUNCTIONS ============

// Find an actor or item by ID for script commands
export const findItemById = (game: GameData, itemId: string): Actor | Item | undefined => {
  const actor = game.actors.find(a => a.id === itemId);
  if (actor) return actor;
  return game.items.find(i => i.id === itemId);
};

// Get the appropriate graphic for an actor
export const findActorGraphic = (
  actor: Actor,
  pose?: string,
  expression?: string,
  angle?: number
): ActorGraphic | undefined => {
  return actor.graphics.find(g =>
    (!pose || g.pose === pose) &&
    (!expression || g.expression === expression) &&
    (angle === undefined || g.angle === angle)
  ) || actor.graphics[0];
};
