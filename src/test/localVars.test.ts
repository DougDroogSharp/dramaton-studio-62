import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';

// In-scene variables (Scene.localVars) after the merge onto the flattened
// runner: locals are read and written by SET/IF, += / -= nudge numerics,
// nothing local leaks into worldState, and the change log knows the scope.

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

const build = (): GameData => {
  const game = createDefaultGame();
  game.info.worldState = { gold: 10 };
  game.scenes.push(
    {
      id: 'a',
      name: 'A',
      localVars: { mood: 10 },
      script: [
        '[SET mood += 5]',
        '[SET gold -= 3]',
        '[IF mood >= 15]',
        '[SET gate = 1]',
        '[ENDIF]',
        '[SET label = "here"]',
      ].join('\n'),
    },
    { id: 'b', name: 'B', script: '[SET gold += 1]' },
  );
  return game;
};

describe('in-scene variables on the merged runner', () => {
  it('keeps locals out of world state and applies += / -=', () => {
    const game = build();
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'a' }));

    const { worldState, localState } = result.current.state;
    expect(localState.mood).toBe(15);
    expect(worldState.mood).toBeUndefined();
    expect(worldState.gold).toBe(7);
    // The IF read the local through the same view SET wrote to
    expect(worldState.gate).toBe(1);
    // An undeclared name is world state, exactly as before
    expect(worldState.label).toBe('here');
  });

  it('logs every change with its scope and scene', () => {
    const game = build();
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'a' }));

    const log = result.current.state.varLog.map(c => `${c.sceneId}:${c.scope}:${c.variable}:${c.from}->${c.to}`);
    expect(log).toEqual([
      'a:local:mood:10->15',
      'a:world:gold:10->7',
      'a:world:gate:undefined->1',
      'a:world:label:undefined->here',
    ]);
  });

  it('resets locals on scene change and keeps the world', () => {
    const game = build();
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 'a' }));

    act(() => result.current.goToScene('b'));

    expect(result.current.state.currentSceneId).toBe('b');
    expect(result.current.state.localState).toEqual({});
    expect(result.current.state.worldState.gold).toBe(8);
    expect(result.current.state.worldState.mood).toBeUndefined();
  });
});
