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
  // Era coin for {var:money} in meter commentary: pence (Norman
  // England), francs, dollars1929, dollars, plain.
  moneyFormat?: string;
  // Which cabinet the game is played inside: diesel | linen | brass |
  // amiga | flat. See src/utils/frames.ts.
  frame?: string;
  // Stamped by the build, never hand-edited. Shown on the title page so
  // a bug report carries which build it came from, which matters when
  // the same game is being played on three devices and one of them is
  // holding a cached copy. See scripts/stamp.mjs.
  version?: string;
  builtAt?: string;
}

export interface ActorGraphic {
  id: string;
  pose: string;
  expression: string;
  angle: number;
  image: string;
  // Share one sprite across several pose/expression triples: instead of
  // a duplicate base64 copy, name another graphic in the same actor and
  // the load path (migrateGameData) fills `image` in.
  imageRef?: string;
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

// Where in the story a scene belongs. The selector matches economic
// state; this matches dramatic position, so an introduction cannot
// play at the climax and a summing-up cannot play third.
export type NarratonAct = 'BEGINNING' | 'MIDDLE' | 'END';

export interface NarratonMeta {
  pool: string;                                   // selection pool membership
  keys?: Record<string, number | NarratonKey>;    // target values, least-squares matched
  requires?: NarratonRequirement[];               // hard gates
  repeatable?: boolean;                           // default false: plays once
  subplot?: string;                               // one scene per subplot in rotation
  weight?: number;                                // bias: score divides by this (default 1)
  // Act gate. Untagged scenes play in any act (so existing games are
  // unaffected). Matched against the `act` world variable —
  // 1/2/3 or the names — and applied softly: if no scene in the pool
  // fits the current act, the filter is dropped rather than dead-end.
  act?: NarratonAct;
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

// What a world variable MEANS, in words, so a moving gauge can explain
// itself. Doug's rule: say it in general terms and in concrete terms —
// "rent takes a larger share" AND "a week's work buys less bread".
export interface MeterMeaning {
  variable: string;
  label: string;              // RENT
  /** What it means when this rises — general. */
  rising: string;
  /** What it means when this falls — general. */
  falling: string;
  /** The same thing said concretely, in a life. */
  concrete?: string;
  /** Display range; defaults 0-100. */
  min?: number;
  max?: number;
  /** true when rising is bad for the humans (colours the readout). */
  risingIsHarm?: boolean;
}

// A named thing visible IN a backdrop image — BOAT1, BAR_STOOL,
// RUBBER_TREE — with its center in stage percent coordinates. Anchors
// make the painted scenery addressable: actors can FACE them, MOVE to
// them, and the CAMERA can frame them, without the object being a
// separate sprite.
export interface DropAnchor {
  id: string;      // BOAT1, RUBBER_TREE — unique within the drop
  label?: string;  // human description ("the near fishing boat")
  x: number;       // 0-100, stage percent
  y: number;       // 0-100
}

export interface Drop {
  id: string;
  name: string;
  prompt: string;
  anchors?: DropAnchor[];
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

// ============ QUOTE SYSTEM (Design Addendum 01 §6) ============
// A tagged verbatim quote; DISPUTED sourcing shows an attribution-
// contested tag rather than laundering a myth into a fact.
export interface Quote {
  text: string;
  speaker: string;
  source: string;
  year?: number;
  length: 'SHORT' | 'MEDIUM' | 'LONG';
  sourcing: 'VERIFIED' | 'DISPUTED';
  voice: 'CRITIC' | 'VILLAIN' | 'FICTION' | 'DROOG';
  themes: string[];
}

// theme fires when `variable` crosses `threshold` in `direction`
export interface QuoteTrigger {
  theme: string;
  variable: string;
  threshold: number;
  direction: 'rising' | 'falling';
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
  // What the world variables MEAN, for the live meter panel
  meters?: MeterMeaning[];
  quotes?: Quote[];
  quoteTriggers?: QuoteTrigger[];
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

  // Hydrate shared sprites. A pose matrix usually reuses one image
  // across several pose/expression triples (the same worker sprite for
  // Neutral, Tired and Angry). Storing a full base64 copy per triple
  // wasted 11 MB in one game alone, so builders may instead emit
  // `imageRef: "<graphic id>"` and let the load path fill in the
  // image. Everything downstream keeps reading `.image` as before.
  if (Array.isArray(migrated.actors)) {
    migrated.actors = migrated.actors.map((actor: any) => {
      if (!Array.isArray(actor?.graphics)) return actor;
      if (!actor.graphics.some((g: any) => g?.imageRef)) return actor;
      const byId = new Map<string, any>(actor.graphics.map((g: any) => [g.id, g]));
      const resolve = (g: any, seen = new Set<string>()): string | undefined => {
        if (g?.image) return g.image;
        if (!g?.imageRef || seen.has(g.id)) return undefined; // missing or cyclic
        seen.add(g.id);
        return resolve(byId.get(g.imageRef), seen);
      };
      return {
        ...actor,
        graphics: actor.graphics.map((g: any) => {
          if (g?.image || !g?.imageRef) return g;
          const image = resolve(g);
          if (!image) {
            console.warn(`actor "${actor.id}" graphic "${g.id}": imageRef "${g.imageRef}" does not resolve`);
            return g;
          }
          return { ...g, image };
        }),
      };
    });
  }

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
