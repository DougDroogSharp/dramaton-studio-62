import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrateGameData, createDefaultGame } from '@/types';

// Shared sprites: a pose matrix reuses one image across several
// pose/expression triples. Builders emit imageRef instead of a
// duplicate base64 copy; migrateGameData hydrates on load so nothing
// downstream (Stage, portraits, the runner) has to know.

describe('imageRef hydration', () => {
  afterEach(() => vi.restoreAllMocks());

  const withGraphics = (graphics: unknown[]) => {
    const game = createDefaultGame();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (game as any).actors = [{ id: 'worker', name: 'Worker', status: 'work', graphics }];
    return game;
  };

  it('fills image from the referenced graphic', () => {
    const g = migrateGameData(withGraphics([
      { id: 'a', pose: 'Work', expression: 'Neutral', angle: 0, image: 'data:image/png;base64,AAA' },
      { id: 'b', pose: 'Work', expression: 'Tired', angle: 0, image: '', imageRef: 'a' },
    ]));
    expect(g.actors[0].graphics[1].image).toBe('data:image/png;base64,AAA');
    // the original is untouched
    expect(g.actors[0].graphics[0].image).toBe('data:image/png;base64,AAA');
  });

  it('follows a chain of references', () => {
    const g = migrateGameData(withGraphics([
      { id: 'a', pose: 'P', expression: 'A', angle: 0, image: 'IMG' },
      { id: 'b', pose: 'P', expression: 'B', angle: 0, image: '', imageRef: 'a' },
      { id: 'c', pose: 'P', expression: 'C', angle: 0, image: '', imageRef: 'b' },
    ]));
    expect(g.actors[0].graphics[2].image).toBe('IMG');
  });

  it('survives a dangling ref and a cycle without crashing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = migrateGameData(withGraphics([
      { id: 'a', pose: 'P', expression: 'A', angle: 0, image: '', imageRef: 'nope' },
      { id: 'b', pose: 'P', expression: 'B', angle: 0, image: '', imageRef: 'c' },
      { id: 'c', pose: 'P', expression: 'C', angle: 0, image: '', imageRef: 'b' },
    ]));
    expect(g.actors[0].graphics.every(x => !x.image)).toBe(true);
  });

  it('leaves games without imageRef completely untouched', () => {
    const graphics = [{ id: 'a', pose: 'P', expression: 'A', angle: 0, image: 'IMG' }];
    const g = migrateGameData(withGraphics(graphics));
    expect(g.actors[0].graphics).toEqual(graphics);
  });

  it('the shipped Machine game hydrates every graphic', () => {
    const raw = readFileSync(resolve(__dirname, '../../public/hvb-machine.json'), 'utf8');
    const game = migrateGameData(JSON.parse(raw));
    const all = game.actors.flatMap(a => a.graphics);
    expect(all.length).toBeGreaterThan(0);
    // every graphic ends up with a real image after hydration
    expect(all.every(g => typeof g.image === 'string' && g.image.startsWith('data:image'))).toBe(true);
    // and the file itself carries no duplicate copies
    const embedded = all.filter(g => raw.includes(`"image":"${g.image}"`)).length;
    expect(new Set(all.map(g => g.image)).size).toBeLessThan(all.length);
    expect(embedded).toBeGreaterThan(0);
  });
});
