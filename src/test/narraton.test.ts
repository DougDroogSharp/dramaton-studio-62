import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  narratonDirect,
  narratonRank,
  createNarratonHistory,
  logNarratonSelection,
  pickFromRanked,
  readAct,
} from '@/utils/narratonDirector';
import { parseScript, commandToString, NarratonCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, migrateGameData, GameData, Scene } from '@/types';

// The play-time selector: [NARRATON pool=x] over the flat Scene fields
// (pool, key, keyScale, requires, repeatable, weight, act, phase, subplotId).
// The same director drives the editor's board; see narratonDirector.test.ts
// for the board-side cases (phase gating, rotation, big misses).

const scene = (id: string, fields: Partial<Scene> = {}): Scene => ({ id, name: id, ...fields });

const pick = (
  pool: string,
  scenes: Scene[],
  vars: Record<string, string | number | boolean>,
  history = createNarratonHistory(),
) => narratonDirect(scenes, vars, history, { pool })?.scene ?? null;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'group').mockImplementation(() => {});
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('narraton selector (play time)', () => {
  it('picks the least-squares closest scene in the pool', () => {
    const scenes = [
      scene('low', { pool: 'main', key: { wages: 20 } }),
      scene('high', { pool: 'main', key: { wages: 80 } }),
    ];
    expect(pick('main', scenes, { wages: 30 })?.id).toBe('low');
    expect(pick('main', scenes, { wages: 70 })?.id).toBe('high');
  });

  it('only considers scenes in the pool', () => {
    const scenes = [
      scene('a', { pool: 'other', key: { wages: 30 } }),
      scene('b', { pool: 'main', key: { wages: 45 } }),
      scene('c'), // no narraton metadata at all
    ];
    const ranked = narratonRank(scenes, { wages: 30 }, createNarratonHistory(), { pool: 'main' });
    expect(ranked).toHaveLength(1);
    expect(pick('main', scenes, { wages: 30 })?.id).toBe('b');
  });

  it('a pool-only scene (no keys) is a candidate that matches any state perfectly', () => {
    const scenes = [scene('finale', { pool: 'main', requires: [{ variable: 'done', operator: '==', value: true }] })];
    const ranked = narratonRank(scenes, { done: true }, createNarratonHistory(), { pool: 'main' });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].ineligible).toBeUndefined();
    expect(ranked[0].score).toBe(0);
    expect(pick('main', scenes, { done: false })).toBeNull();
  });

  it('keyScale normalizes big-range variables so they do not dominate', () => {
    const scenes = [
      // hoard is far off in absolute terms but its range is 10000
      scene('scaled', { pool: 'main', key: { wages: 30, hoard: 50000 }, keyScale: { hoard: 10000 } }),
      scene('unscaled_far', { pool: 'main', key: { wages: 75 } }),
    ];
    const vars = { wages: 30, hoard: 45000 };
    const ranked = narratonRank(scenes, vars, createNarratonHistory(), { pool: 'main' });
    // scaled: 0² + (5000 × 100 / 10000)² = 2500 ; unscaled_far: 45² = 2025 but...
    expect(ranked.find(m => m.scene.id === 'scaled')?.score).toBeCloseTo(2500);
    expect(ranked.find(m => m.scene.id === 'unscaled_far')?.score).toBeCloseTo(2025);
    expect(pick('main', scenes, vars)?.id).toBe('unscaled_far');
    // ...without the scale, hoard would be a 5000-point miss and exclude the scene outright
    const unscaled = narratonRank(
      [scene('raw', { pool: 'main', key: { hoard: 50000 } })], vars, createNarratonHistory(), { pool: 'main' },
    );
    expect(unscaled[0].ineligible).toBe('big-miss');
  });

  it('a miss of more than half the scale excludes the scene', () => {
    const scenes = [scene('rich', { pool: 'main', key: { hoard: 50000 }, keyScale: { hoard: 10000 } })];
    expect(pick('main', scenes, { hoard: 44000 })).toBeNull();      // 6000 off: 60 normalized
    expect(pick('main', scenes, { hoard: 46000 })?.id).toBe('rich'); // 4000 off: 40 normalized
  });

  it('enforces hard requires gates', () => {
    const scenes = [
      scene('gated', { pool: 'main', key: { wages: 30 }, requires: [{ variable: 'era', operator: '==', value: 2 }] }),
      scene('open', { pool: 'main', key: { wages: 60 } }),
    ];
    expect(pick('main', scenes, { wages: 30, era: 1 })?.id).toBe('open'); // gated excluded despite better score
    expect(pick('main', scenes, { wages: 30, era: 2 })?.id).toBe('gated');
    const ranked = narratonRank(scenes, { wages: 30, era: 1 }, createNarratonHistory(), { pool: 'main' });
    const gated = ranked.find(m => m.scene.id === 'gated');
    expect(gated?.ineligible).toBe('gated');
    expect(gated?.detail).toMatch(/requires era == 2/);
  });

  it('excludes played non-repeatable scenes and keeps repeatable ones', () => {
    const scenes = [
      scene('once', { pool: 'main', key: { wages: 30 } }),
      scene('loop', { pool: 'main', key: { wages: 30 }, repeatable: true }),
    ];
    const history = createNarratonHistory();
    history.playedSceneIds.push('once', 'loop');
    expect(pick('main', scenes, { wages: 30 }, history)?.id).toBe('loop');
  });

  it('weight divides the score (bias toward heavier scenes)', () => {
    const scenes = [
      scene('plain', { pool: 'main', key: { wages: 40 } }),
      scene('heavy', { pool: 'main', key: { wages: 60 }, weight: 10 }),
    ];
    // wages=50: plain 10²=100; heavy 10²/10=10
    expect(pick('main', scenes, { wages: 50 })?.id).toBe('heavy');
  });

  it('rotation: the subplot that just played pays the penalty, so subplots braid', () => {
    const scenes = [
      scene('r1', { pool: 'main', subplotId: 'resistance', key: { tension: 50 } }),
      scene('r2', { pool: 'main', subplotId: 'resistance', key: { tension: 50 } }),
      scene('t1', { pool: 'main', subplotId: 'tycoon', key: { tension: 50 } }),
    ];
    const history = createNarratonHistory();
    history.playedSceneIds.push('r1');
    history.lastSubplotId = 'resistance';
    expect(pick('main', scenes, { tension: 50 }, history)?.id).toBe('t1');
  });

  it('breaks exact ties randomly at play time, deterministically on the board', () => {
    const scenes = [
      scene('first', { pool: 'main', key: { wages: 50 } }),
      scene('second', { pool: 'main', key: { wages: 50 } }),
    ];
    const ranked = narratonRank(scenes, { wages: 50 }, createNarratonHistory(), { pool: 'main' });
    expect(pickFromRanked(ranked)?.scene.id).toBe('first');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickFromRanked(ranked, 'random')?.scene.id).toBe('second');
    random.mockReturnValue(0);
    expect(pickFromRanked(ranked, 'random')?.scene.id).toBe('first');
  });

  it('returns null on an empty or fully-excluded pool', () => {
    expect(pick('main', [scene('x')], {})).toBeNull();
    const history = createNarratonHistory();
    history.playedSceneIds.push('only');
    expect(pick('main', [scene('only', { pool: 'main' })], {}, history)).toBeNull();
  });

  it('logs every decision to the console (story-space visibility)', () => {
    const scenes = [
      scene('near', { pool: 'main', key: { wages: 30 }, keyScale: { wages: 50 } }),
      scene('gated', { pool: 'main', requires: [{ variable: 'era', operator: '==', value: 2 }] }),
    ];
    const vars = { wages: 35, era: 1 };
    const ranked = narratonRank(scenes, vars, createNarratonHistory(), { pool: 'main' });
    logNarratonSelection('main', ranked, pickFromRanked(ranked), vars);
    expect(console.group).toHaveBeenCalledWith(expect.stringContaining('pool "main": 2 candidates, 1 eligible'));
    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.map(c => String(c[0]));
    expect(logged.some(l => l.includes('EXCLUDED: requires era == 2'))).toBe(true);
    expect(logged.some(l => l.includes('wages: 35→30 (×100/50=10.0)'))).toBe(true);
    expect(logged.some(l => l.includes('WINNER: near'))).toBe(true);
  });
});

describe('NARRATON command', () => {
  it('parses with and without a pool', () => {
    expect(parseScript('[NARRATON pool=era2]')[0]).toEqual({ type: 'NARRATON', pool: 'era2' });
    expect(parseScript('[NARRATON]')[0]).toEqual({ type: 'NARRATON', pool: 'main' });
  });

  it('round-trips through the serializer', () => {
    const cmd = parseScript('[NARRATON pool=era2]')[0] as NarratonCommand;
    expect(commandToString(cmd)).toBe('[NARRATON pool=era2]');
  });

  it('transitions to the selected scene and records history', () => {
    const game: GameData = createDefaultGame();
    game.info.worldState = { wages: 25 };
    game.scenes.push({ id: 'hub', name: 'Hub', script: '[NARRATON pool=main]' });
    game.scenes.push({
      id: 'poverty', name: 'Poverty', script: '[SET seen = true]\n[NARRATON pool=main]',
      pool: 'main', key: { wages: 20 },
    });
    game.scenes.push({
      id: 'plenty', name: 'Plenty', script: '',
      pool: 'main', key: { wages: 60 },
    });

    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'hub' }));

    // hub → poverty (wages 25 ≈ 20), whose script NARRATONs again;
    // poverty is now played/non-repeatable, so → plenty
    expect(result.current.state.worldState.seen).toBe(true);
    expect(result.current.state.currentSceneId).toBe('plenty');
    expect(console.group).toHaveBeenCalledWith(expect.stringContaining('[Narraton] pool "main"'));
  });

  it('a legacy save (nested scene.narraton) plays the same after the loader lifts it', () => {
    const game: GameData = createDefaultGame();
    game.info.worldState = { wages: 25 };
    game.scenes.push({ id: 'hub', name: 'Hub', script: '[NARRATON pool=main]' });
    game.scenes.push({
      id: 'poverty', name: 'Poverty', script: '',
      ...({ narraton: { pool: 'main', keys: { wages: { target: 20, scale: 100 } } } } as object),
    });
    // The runner reads flat fields only; a raw legacy scene is invisible...
    const raw = renderHook(() => useScriptRunner({ game, startSceneId: 'hub' }));
    expect(raw.result.current.state.currentSceneId).toBe('hub');
    // ...until the loader lifts it (every load path goes through migrateGameData)
    const lifted = migrateGameData(JSON.parse(JSON.stringify(game)));
    const { result } = renderHook(() => useScriptRunner({ game: lifted, startSceneId: 'hub' }));
    expect(result.current.state.currentSceneId).toBe('poverty');
  });

  it('continues the script when the pool is empty (fail soft)', () => {
    const game: GameData = createDefaultGame();
    game.scenes.push({ id: 'hub', name: 'Hub', script: '[NARRATON pool=empty]\n[SET after = true]' });

    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'hub' }));

    expect(result.current.state.currentSceneId).toBe('hub');
    expect(result.current.state.worldState.after).toBe(true);
  });
});

describe('act gate', () => {
  const mk = (id: string, act?: 'BEGINNING' | 'MIDDLE' | 'END'): Scene => ({
    id, name: id, script: '', pool: 'p', ...(act ? { act } : {}),
  });

  it('keeps only scenes of the current act', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('mid', 'MIDDLE'), mk('close', 'END')];
    expect(pick('p', scenes, { act: 2 })?.id).toBe('mid');
    const ranked = narratonRank(scenes, { act: 2 }, createNarratonHistory(), { pool: 'p' });
    expect(ranked.find(m => m.scene.id === 'close')?.ineligible).toBe('wrong-act');
  });

  it('accepts act names as well as numbers', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    expect(pick('p', scenes, { act: 'end' })?.id).toBe('close');
    expect(readAct({ act: '3' })).toBe('END');
    expect(readAct({ act: 'middle' })).toBe('MIDDLE');
    expect(readAct({})).toBeNull();
    expect(readAct({ act: 'act four' })).toBeNull();
  });

  it('untagged scenes play in any act', () => {
    const scenes = [mk('any'), mk('close', 'END')];
    expect(pick('p', scenes, { act: 1 })?.id).toBe('any');
  });

  it('with no act variable, nothing is gated (existing games unaffected)', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    const ranked = narratonRank(scenes, {}, createNarratonHistory(), { pool: 'p' });
    expect(ranked.every(m => !m.ineligible)).toBe(true);
    expect(pick('p', scenes, {})).not.toBeNull();
  });

  it('drops the gate rather than dead-ending when no scene fits, and says so in the log', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    const vars = { act: 2 };
    const ranked = narratonRank(scenes, vars, createNarratonHistory(), { pool: 'p' });
    const winner = pickFromRanked(ranked);
    expect(winner).not.toBeNull();
    logNarratonSelection('p', ranked, winner, vars);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('ignoring the act gate'));
  });

  it('an unrecognized act value is ignored', () => {
    expect(pick('p', [mk('open', 'BEGINNING')], { act: 'act four' })?.id).toBe('open');
  });
});
