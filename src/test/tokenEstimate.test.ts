import { describe, it, expect } from 'vitest';
import { estimateImageTokens, estimateProjectTokens, formatTokens } from '@/utils/tokenEstimate';
import { createDefaultGame } from '@/types';

// A data URL whose base64 payload has a chosen length
const dataUrlOfSize = (base64Length: number) =>
  'data:image/png;base64,' + 'A'.repeat(base64Length);

describe('estimateImageTokens', () => {
  it('returns 0 for missing, non-data, or malformed input', () => {
    expect(estimateImageTokens(null)).toBe(0);
    expect(estimateImageTokens(undefined)).toBe(0);
    expect(estimateImageTokens('https://example.com/x.png')).toBe(0);
    expect(estimateImageTokens('data:image/png,notbase64')).toBe(0);
  });

  it('scales the estimate with payload size', () => {
    const small = estimateImageTokens(dataUrlOfSize(10_000));    // <50KB bytes
    const large = estimateImageTokens(dataUrlOfSize(600_000));   // >400KB bytes
    expect(small).toBe(85);
    expect(large).toBe(1360);
  });
});

describe('estimateProjectTokens', () => {
  it('is 0 for an empty game', () => {
    expect(estimateProjectTokens(createDefaultGame())).toBe(0);
  });

  it('sums images and prompts across the generation surface', () => {
    const game = createDefaultGame();
    game.info.styleGuide = dataUrlOfSize(10_000);                             // 85
    game.actors = [{
      id: 'a1', name: 'A',
      referenceImageCloseUp: dataUrlOfSize(10_000),                           // 85
      graphics: [{ id: 'g1', pose: 'Neutral', expression: 'Neutral', angle: 0,
        image: dataUrlOfSize(10_000), generatedPrompt: 'x'.repeat(40) }],     // 85 + 10
    }];
    game.drops = [{ id: 'd1', name: 'D', prompt: 'y'.repeat(20),              // 5
      image: dataUrlOfSize(10_000) }];                                        // 85
    game.items = [{ id: 'i1', name: 'I', category: 'prop', acquisition: 'pickup',
      effects: [], visualAsset: dataUrlOfSize(10_000) }];                     // 85
    expect(estimateProjectTokens(game)).toBe(85 * 5 + 10 + 5);
  });
});

describe('formatTokens', () => {
  it('formats small and large counts', () => {
    expect(formatTokens(999)).toBe('999');
    expect(formatTokens(1500)).toBe('1.5k');
  });
});
