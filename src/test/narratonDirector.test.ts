import { describe, it, expect, vi } from 'vitest';
import { Scene } from '../types';
import {
  toNumeric,
  scoreKey,
  rankScenes,
  pickNextScene,
  narratonRank,
  narratonDirect,
  pickFromRanked,
  isNarratonCandidate,
  keyScaleFor,
  DEFAULT_MAX_MISS,
  DEFAULT_ROTATION_PENALTY,
} from '../utils/narratonDirector';

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

  it('excludes on a non-numeric key target instead of scoring NaN', () => {
    const result = scoreKey({ bad: 'high' as unknown as number }, { bad: 50 });
    expect(result.excluded).toBe(true);
    expect(result.missingVars).toContain('bad');
    expect(Number.isFinite(result.score)).toBe(true);
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

describe('narratonRank / narratonDirect (the director)', () => {
  // Two subplots, both keyed at the same distance so structure decides.
  const world = { tension: 50 };
  const board: Scene[] = [
    scene('pinky_open', { tension: 50 }, { subplotId: 'pinky', phase: 'BEGINNING' }),
    scene('pinky_mid', { tension: 50 }, { subplotId: 'pinky', phase: 'MIDDLE' }),
    scene('pinky_end', { tension: 50 }, { subplotId: 'pinky', phase: 'END' }),
    scene('tony_open', { tension: 50 }, { subplotId: 'tony', phase: 'BEGINNING' }),
    scene('freefloat', { tension: 55 }), // unphased, no subplot
  ];

  it('never repeats a played scene', () => {
    const ranked = narratonRank(board, world, { playedSceneIds: ['pinky_open'] });
    const entry = ranked.find(m => m.scene.id === 'pinky_open');
    expect(entry?.ineligible).toBe('played');
  });

  it('gates phases: MIDDLE waits for its subplot BEGINNING, END for MIDDLE', () => {
    const fresh = narratonRank(board, world, { playedSceneIds: [] });
    expect(fresh.find(m => m.scene.id === 'pinky_mid')?.ineligible).toBe('wrong-phase');
    expect(fresh.find(m => m.scene.id === 'pinky_end')?.ineligible).toBe('wrong-phase');
    expect(fresh.find(m => m.scene.id === 'pinky_open')?.ineligible).toBeUndefined();

    const after = narratonRank(board, world, { playedSceneIds: ['pinky_open'] });
    expect(after.find(m => m.scene.id === 'pinky_mid')?.ineligible).toBeUndefined();
    expect(after.find(m => m.scene.id === 'pinky_end')?.ineligible).toBe('wrong-phase');
  });

  it('unphased scenes are always phase-eligible', () => {
    const ranked = narratonRank(board, world, { playedSceneIds: [] });
    expect(ranked.find(m => m.scene.id === 'freefloat')?.ineligible).toBeUndefined();
  });

  it('rotation: the last subplot pays a score penalty, so owners braid', () => {
    // pinky_open played (subplot pinky); pinky_mid and tony_open both score 0.
    const pick = narratonDirect(board, world, {
      playedSceneIds: ['pinky_open'],
      lastSubplotId: 'pinky',
    });
    expect(pick?.scene.id).toBe('tony_open');
    // With rotation disabled, same-subplot pinky_mid can tie-lead again.
    const noRotation = narratonDirect(board, world, {
      playedSceneIds: ['pinky_open'],
      lastSubplotId: 'pinky',
    }, { rotationPenalty: 0 });
    expect(['pinky_mid', 'tony_open']).toContain(noRotation?.scene.id);
  });

  it('big-miss exclusion carries through as a reason', () => {
    const ranked = narratonRank([scene('far', { tension: 100 })], { tension: 0 }, { playedSceneIds: [] });
    expect(ranked[0].ineligible).toBe('big-miss');
  });

  it('returns null when the board is exhausted', () => {
    const pick = narratonDirect(board, world, {
      playedSceneIds: ['pinky_open', 'pinky_mid', 'pinky_end', 'tony_open', 'freefloat'],
    });
    expect(pick).toBeNull();
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

// The unified shape (2026-09-02): the fields the theater runtime used to keep
// in a nested `narraton` object now sit flat on the Scene, read here.
describe('unified metadata: pool, keyScale, requires, repeatable, weight, act', () => {
  it('a scene is a candidate when keyed OR pooled', () => {
    expect(isNarratonCandidate(scene('keyed', { x: 1 }))).toBe(true);
    expect(isNarratonCandidate(scene('pooled', undefined, { pool: 'main' }))).toBe(true);
    expect(isNarratonCandidate(scene('blank_pool', undefined, { pool: '  ' }))).toBe(false);
    expect(isNarratonCandidate(scene('empty_key', {}))).toBe(false);
    expect(isNarratonCandidate(scene('nothing'))).toBe(false);
    // ...and pool-only scenes rank with a perfect score
    const ranked = rankScenes([scene('pooled', undefined, { pool: 'main' })], {});
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBe(0);
  });

  it('scoreKey normalizes each key by its scale and reports both diffs', () => {
    const r = scoreKey({ hoard: 500, wages: 40 }, { hoard: 400, wages: 50 }, {}, { hoard: 200 });
    const hoard = r.distances.find(d => d.variable === 'hoard')!;
    expect(hoard.diff).toBe(-100);
    expect(hoard.scale).toBe(200);
    expect(hoard.normalizedDiff).toBe(-50);
    const wages = r.distances.find(d => d.variable === 'wages')!;
    expect(wages.scale).toBe(100);
    expect(wages.normalizedDiff).toBe(10);
    expect(r.score).toBe(2500 + 100);
    expect(r.excluded).toBe(false); // exactly half the scale is not a big miss
    expect(scoreKey({ hoard: 500 }, { hoard: 399 }, {}, { hoard: 200 }).excluded).toBe(true);
    // a garbage scale falls back to 100
    expect(keyScaleFor({ hoard: 0 }, 'hoard')).toBe(100);
    expect(keyScaleFor({ hoard: NaN }, 'hoard')).toBe(100);
    expect(keyScaleFor(undefined, 'hoard')).toBe(100);
  });

  it('narratonRank restricts the board to a pool when asked', () => {
    const board = [
      scene('a', { x: 10 }, { pool: 'main' }),
      scene('b', { x: 10 }, { pool: 'side' }),
      scene('c', { x: 10 }),
    ];
    expect(narratonRank(board, { x: 10 }).map(m => m.scene.id)).toEqual(['a', 'b', 'c']);
    expect(narratonRank(board, { x: 10 }, undefined, { pool: 'side' }).map(m => m.scene.id)).toEqual(['b']);
    expect(narratonDirect(board, { x: 10 }, undefined, { pool: 'none' })).toBeNull();
  });

  it('gated scenes are flagged with the failing requirement', () => {
    const board = [scene('lever', { x: 10 }, { requires: [{ variable: 'singleTax', operator: '==', value: 1 }] })];
    const closed = narratonRank(board, { x: 10, singleTax: 0 });
    expect(closed[0].ineligible).toBe('gated');
    expect(closed[0].detail).toContain('requires singleTax == 1');
    expect(narratonRank(board, { x: 10, singleTax: 1 })[0].ineligible).toBeUndefined();
  });

  it('repeatable scenes survive play history; others do not', () => {
    const board = [
      scene('once', { x: 10 }),
      scene('again', { x: 10 }, { repeatable: true }),
    ];
    const ranked = narratonRank(board, { x: 10 }, { playedSceneIds: ['once', 'again'] });
    expect(ranked.find(m => m.scene.id === 'once')?.ineligible).toBe('played');
    expect(ranked.find(m => m.scene.id === 'again')?.ineligible).toBeUndefined();
  });

  it('weight divides the score before the rotation penalty is added', () => {
    const board = [scene('heavy', { x: 30 }, { weight: 2, subplotId: 'sp' })];
    const plain = narratonRank(board, { x: 10 });
    expect(plain[0].score).toBe(400);
    expect(plain[0].adjustedScore).toBe(200);
    const rotated = narratonRank(board, { x: 10 }, { playedSceneIds: [], lastSubplotId: 'sp' });
    expect(rotated[0].adjustedScore).toBe(200 + DEFAULT_ROTATION_PENALTY);
    // a garbage weight counts as 1
    expect(narratonRank([scene('w0', { x: 30 }, { weight: 0 })], { x: 10 })[0].adjustedScore).toBe(400);
  });

  it('the act gate marks wrong-act scenes and drops itself when nothing fits', () => {
    const board = [
      scene('open', { x: 10 }, { act: 'BEGINNING' }),
      scene('close', { x: 10 }, { act: 'END' }),
      scene('any', { x: 12 }),
    ];
    const inAct1 = narratonRank(board, { x: 10, act: 1 });
    expect(inAct1.find(m => m.scene.id === 'close')?.ineligible).toBe('wrong-act');
    expect(inAct1.find(m => m.scene.id === 'open')?.ineligible).toBeUndefined();
    expect(inAct1.find(m => m.scene.id === 'any')?.ineligible).toBeUndefined();
    // act 2: no scene is tagged MIDDLE but 'any' fits, so the tagged ones are gated
    const inAct2 = narratonRank(board, { x: 10, act: 'MIDDLE' });
    expect(inAct2.filter(m => !m.ineligible).map(m => m.scene.id)).toEqual(['any']);
    // nothing fits at all → the gate is dropped, everyone stays eligible
    const dropped = narratonRank(board.slice(0, 2), { x: 10, act: 2 });
    expect(dropped.every(m => !m.ineligible)).toBe(true);
    // gates and history are checked before the act
    const played = narratonRank(board, { x: 10, act: 1 }, { playedSceneIds: ['open'] });
    expect(played.find(m => m.scene.id === 'open')?.ineligible).toBe('played');
  });

  it('pickFromRanked: stable by default, random tie-break on request', () => {
    const board = [scene('a', { x: 10 }), scene('b', { x: 10 }), scene('c', { x: 20 })];
    const ranked = narratonRank(board, { x: 10 });
    expect(pickFromRanked(ranked)?.scene.id).toBe('a');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.7);
    expect(pickFromRanked(ranked, 'random')?.scene.id).toBe('b'); // c is not tied
    random.mockRestore();
    expect(pickFromRanked([], 'random')).toBeNull();
  });
});
