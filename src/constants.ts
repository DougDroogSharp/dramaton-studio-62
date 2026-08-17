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

// Salvage taxonomy first (the canonical grammar), trunk originals after.
export const ITEM_CATEGORIES = [
  'costume', 'prop', 'knowledge', 'gear',
  'weapon', 'armor', 'consumable', 'key', 'misc',
] as const;
export const ACQUISITION_TYPES = ['pickup', 'earned', 'purchased'] as const;
export const OPERATORS = ['==', '!=', '>', '<', '>=', '<='] as const;

// AGENCY = the player acts; WITNESS = the player watches, but reacts.
// (Taxonomy salvaged from Dramaton Editor 2.0.)
export const SCENE_TYPES = ['AGENCY', 'WITNESS'] as const;

// Fixed audience reaction palette for WITNESS scenes.
export const WITNESS_REACTIONS = ['CHEER', 'BOO', 'SILENCE', 'WALK AWAY'] as const;
