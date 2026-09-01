import { describe, it, expect } from 'vitest';
import { Scene } from '../types';
import {
  toNumeric,
  scoreKey,
  rankScenes,
  pickNextScene,
  DEFAULT_MAX_MISS,
} from '../utils/narraton';

const scene = (id: string, key?: Record<string, number>, extra: Partial<Scene> = {}): Scene => ({
  id,
  name: id,
  key,
  ...extra,
});

describe('toNumeric', () => {
  it('passes numbers through', () => {
    expect(toNumeric(42)).toBe(42);
  });

  it('coerces numeric strings (SettingsEditor stores raw strings)', () => {
    expect(toNumeric('30')).toBe(30);
    expect(toNumeric(' 15 ')).toBe(15);
  });

  it('maps booleans to the 0-100 scale', () => {
    expect(toNumeric(true)).toBe(100);
    expect(toNumeric(false)).toBe(0);
  });

  it('returns null for missing or non-numeric values', () => {
    expect(toNumeric(undefined)).toBeNull();
    expect(toNumeric('gold ring')).toBeNull();
    expect(toNumeric('')).toBeNull();
  });
});

describe('scoreKey', () => {
  it('computes sum of squared differences', () => {
    const result = scoreKey(
      { Lola_happiness: 15, Boss_rep: 30 },
      { Lola_happiness: 20, Boss_rep: 25 },
    );
    // (20-15)^2 + (25-30)^2 = 25 + 25
    expect(result.score).toBe(50);
    expect(result.excluded).toBe(false);
    expect(result.missingVars).toEqual([]);
  });

  it('excludes on a single big miss (KoC: big misses exclude themselves)', () => {
    const result = scoreKey({ Boss_rep: 90 }, { Boss_rep: 10 });
    expect(result.excluded).toBe(true);
    expect(Math.abs(result.distances[0].diff)).toBeGreaterThan(DEFAULT_MAX_MISS);
  });

  it('honors a custom maxMissPerVariable', () => {
    const tight = scoreKey({ a: 30 }, { a: 45 }, { maxMissPerVariable: 10 });
    expect(tight.excluded).toBe(true);
    const loose = scoreKey({ a: 30 }, { a: 45 }, { maxMissPerVariable: 20 });
    expect(loose.excluded).toBe(false);
  });

  it('treats missing variables as 0 and reports them', () => {
    const result = scoreKey({ gang_morale: 40 }, {});
    expect(result.missingVars).toEqual(['gang_morale']);
    expect(result.score).toBe(1600);
    expect(result.excluded).toBe(false); // 40 <= DEFAULT_MAX_MISS
  });
});

describe('rankScenes', () => {
  const world = { Lola_happiness: 20, Boss_rep: 40 };
  const scenes: Scene[] = [
    scene('far', { Lola_happiness: 60 }),             // diff 40 -> score 1600
    scene('near', { Lola_happiness: 25, Boss_rep: 45 }), // 25 + 25 = 50
    scene('unkeyed'),                                  // not a candidate
    scene('emptykey', {}),                             // not a candidate
    scene('impossible', { Boss_rep: 100 }),            // diff 60 -> excluded
  ];

  it('omits scenes without a key and sorts eligible by ascending score', () => {
    const ranked = rankScenes(scenes, world);
    expect(ranked.map((m) => m.scene.id)).toEqual(['near', 'far', 'impossible']);
  });

  it('flags excluded scenes but keeps them at the tail for display', () => {
    const ranked = rankScenes(scenes, world);
    const last = ranked[ranked.length - 1];
    expect(last.scene.id).toBe('impossible');
    expect(last.excluded).toBe(true);
    expect(ranked.filter((m) => !m.excluded)).toHaveLength(2);
  });

  it('ignores in-scene variables entirely', () => {
    const withLocals = [
      scene('a', { mood: 50 }, { localVars: { secret: 999 } }),
    ];
    const ranked = rankScenes(withLocals, { mood: 50, secret: 0 });
    expect(ranked[0].score).toBe(0);
  });
});

describe('pickNextScene', () => {
  it('returns the best eligible match', () => {
    const pick = pickNextScene(
      [scene('a', { x: 10 }), scene('b', { x: 30 })],
      { x: 28 },
    );
    expect(pick?.scene.id).toBe('b');
  });

  it('returns null when every candidate excludes itself', () => {
    const pick = pickNextScene([scene('a', { x: 100 })], { x: 0 });
    expect(pick).toBeNull();
  });

  it('returns null when there are no keyed scenes', () => {
    expect(pickNextScene([scene('a')], { x: 0 })).toBeNull();
  });
});
