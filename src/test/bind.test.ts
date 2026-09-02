import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandToString, BindCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

describe('BIND parsing', () => {
  it('parses element, property, and expression', () => {
    const cmd = parseScript('[BIND siphon_arm.rotation to rent * 0.9]')[0] as BindCommand;
    expect(cmd).toEqual({
      type: 'BIND',
      elementId: 'siphon_arm',
      property: 'rotation',
      expression: 'rent * 0.9',
    });
  });

  it('parses UNBIND', () => {
    expect(parseScript('[UNBIND siphon_arm.rotation]')[0]).toEqual({
      type: 'UNBIND',
      elementId: 'siphon_arm',
      property: 'rotation',
    });
  });

  it('round-trips through the serializer', () => {
    for (const src of ['[BIND reservoir.scale to 0.5 + hoard / 200]', '[UNBIND reservoir.scale]']) {
      const cmd = parseScript(src)[0];
      expect(commandToString(cmd)).toBe(src);
    }
  });
});

describe('BIND runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const element = (id: string): StageElement => ({
    id, assetId: id, type: 'ITEM', x: 50, y: 50, scale: 1, zIndex: 1, rotation: 0,
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.info.worldState = { rent: 10 };
    game.scenes.push({ id: 's1', name: 'S1', script, stage: [element('arm')] });
    game.scenes.push({ id: 's2', name: 'S2', script: '' });
    return game;
  };

  it('applies immediately on BIND and re-applies on SET', () => {
    const game = makeGame('[BIND arm.rotation to rent * 2]\n[SET rent = 30]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    // last SET drove the binding to 60
    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(60);
  });

  it('is driven live by a TICK', () => {
    const game = makeGame('[BIND arm.rotation to rent * 2]\n[TICK 500ms]\n[SET rent = rent + 5]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(20);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.worldState.rent).toBe(20);
    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(40);
  });

  it('UNBIND stops updates but keeps the last value', () => {
    const game = makeGame('[BIND arm.rotation to rent * 2]\n[SET rent = 15]\n[UNBIND arm.rotation]\n[SET rent = 100]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.worldState.rent).toBe(100);
    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(30); // frozen at unbind
  });

  it('rejects non-bindable properties with a warning', () => {
    const game = makeGame('[BIND arm.color to rent]\n[SET rent = 50]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('arm')).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('clamps opacity to 0..1', () => {
    const game = makeGame('[BIND arm.opacity to rent]'); // rent = 10
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('arm')?.opacity).toBe(1);
  });

  it('bad expressions drive to 0 instead of crashing', () => {
    const game = makeGame('[BIND arm.rotation to rent *]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('bindings clear on scene change', () => {
    const game = makeGame('[BIND arm.rotation to rent * 2]\n[SCENE s2]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.elementOverrides.size).toBe(0);
  });
});
