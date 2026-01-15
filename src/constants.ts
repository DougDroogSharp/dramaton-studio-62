// Dramaton Editor Constants

export const POSES = [
  'Closeup',
  'Neutral',
  'Full Body',
  'Pointing',
  'Wave',
  'Crouch',
  'Run',
  'Jump',
  'Attack',
  'Defense',
  'Sit',
  'Lean',
];

export const EXPRESSIONS = [
  'Neutral',
  'Happy',
  'Sad',
  'Angry',
  'Surprised',
  'Scared',
  'Confused',
  'Determined',
  'Smug',
  'Tired',
];

export const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export const SFX_TYPES: Record<'ATTACH' | 'DO', string[]> = {
  ATTACH: ['glow', 'pulse', 'jiggle', 'electric'],
  DO: ['shake', 'fade'],
};

export const ITEM_CATEGORIES = ['weapon', 'armor', 'consumable', 'key', 'misc'] as const;
export const ACQUISITION_TYPES = ['pickup', 'earned', 'purchased'] as const;
export const OPERATORS = ['==', '!=', '>', '<', '>=', '<='] as const;

export const SCENE_TYPES = [
  'Dialogue',
  'Cutscene',
  'Battle',
  'Exploration',
  'Puzzle',
  'Menu',
];

export const WITNESS_REACTIONS = [
  'neutral',
  'surprised',
  'angry',
  'scared',
  'happy',
];
