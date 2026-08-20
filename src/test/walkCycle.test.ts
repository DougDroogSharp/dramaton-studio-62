import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

// Two-frame walk cycle: while a MOVE is in flight, an actor whose
// graphics include Walk1/Walk2 poses flips between them, then snaps
// back to the pre-walk look. Actors without walk frames just glide.

describe('two-frame walk cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const stageEl = (id: string, assetId: string): StageElement => ({
    id, assetId, type: 'ACTOR', x: 10, y: 50, scale: 1, zIndex: 1,
    rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
  });

  const makeGame = (script: string, withWalkFrames: boolean): GameData => {
    const game = createDefaultGame();
    game.actors.push({
      id: 'aldric', name: 'Aldric', status: 'work',
      graphics: [
        { id: 'g0', pose: 'Neutral', expression: 'Neutral', angle: 0, image: 'neutral.png' },
        ...(withWalkFrames ? [
          { id: 'g1', pose: 'Walk1', expression: 'Neutral', angle: 0, image: 'w1.png' },
          { id: 'g2', pose: 'Walk2', expression: 'Neutral', angle: 0, image: 'w2.png' },
        ] : []),
      ],
    });
    game.scenes.push({ id: 's1', name: 'S1', stage: [stageEl('hero', 'aldric')], script });
    return game;
  };

  it('flips Walk1/Walk2 during MOVE and restores afterwards', () => {
    const game = makeGame('[MOVE hero to 80,60 over 2s]\n[SET done = true]', true);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    // Walk starts on frame 1 immediately; the position target lands a
    // breath later (deferred so a same-pass ENTER paints first)
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBe('Walk1');
    act(() => { vi.advanceTimersByTime(30); });
    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({
      x: 80, y: 60, pose: 'Walk1',
    });

    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBe('Walk2');

    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBe('Walk1');

    // Move ends: walk pose cleared (editor-authored pose wins again),
    // script resumes
    act(() => { vi.advanceTimersByTime(1500); });
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBeUndefined();
    expect(result.current.state.worldState.done).toBe(true);
  });

  it('restores a pose set by POSE in the same pass', () => {
    const game = makeGame(
      '[POSE hero pose=Run expression=Angry]\n[MOVE hero to 80,60 over 1s]', true);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('hero')?.pose).toBe('Walk1');

    act(() => { vi.advanceTimersByTime(1000); });
    const after = result.current.state.elementOverrides.get('hero');
    expect(after).toMatchObject({ pose: 'Run', expression: 'Angry' });
  });

  it('actors without walk frames glide unchanged (fail-soft)', () => {
    const game = makeGame('[MOVE hero to 80,60 over 1s]\n[SET done = true]', false);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('hero')?.pose).toBeUndefined();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBeUndefined();
    expect(result.current.state.worldState.done).toBe(true);
  });
});
