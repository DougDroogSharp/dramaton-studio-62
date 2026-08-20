import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandToString } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

describe('SET_TEXT / AUTOPLAY parsing', () => {
  it('parses SET_TEXT with interpolation placeholders', () => {
    expect(parseScript('[SET_TEXT news_ticker "WAGES FALL TO {wages}"]')[0]).toEqual({
      type: 'SET_TEXT', elementId: 'news_ticker', text: 'WAGES FALL TO {wages}',
    });
  });

  it('parses AUTOPLAY on/off', () => {
    expect(parseScript('[AUTOPLAY on]')[0]).toEqual({ type: 'AUTOPLAY', enabled: true });
    expect(parseScript('[AUTOPLAY off]')[0]).toEqual({ type: 'AUTOPLAY', enabled: false });
  });

  it('round-trips through the serializer', () => {
    for (const src of ['[SET_TEXT ticker "RENT {rent} — WAGES {wages}"]', '[AUTOPLAY on]', '[AUTOPLAY off]']) {
      const cmd = parseScript(src)[0];
      expect(parseScript(commandToString(cmd))[0]).toEqual(cmd);
    }
  });
});

describe('SET_TEXT / AUTOPLAY runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const balloonEl = (id: string): StageElement => ({
    id, assetId: '', type: 'BALLOON', x: 50, y: 95, scale: 1, zIndex: 5, rotation: 0,
    text: 'placeholder', balloonType: 'SPEECH',
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.info.worldState = { wages: 12.34, crisis: 0 };
    game.scenes.push({ id: 's1', name: 'S1', script, stage: [balloonEl('news_ticker')] });
    return game;
  };

  it('writes interpolated text into the element override', () => {
    const game = makeGame('[SET_TEXT news_ticker "WAGES AT {wages} — CRISIS {crisis}"]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('news_ticker')?.text)
      .toBe('WAGES AT 12.3 — CRISIS 0');
  });

  it('updates live from a TICK and re-interpolates', () => {
    const game = makeGame('[TICK 500ms]\n[SET wages = wages + 10]\n[SET_TEXT news_ticker "WAGES {wages}"]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.elementOverrides.get('news_ticker')?.text).toBe('WAGES 22.3');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.elementOverrides.get('news_ticker')?.text).toBe('WAGES 32.3');
  });

  it('unknown variables render as ?? with a warning, never crash', () => {
    const game = makeGame('[SET_TEXT news_ticker "MYSTERY: {nope}"]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('news_ticker')?.text).toBe('MYSTERY: ??');
    expect(console.warn).toHaveBeenCalled();
  });

  it('AUTOPLAY flips isAutoPlay from script', () => {
    const game = makeGame('[AUTOPLAY on]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.isAutoPlay).toBe(true);

    const game2 = makeGame('[AUTOPLAY off]');
    const { result: r2 } = renderHook(() => useScriptRunner({ game: game2, startSceneId: 's1' }));
    expect(r2.current.state.isAutoPlay).toBe(false);
  });
});

describe('dialogue {var} interpolation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('speaks live world-state values', () => {
    const game = createDefaultGame();
    game.info.worldState = { gold: 42.25 };
    game.scenes.push({ id: 's1', name: 'S1', script: 'Boss: "We are sitting on a cool {gold} grand."' });
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.activeDialogue?.text).toBe('We are sitting on a cool 42.3 grand.');
  });

  it('unknown variables degrade to ?? without crashing', () => {
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', script: 'Boss: "Owe me {nothing}."' });
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.activeDialogue?.text).toBe('Owe me ??.');
  });
});
