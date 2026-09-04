// Dramaton Editor Constants

// Editor version, shown beside the title in the toolbar and on the splash
// (standing rule: every tool shows its version beside its on-screen title).
// Bump on every commit that changes the editor's behaviour.
export const EDITOR_VERSION = '1.03';

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
  ATTACH: ['glow', 'pulse', 'jiggle', 'electric', 'flame'],
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
