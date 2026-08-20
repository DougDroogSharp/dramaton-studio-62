import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

describe('staging commands: parsing', () => {
  it('parses TWEEN with each property', () => {
    expect(parseScript('[TWEEN boss.scale to 3 over 2s]')[0]).toEqual({
      type: 'TWEEN', elementId: 'boss', property: 'scale', value: 3, duration: 2,
    });
    expect(parseScript('[TWEEN ghost.opacity to 0 over 500ms]')[0]).toMatchObject({
      property: 'opacity', value: 0, duration: 0.5,
    });
    expect(parseScript('[TWEEN tower.rotation to -75]')[0]).toMatchObject({
      property: 'rotation', value: -75, duration: 1,
    });
  });

  it('parses BACKDROP and CAMERA forms', () => {
    expect(parseScript('[BACKDROP wm_village over 2s]')[0]).toEqual({
      type: 'BACKDROP', dropId: 'wm_village', duration: 2,
    });
    expect(parseScript('[BACKDROP wm_village]')[0]).toMatchObject({ duration: 0 });
    expect(parseScript('[CAMERA shot closeup on king over 1.5s]')[0]).toEqual({
      type: 'CAMERA', shot: 'closeup', targetId: 'king', duration: 1.5,
    });
    expect(parseScript('[CAMERA zoom 1.8 at 30,40 over 2s]')[0]).toMatchObject({
      zoom: 1.8, x: 30, y: 40, duration: 2,
    });
    expect(parseScript('[CAMERA follow peasant]')[0]).toMatchObject({ follow: 'peasant' });
    expect(parseScript('[CAMERA reset]')[0]).toMatchObject({ shot: 'reset' });
  });

  it('round-trips all three', () => {
    const src = [
      '[TWEEN boss.scale to 3 over 2s]',
      '[BACKDROP wm_village over 2s]',
      '[CAMERA shot closeup on king over 1.5s]',
    ].join('\n');
    expect(commandsToScript(parseScript(src))).toBe(src);
  });
});

describe('staging commands: execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const stageEl = (id: string): StageElement => ({
    id, assetId: 'a', type: 'ACTOR', x: 20, y: 60, scale: 1, zIndex: 1,
    rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
  });

  const run = (script: string): GameData => {
    const game = createDefaultGame();
    game.drops = [
      { id: 'day', name: 'Day', image: 'day.png' },
      { id: 'night', name: 'Night', image: 'night.png' },
    ];
    game.scenes.push({ id: 's1', name: 'S1', dropId: 'day', stage: [stageEl('king')], script });
    return game;
  };

  it('TWEEN writes the target property and is non-blocking', () => {
    const game = run('[TWEEN king.scale to 3 over 2s]\n[SET after = 1]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    // non-blocking: the script already ran to the end
    expect(result.current.state.worldState.after).toBe(1);
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.state.elementOverrides.get('king')).toMatchObject({
      scale: 3, transitionDuration: 2,
    });
  });

  it('BACKDROP swaps to a real drop and warns on unknown ids', () => {
    const game = run('[BACKDROP night over 2s]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.backdrop).toEqual({ dropId: 'night', duration: 2 });

    const bad = run('[BACKDROP nowhere]');
    const { result: r2 } = renderHook(() => useScriptRunner({ game: bad, startSceneId: 's1' }));
    expect(r2.current.state.backdrop).toBeNull();
  });

  it('CAMERA presets resolve to zoom, and "on element" centers', () => {
    const game = run('[CAMERA shot closeup on king over 1s]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.camera).toMatchObject({ zoom: 2.2, x: 20, y: 60, duration: 1 });
  });

  it('CAMERA reset returns to the full stage', () => {
    const game = run('[CAMERA shot closeup on king]\n[CAMERA reset]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.camera).toMatchObject({ zoom: 1, x: 50, y: 50 });
  });

  it('CAMERA follow tracks a moving element', () => {
    const game = run('[CAMERA follow king]\n[MOVE king to 80,30 over 1s]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.state.camera).toMatchObject({ follow: 'king', x: 80, y: 30 });
  });

  it('a scene change clears backdrop and camera', () => {
    const game = run('[BACKDROP night]\n[CAMERA shot closeup on king]\n[SCENE s2]');
    game.scenes.push({ id: 's2', name: 'S2', script: '[SET arrived = 1]' });
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.backdrop).toBeNull();
    expect(result.current.state.camera).toBeNull();
  });
});
