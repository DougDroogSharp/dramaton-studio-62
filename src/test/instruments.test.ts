import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandToString, SliderCommand, GaugeCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

describe('SLIDER/GAUGE parsing', () => {
  it('parses a full slider declaration', () => {
    const cmd = parseScript('[SLIDER greed at 85,20 min=0 max=100 label="GREED"]')[0] as SliderCommand;
    expect(cmd).toEqual({
      type: 'SLIDER', variable: 'greed', x: 85, y: 20, min: 0, max: 100, step: 1, label: 'GREED',
    });
  });

  it('applies defaults for min/max/step/label', () => {
    const cmd = parseScript('[SLIDER greed at 85,20]')[0] as SliderCommand;
    expect(cmd).toEqual({ type: 'SLIDER', variable: 'greed', x: 85, y: 20, min: 0, max: 100, step: 1 });
  });

  it('parses fractional steps and negative bounds', () => {
    const cmd = parseScript('[SLIDER bias at 50,50 min=-10 max=10 step=0.5]')[0] as SliderCommand;
    expect(cmd.min).toBe(-10);
    expect(cmd.max).toBe(10);
    expect(cmd.step).toBe(0.5);
  });

  it('parses a gauge', () => {
    const cmd = parseScript('[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]')[0] as GaugeCommand;
    expect(cmd).toEqual({
      type: 'GAUGE', variable: 'wages', x: 15, y: 80, min: 0, max: 100, label: 'WAGES',
    });
  });

  it('parses hide commands', () => {
    expect(parseScript('[HIDE_SLIDER greed]')[0]).toEqual({ type: 'HIDE_SLIDER', variable: 'greed' });
    expect(parseScript('[HIDE_GAUGE wages]')[0]).toEqual({ type: 'HIDE_GAUGE', variable: 'wages' });
  });

  it('round-trips through the serializer', () => {
    for (const src of [
      '[SLIDER greed at 85,20 min=0 max=100 label="GREED"]',
      '[SLIDER bias at 50,50 min=-10 max=10 step=0.5]',
      '[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]',
      '[HIDE_SLIDER greed]',
      '[HIDE_GAUGE wages]',
    ]) {
      const cmd = parseScript(src)[0];
      expect(parseScript(commandToString(cmd))[0]).toEqual(cmd);
    }
  });
});

describe('SLIDER/GAUGE runtime', () => {
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
    game.info.worldState = { wages: 40 };
    game.scenes.push({ id: 's1', name: 'S1', script, stage: [element('arm')] });
    game.scenes.push({ id: 's2', name: 'S2', script: '' });
    return game;
  };

  it('registers sliders and gauges, HIDE removes them', () => {
    const game = makeGame(
      '[SLIDER greed at 85,20 min=0 max=100 label="GREED"]\n[GAUGE wages at 15,80]\n[HIDE_SLIDER greed]',
    );
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.activeSliders.has('greed')).toBe(false); // shown then hidden
    expect(result.current.state.activeGauges.get('wages')).toMatchObject({ variable: 'wages', x: 15, y: 80 });
  });

  it('seeds an undefined slider variable with min', () => {
    const game = makeGame('[SLIDER greed at 85,20 min=5 max=100]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.worldState.greed).toBe(5);
  });

  it('does not clobber an existing variable', () => {
    const game = makeGame('[SLIDER wages at 85,20 min=0 max=100]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.worldState.wages).toBe(40);
  });

  it('setVariable writes worldState and re-drives BINDs', () => {
    const game = makeGame('[SLIDER greed at 85,20]\n[BIND arm.rotation to greed * 2]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { result.current.setVariable('greed', 45); });
    expect(result.current.state.worldState.greed).toBe(45);
    expect(result.current.state.elementOverrides.get('arm')?.rotation).toBe(90);
  });

  it('instruments clear on scene change', () => {
    const game = makeGame('[SLIDER greed at 85,20]\n[GAUGE wages at 15,80]\n[SCENE s2]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.activeSliders.size).toBe(0);
    expect(result.current.state.activeGauges.size).toBe(0);
  });

  it('a TICK can read a slider-seeded variable', () => {
    const game = makeGame('[SLIDER greed at 85,20 min=10 max=100]\n[TICK 500ms]\n[SET hoard = greed * 2]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.worldState.hoard).toBe(20);

    act(() => { result.current.setVariable('greed', 50); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.worldState.hoard).toBe(100);
  });
});
