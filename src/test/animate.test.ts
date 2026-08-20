import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';
import { DEFAULT_ABILITY_SETTINGS } from '@/utils/accessibility';

// ANIMATE loops an element through pose frames — flames flickering,
// birds flapping — untied to movement, until stopped or scene change.

describe('ANIMATE parsing', () => {
  it('parses frames, interval and repeat', () => {
    expect(parseScript('[ANIMATE fire Flame1 Flame2 Flame3 every 180ms]')[0]).toEqual({
      type: 'ANIMATE', elementId: 'fire', poses: ['Flame1', 'Flame2', 'Flame3'], interval: 0.18,
    });
    expect(parseScript('[ANIMATE door Shut Open every 400ms repeat 2]')[0]).toMatchObject({
      poses: ['Shut', 'Open'], interval: 0.4, repeat: 2,
    });
  });

  it('defaults to 200ms per frame', () => {
    expect(parseScript('[ANIMATE gull Up Down]')[0]).toMatchObject({ interval: 0.2 });
  });

  it('parses both stop forms', () => {
    expect(parseScript('[STOP_ANIMATE fire]')[0]).toEqual({ type: 'STOP_ANIMATE', elementId: 'fire' });
    expect(parseScript('[ANIMATE fire off]')[0]).toEqual({ type: 'STOP_ANIMATE', elementId: 'fire' });
  });

  it('needs at least two frames to be an animation', () => {
    expect(parseScript('[ANIMATE fire Flame1]')[0].type).toBe('UNKNOWN');
  });

  it('round-trips', () => {
    const src = '[ANIMATE fire Flame1 Flame2 Flame3 every 180ms]\n[STOP_ANIMATE fire]';
    expect(commandsToScript(parseScript(src))).toBe(src);
  });
});

describe('ANIMATE execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const el = (id: string): StageElement => ({
    id, assetId: 'fire_asset', type: 'ACTOR', x: 50, y: 50, scale: 1, zIndex: 1,
    rotation: 0, pose: 'Flame1', expression: 'Neutral', spriteAngle: 0,
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', stage: [el('fire')], script });
    game.scenes.push({ id: 's2', name: 'S2', script: '[SET arrived = 1]' });
    return game;
  };

  const run = (script: string, ability = DEFAULT_ABILITY_SETTINGS) =>
    renderHook(() => useScriptRunner({ game: makeGame(script), startSceneId: 's1', ability }));

  const poseOf = (r: ReturnType<typeof run>) =>
    r.result.current.state.elementOverrides.get('fire')?.pose;

  it('cycles frames and does not block the script', () => {
    const r = run('[ANIMATE fire Flame1 Flame2 Flame3 every 200ms]\n[SET after = 1]');
    expect(r.result.current.state.worldState.after).toBe(1);
    expect(poseOf(r)).toBe('Flame1');
    act(() => { vi.advanceTimersByTime(200); });
    expect(poseOf(r)).toBe('Flame2');
    act(() => { vi.advanceTimersByTime(200); });
    expect(poseOf(r)).toBe('Flame3');
    act(() => { vi.advanceTimersByTime(200); });
    expect(poseOf(r)).toBe('Flame1'); // loops
  });

  it('stops on STOP_ANIMATE, holding its last frame', () => {
    const r = run('[ANIMATE fire Flame1 Flame2 every 200ms]');
    act(() => { vi.advanceTimersByTime(200); });
    expect(poseOf(r)).toBe('Flame2');
    act(() => { r.result.current.goToScene('s1'); });
    // scene restart clears animations; assert via the explicit form
    const r2 = run('[ANIMATE fire Flame1 Flame2 every 200ms]\n[STOP_ANIMATE fire]');
    const held = poseOf(r2);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(poseOf(r2)).toBe(held);
  });

  it('honours a repeat count then stops', () => {
    const r = run('[ANIMATE fire A B every 100ms repeat 1]');
    act(() => { vi.advanceTimersByTime(100); });
    expect(poseOf(r)).toBe('B');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(poseOf(r)).toBe('B'); // one cycle only
  });

  it('a second ANIMATE replaces the first rather than stacking', () => {
    const r = run('[ANIMATE fire A B every 100ms]\n[ANIMATE fire X Y every 100ms]');
    expect(poseOf(r)).toBe('X');
    act(() => { vi.advanceTimersByTime(100); });
    expect(poseOf(r)).toBe('Y');
    act(() => { vi.advanceTimersByTime(100); });
    expect(poseOf(r)).toBe('X');
  });

  it('a scene change stops every animation', () => {
    const r = run('[ANIMATE fire A B every 100ms]\n[SCENE s2]');
    expect(r.result.current.state.currentSceneId).toBe('s2');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(r.result.current.state.worldState.arrived).toBe(1);
  });

  it('reduced motion shows the first frame and holds it', () => {
    const r = run('[ANIMATE fire A B C every 100ms]', { ...DEFAULT_ABILITY_SETTINGS, reduceMotion: true });
    expect(poseOf(r)).toBe('A');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(poseOf(r)).toBe('A');
  });

  it('an unknown name falls through unchanged rather than being dropped', () => {
    // Resolution only ever REDIRECTS an actor id to its element; it
    // must never block a write that used to work (ENTER-created ids,
    // scenes with no stage array).
    const r = run('[ANIMATE nope A B]\n[SET after = 1]');
    expect(r.result.current.state.elementOverrides.get('nope')?.pose).toBe('A');
    expect(r.result.current.state.worldState.after).toBe(1);
  });
});

describe('actor-id targeting (the 44 silent no-ops)', () => {
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
    game.actors.push({ id: 'elon_musk', name: 'Elon', status: 'work', graphics: [] });
    game.scenes.push({
      id: 's1', name: 'S1',
      stage: [{
        id: 'em_feed', assetId: 'elon_musk', type: 'ACTOR', x: 50, y: 50, scale: 1,
        zIndex: 1, rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
      }],
      script,
    });
    return game;
  };

  it('POSE naming an ACTOR reaches that actor s stage element', () => {
    const { result } = renderHook(() => useScriptRunner({
      game: makeGame('[POSE elon_musk pose=Pointing expression=Smug]'), startSceneId: 's1',
    }));
    // the override lands on the ELEMENT, which is what Stage reads
    expect(result.current.state.elementOverrides.get('em_feed')).toMatchObject({
      pose: 'Pointing', expression: 'Smug',
    });
  });

  it('POSE naming the element still works (element id wins)', () => {
    const { result } = renderHook(() => useScriptRunner({
      game: makeGame('[POSE em_feed pose=Sit expression=Sad]'), startSceneId: 's1',
    }));
    expect(result.current.state.elementOverrides.get('em_feed')).toMatchObject({ pose: 'Sit' });
  });

  it('ANIMATE accepts an actor id too', () => {
    const { result } = renderHook(() => useScriptRunner({
      game: makeGame('[ANIMATE elon_musk A B every 100ms]'), startSceneId: 's1',
    }));
    expect(result.current.state.elementOverrides.get('em_feed')?.pose).toBe('A');
  });

  it('an unknown name falls through unchanged (never blocks a write that used to work)', () => {
    const { result } = renderHook(() => useScriptRunner({
      game: makeGame('[POSE nobody pose=Sit expression=Sad]\n[SET after = 1]'), startSceneId: 's1',
    }));
    expect(result.current.state.elementOverrides.get('nobody')).toMatchObject({ pose: 'Sit' });
    expect(result.current.state.worldState.after).toBe(1);
  });
});
