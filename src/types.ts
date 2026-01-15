// Dramaton Editor Types

export type SelectionType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx';

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
  elevenLabsApiKey?: string;
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
}

export interface Actor {
  id: string;
  name: string;
  image?: string;
  referenceImageCloseUp?: string;
  referenceImageFullBody?: string;
  voiceId?: string;
  graphics: ActorGraphic[];
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

export interface Scene {
  id: string;
  name: string;
  sceneType?: string;
  dropId?: string;
  stage?: StageElement[];
  script?: string;
  audioData?: Record<string, string>;
}

export interface Drop {
  id: string;
  name: string;
  prompt: string;
  image?: string;
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
  effects: ItemEffect[];
  unlockCondition?: UnlockCondition;
}

export type SfxType = 'glow' | 'pulse' | 'shake' | 'jiggle' | 'fade' | 'electric';
export type SfxCategory = 'ATTACH' | 'DO';

export interface SfxParams {
  intensity: number;
  speed?: number;
  color?: string;
  duration?: number;
}

export interface Sfx {
  id: string;
  name: string;
  type: SfxType;
  category: SfxCategory;
  params: SfxParams;
  prompt?: string;
}

export interface GameData {
  info: GameInfo;
  actors: Actor[];
  scenes: Scene[];
  drops: Drop[];
  items: Item[];
  sfx: Sfx[];
}

// Default game state
export const createDefaultGame = (): GameData => ({
  info: {
    title: 'Untitled Protocol',
    author: 'Unknown Architect',
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
});
