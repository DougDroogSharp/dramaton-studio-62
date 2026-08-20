// The instruments each era actually made.
//
// Doug photographed embroidered linen dials for William, brass survey
// instruments for Leopold, pixel readouts for Capone and flat comic
// panels for Elon — twelve parts in all, keyed and trimmed by
// scripts/prep-gauge-art.mjs into public/gauges/<era>/.
//
// The era is derived from the cabinet skin the game already declares
// (game.info.frame), so a game gets the right instruments by saying
// which cabinet it is played in, and nothing new has to be threaded
// through the runner.
//
// EVERY LOOKUP CAN RETURN NULL. A game with no era art, or art that has
// not been prepped yet, draws the plain CSS meters it always drew. The
// chrome is a finish, never a dependency.

export interface GaugeArt {
  era: string;
  frame: string;
  needle: string;
  bar: string;
  /** Where the needle turns, 0-1 of its own sprite. */
  pivot: { x: number; y: number };
}

/** Cabinet skin -> the era whose instruments belong in it. */
const ERA_FOR_FRAME: Record<string, string> = {
  linen: 'william',
  brass: 'leopold',
  amiga: 'capone',
  flat: 'elon',
};

// Measured by prep-gauge-art.mjs from the stitched boss on each needle,
// and copied here so the panel needs no fetch to draw a dial. Keep in
// step with public/gauges/pivots.json if the art is ever re-shot.
const PIVOTS: Record<string, { x: number; y: number }> = {
  william: { x: 0.490, y: 0.895 },
  leopold: { x: 0.548, y: 0.884 },
  capone:  { x: 0.500, y: 0.801 },
  elon:    { x: 0.489, y: 0.955 },
};

export function gaugeArtFor(frame?: string): GaugeArt | null {
  if (!frame) return null;
  const era = ERA_FOR_FRAME[frame];
  if (!era) return null;
  return {
    era,
    frame: `/gauges/${era}/frame.png`,
    needle: `/gauges/${era}/needle.png`,
    bar: `/gauges/${era}/bar.png`,
    pivot: PIVOTS[era] ?? { x: 0.5, y: 0.9 },
  };
}

/**
 * Needle angle for a value on a 240-degree sweep, the arc a real dial
 * leaves once its bottom third is taken up by the pivot and the label.
 * -120deg at empty, +120deg at full. Out-of-range values clamp rather
 * than spinning the needle round the post.
 */
export function needleAngle(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return -120;
  }
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return -120 + t * 240;
}
