import { describe, it, expect } from 'vitest';
import { DEFAULT_ABILITY_SETTINGS, ABILITY_PRESETS } from '@/utils/accessibility';

// The rule this file exists to protect: the show SPEAKS by default.
//
// Voice used to require presentation==='sound' || describeAction, so a
// player who picked "Play it as it comes" -- an option whose own text
// promises "Balloons, sound, and normal pacing" -- got silence. Speech
// had been built as an accessibility grant rather than as part of the
// show. Mute is how you turn it off; 'visual' is the only silent mode.
const speaks = (s: { presentation: string }) => s.presentation !== 'visual';

describe('the show speaks by default', () => {
  it('speaks with the shipped defaults', () => {
    expect(speaks(DEFAULT_ABILITY_SETTINGS)).toBe(true);
  });

  it('speaks under every accessibility preset', () => {
    // None of these are reasons to take the voice away. Someone who
    // needs more time, or less motion, or one-switch input, still hears
    // the show.
    for (const preset of ABILITY_PRESETS) {
      const applied = preset.apply(DEFAULT_ABILITY_SETTINGS);
      expect(speaks(applied), `preset "${preset.id}" fell silent`).toBe(true);
    }
  });

  it('is silent only when the player asks for captions instead', () => {
    expect(speaks({ ...DEFAULT_ABILITY_SETTINGS, presentation: 'visual' })).toBe(false);
  });
});

describe('the bezel switch', () => {
  it('is on by default — the case is the game\'s look, not an add-on', () => {
    expect(DEFAULT_ABILITY_SETTINGS.showBezel).toBe(true);
  });

  it('survives every accessibility preset', () => {
    // None of these are reasons to take the frame away. A player who
    // needs more time or less motion has said nothing about ornament.
    for (const preset of ABILITY_PRESETS) {
      const applied = preset.apply(DEFAULT_ABILITY_SETTINGS);
      expect(applied.showBezel, `preset "${preset.id}" removed the bezel`).toBe(true);
    }
  });
});
