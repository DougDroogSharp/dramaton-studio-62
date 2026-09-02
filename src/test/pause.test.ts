import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';

describe('pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.info.worldState = { n: 0 };
    game.scenes.push({ id: 's1', name: 'S1', script });
    return game;
  };

  it('freezes the simulation: a TICK stops accumulating', () => {
    const game = makeGame('[TICK 500ms]\n[SET n = n + 1]\n[/TICK]');
    const { result, rerender } = renderHook(
      ({ paused }) => useScriptRunner({ game, startSceneId: 's1', paused }),
      { initialProps: { paused: false } },
    );

    act(() => { vi.advanceTimersByTime(1600); });
    const ranTo = result.current.state.worldState.n;
    expect(ranTo).toBe(3);

    rerender({ paused: true });
    act(() => { vi.advanceTimersByTime(5000); });
    // The world held still while paused.
    expect(result.current.state.worldState.n).toBe(ranTo);

    rerender({ paused: false });
    act(() => { vi.advanceTimersByTime(1000); });
    // ...and picks up again on resume.
    expect(Number(result.current.state.worldState.n)).toBeGreaterThan(Number(ranTo));
  });

  it('a scene paused before its first line still starts on resume', () => {
    // The bug this caught: the mount effect starts a scene by calling
    // advance(), advance() refuses while paused, and the effect did not
    // re-run on unpause -- so pausing before the first line left a dead
    // show that never began.
    const game = makeGame('Narrator: "one"');
    const { result, rerender } = renderHook(
      ({ paused }) => useScriptRunner({ game, startSceneId: 's1', paused }),
      { initialProps: { paused: true } },
    );
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.activeDialogue).toBeNull();

    rerender({ paused: false });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.activeDialogue?.text).toBe('one');
  });

  it('refuses to advance while paused', () => {
    const game = makeGame('Narrator: "one"\nNarrator: "two"');
    const { result, rerender } = renderHook(
      ({ paused }) => useScriptRunner({ game, startSceneId: 's1', paused }),
      { initialProps: { paused: true } },
    );

    act(() => { vi.advanceTimersByTime(500); });
    const before = result.current.state.currentCommandIndex;
    act(() => { result.current.advance(); });
    expect(result.current.state.currentCommandIndex).toBe(before);

    rerender({ paused: false });
    // Let the typewriter finish first: the first advance on an incomplete
    // line completes the text rather than moving on, which is correct
    // behaviour and was my test's mistake, not the runner's.
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.currentCommandIndex).not.toBe(before);
  });
});
