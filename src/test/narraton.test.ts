import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { selectNarratonScene, createNarratonHistory } from '@/utils/narraton';
import { parseScript, commandToString, NarratonCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, Scene, NarratonMeta } from '@/types';

const scene = (id: string, narraton?: NarratonMeta): Scene => ({ id, name: id, narraton });

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'group').mockImplementation(() => {});
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('narraton selector', () => {
  it('picks the least-squares closest scene', () => {
    const scenes = [
      scene('low', { pool: 'main', keys: { wages: 20 } }),
      scene('high', { pool: 'main', keys: { wages: 80 } }),
    ];
    const { winner } = selectNarratonScene('main', scenes, { wages: 30 }, createNarratonHistory());
    expect(winner?.id).toBe('low');

    const { winner: w2 } = selectNarratonScene('main', scenes, { wages: 70 }, createNarratonHistory());
    expect(w2?.id).toBe('high');
  });

  it('only considers scenes in the pool', () => {
    const scenes = [
      scene('a', { pool: 'other', keys: { wages: 30 } }),
      scene('b', { pool: 'main', keys: { wages: 99 } }),
      scene('c'), // no narraton metadata at all
    ];
    const { winner, candidates } = selectNarratonScene('main', scenes, { wages: 30 }, createNarratonHistory());
    expect(winner?.id).toBe('b');
    expect(candidates).toHaveLength(1);
  });

  it('normalizes keys by scale so large-range variables do not dominate', () => {
    const scenes = [
      // hoard is far off in absolute terms but scaled by 10000
      scene('scaled', { pool: 'main', keys: { wages: { target: 30, scale: 100 }, hoard: { target: 50000, scale: 10000 } } }),
      // wages close but hoard key unscaled would dwarf everything
      scene('unscaled_far', { pool: 'main', keys: { wages: { target: 90, scale: 100 } } }),
    ];
    const vars = { wages: 30, hoard: 45000 };
    const { winner, candidates } = selectNarratonScene('main', scenes, vars, createNarratonHistory());
    // scaled: (0)² + (5000/10000)² = 0.25 ; unscaled_far: (60/100)² = 0.36
    expect(winner?.id).toBe('scaled');
    expect(candidates.find(c => c.scene.id === 'scaled')?.score).toBeCloseTo(0.25);
  });

  it('enforces hard requires gates', () => {
    const scenes = [
      scene('gated', { pool: 'main', keys: { wages: 30 }, requires: [{ variable: 'era', operator: '==', value: 2 }] }),
      scene('open', { pool: 'main', keys: { wages: 90 } }),
    ];
    const { winner } = selectNarratonScene('main', scenes, { wages: 30, era: 1 }, createNarratonHistory());
    expect(winner?.id).toBe('open'); // gated excluded despite better score

    const { winner: w2 } = selectNarratonScene('main', scenes, { wages: 30, era: 2 }, createNarratonHistory());
    expect(w2?.id).toBe('gated');
  });

  it('excludes played non-repeatable scenes and keeps repeatable ones', () => {
    const scenes = [
      scene('once', { pool: 'main', keys: { wages: 30 } }),
      scene('loop', { pool: 'main', keys: { wages: 30 }, repeatable: true }),
    ];
    const history = createNarratonHistory();
    history.played.add('once');
    history.played.add('loop');
    const { winner } = selectNarratonScene('main', scenes, { wages: 30 }, history);
    expect(winner?.id).toBe('loop');
  });

  it('rotates subplots: only the first unplayed subplot scene is eligible', () => {
    const scenes = [
      scene('r1', { pool: 'main', subplot: 'resistance', keys: { wages: 90 } }),
      scene('r2', { pool: 'main', subplot: 'resistance', keys: { wages: 30 } }),
    ];
    // r2 matches better, but r1 is the subplot's next in rotation
    const history = createNarratonHistory();
    const { winner } = selectNarratonScene('main', scenes, { wages: 30 }, history);
    expect(winner?.id).toBe('r1');

    history.played.add('r1');
    const { winner: w2 } = selectNarratonScene('main', scenes, { wages: 30 }, history);
    expect(w2?.id).toBe('r2');
  });

  it('weight divides the score (bias toward heavier scenes)', () => {
    const scenes = [
      scene('plain', { pool: 'main', keys: { wages: 40 } }),
      scene('heavy', { pool: 'main', keys: { wages: 60 }, weight: 10 }),
    ];
    // wages=50: plain score (10/100)²=0.01; heavy (10/100)²/10=0.001
    const { winner } = selectNarratonScene('main', scenes, { wages: 50 }, createNarratonHistory());
    expect(winner?.id).toBe('heavy');
  });

  it('returns null on an empty or fully-excluded pool', () => {
    expect(selectNarratonScene('main', [scene('x')], {}, createNarratonHistory()).winner).toBeNull();
    const history = createNarratonHistory();
    history.played.add('only');
    const scenes = [scene('only', { pool: 'main' })];
    expect(selectNarratonScene('main', scenes, {}, history).winner).toBeNull();
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
      narraton: { pool: 'main', keys: { wages: 20 } },
    });
    game.scenes.push({
      id: 'plenty', name: 'Plenty', script: '',
      narraton: { pool: 'main', keys: { wages: 90 } },
    });

    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'hub' }));

    // hub → poverty (wages 25 ≈ 20), whose script NARRATONs again;
    // poverty is now played/non-repeatable, so → plenty
    expect(result.current.state.worldState.seen).toBe(true);
    expect(result.current.state.currentSceneId).toBe('plenty');
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
    id, name: id, script: '',
    narraton: { pool: 'p', ...(act ? { act } : {}) },
  });

  it('keeps only scenes of the current act', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('mid', 'MIDDLE'), mk('close', 'END')];
    const sel = selectNarratonScene('p', scenes, { act: 2 }, createNarratonHistory());
    expect(sel.winner?.id).toBe('mid');
  });

  it('accepts act names as well as numbers', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    expect(selectNarratonScene('p', scenes, { act: 'end' }, createNarratonHistory()).winner?.id).toBe('close');
  });

  it('untagged scenes play in any act', () => {
    const scenes = [mk('any'), mk('close', 'END')];
    const sel = selectNarratonScene('p', scenes, { act: 1 }, createNarratonHistory());
    expect(sel.winner?.id).toBe('any');
  });

  it('with no act variable, nothing is gated (existing games unaffected)', () => {
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    const sel = selectNarratonScene('p', scenes, {}, createNarratonHistory());
    expect(sel.winner).not.toBeNull();
    expect(sel.candidates.every(c => c.eligible)).toBe(true);
  });

  it('drops the gate rather than dead-ending when no scene fits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scenes = [mk('open', 'BEGINNING'), mk('close', 'END')];
    const sel = selectNarratonScene('p', scenes, { act: 2 }, createNarratonHistory());
    expect(sel.winner).not.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('an unrecognized act value is ignored', () => {
    const scenes = [mk('open', 'BEGINNING')];
    expect(selectNarratonScene('p', scenes, { act: 'act four' }, createNarratonHistory()).winner?.id).toBe('open');
  });
});
