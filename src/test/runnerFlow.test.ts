import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';

describe('script runner flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const makeGame = (script: string, extraScenes: { id: string; script: string }[] = []): GameData => {
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', script });
    for (const s of extraScenes) game.scenes.push({ id: s.id, name: s.id, script: s.script });
    return game;
  };

  it('WAIT resumes the script automatically', () => {
    const game = makeGame('[SET a = 1]\n[WAIT 500ms]\n[SET b = 2]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.worldState.a).toBe(1);
    expect(result.current.state.worldState.b).toBeUndefined();
    expect(result.current.state.isWaiting).toBe(true);

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.worldState.b).toBe(2);
    expect(result.current.state.isWaiting).toBe(false);
    expect(result.current.state.isComplete).toBe(true);
  });

  it('MOVE with duration resumes and records the override', () => {
    const game = makeGame('[MOVE hero to 80,60 over 1s]\n[SET done = true]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    // The target is written one breath after the start position paints
    // (so a same-pass ENTER isn't batched away and the tween animates)
    act(() => { vi.advanceTimersByTime(30); });
    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({ x: 80, y: 60, transitionDuration: 1 });
    expect(result.current.state.worldState.done).toBeUndefined();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.worldState.done).toBe(true);
  });

  it('ENTER then MOVE in one pass paints the start position first', () => {
    const game = makeGame('[ENTER hero at 98,64]\n[MOVE hero to 72,64 over 4s]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    // Before the deferred target write, the sprite sits at its ENTER
    // point — this is the frame the tween animates from. (Regression:
    // both writes used to batch into one render and the move
    // teleported.)
    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({ x: 98, y: 64, transitionDuration: 0 });

    act(() => { vi.advanceTimersByTime(30); });
    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({ x: 72, y: 64, transitionDuration: 4 });
  });

  it('ENTER records an instant override and unhides', () => {
    const game = makeGame('[ENTER hero at 25,50]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({ x: 25, y: 50, transitionDuration: 0 });
  });

  it('POSE merges into an existing override instead of replacing it', () => {
    const game = makeGame('[ENTER hero at 25,50]\n[POSE hero pose=Run expression=Angry]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    const override = result.current.state.elementOverrides.get('hero');
    expect(override).toMatchObject({ x: 25, y: 50, pose: 'Run', expression: 'Angry' });
  });

  it('dialogue inside IF yields instead of being overwritten', () => {
    const game = makeGame(
      '[SET x = 1]\n[IF x == 1]\nNarrator: "first"\nNarrator: "second"\n[ENDIF]\nNarrator: "third"',
    );
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    // typewriter: let it finish
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state.activeDialogue?.text).toBe('first');

    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state.activeDialogue?.text).toBe('second');

    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state.activeDialogue?.text).toBe('third');
  });

  it('false IF skips its whole body including dialogue', () => {
    const game = makeGame('[IF missing == 1]\nNarrator: "never"\n[ENDIF]\n[SET after = true]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.activeDialogue).toBeNull();
    expect(result.current.state.worldState.after).toBe(true);
    expect(result.current.state.isComplete).toBe(true);
  });

  it('SCENE stops executing the old scene and starts the new one', () => {
    const game = makeGame(
      '[SET a = 1]\n[SCENE s2]\n[SET leaked = true]',
      [{ id: 's2', script: '[SET b = 2]' }],
    );
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.worldState.a).toBe(1); // worldState survives
    expect(result.current.state.worldState.b).toBe(2); // new scene ran
    expect(result.current.state.worldState.leaked).toBeUndefined(); // old scene stopped at the jump
  });

  it('nested IFs jump correctly', () => {
    const game = makeGame(
      '[SET a = 1]\n[SET b = 2]\n[IF a == 1]\n[IF b == 99]\n[SET wrong = true]\n[ENDIF]\n[SET right = true]\n[ENDIF]',
    );
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.worldState.wrong).toBeUndefined();
    expect(result.current.state.worldState.right).toBe(true);
  });
});
