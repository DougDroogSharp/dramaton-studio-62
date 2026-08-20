import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame } from '@/types';
import { metersFor } from '@/utils/meters';

describe('the conquest opening drives the model', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.spyOn(console,'warn').mockImplementation(()=>{}); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('a scene that moves rent and hoard produces explainable meter rows', () => {
    // The bug this covers: the opening scenes were written with no SET
    // at all, so the shelf correctly said "nothing has moved" for the
    // whole conquest -- while narrating the invention of rent.
    const game = createDefaultGame();
    game.info.worldState = { rent: 0, hoard: 0, wages: 30, shared: 30 };
    game.scenes.push({
      id: 's1', name: 'S1',
      script: '[SET rent = rent + 14]\n[SET hoard = hoard + 14]\n[SET wages = wages - 8]',
    });
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    act(() => { vi.advanceTimersByTime(100); });

    const moves = result.current.state.meterMoves;
    expect(moves.get('rent')).toMatchObject({ from: 0, to: 14 });
    expect(moves.get('hoard')).toMatchObject({ from: 0, to: 14 });
    expect(moves.get('wages')).toMatchObject({ from: 30, to: 22 });

    // And each has a MEANING, or the panel would drop it silently.
    const known = metersFor(game.meters);
    for (const v of ['rent', 'hoard', 'wages']) {
      expect(known.get(v), `${v} has no meaning; the panel would show nothing`).toBeTruthy();
    }
  });
});
