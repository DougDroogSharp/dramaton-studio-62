import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame } from '@/types';

// NARRATE: non-blocking narration. The one speech form allowed inside
// a TICK body, so a running simulation can describe itself — and the
// audio-description channel for blind play.

describe('NARRATE parsing', () => {
  it('parses with and without a duration', () => {
    expect(parseScript('[NARRATE "The hoard swells."]')[0]).toEqual({
      type: 'NARRATE', text: 'The hoard swells.',
    });
    expect(parseScript('[NARRATE "Slowly, now." for 6s]')[0]).toEqual({
      type: 'NARRATE', text: 'Slowly, now.', seconds: 6,
    });
  });

  it('round-trips', () => {
    const src = '[NARRATE "The hoard swells."]\n[NARRATE "Slowly, now." for 6s]';
    expect(commandsToScript(parseScript(src))).toBe(src);
  });
});

describe('NARRATE execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const run = (script: string, worldState: Record<string, number> = {}) => {
    const game = createDefaultGame();
    game.info.worldState = worldState;
    game.scenes.push({ id: 's1', name: 'S1', script });
    return renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
  };

  it('does not block: the script runs straight past it', () => {
    const { result } = run('[NARRATE "Something shifts."]\n[SET after = 1]');
    expect(result.current.state.ambientNarration?.text).toBe('Something shifts.');
    expect(result.current.state.worldState.after).toBe(1);
    expect(result.current.state.isComplete).toBe(true);
  });

  it('interpolates world state', () => {
    const { result } = run('[NARRATE "The hoard stands at {hoard}."]', { hoard: 62.44 });
    expect(result.current.state.ambientNarration?.text).toBe('The hoard stands at 62.4.');
  });

  it('clears itself after the duration', () => {
    const { result } = run('[NARRATE "Brief." for 2s]');
    expect(result.current.state.ambientNarration).not.toBeNull();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.state.ambientNarration).toBeNull();
  });

  it('works inside a TICK body (DIALOGUE cannot)', () => {
    const script = '[TICK 1s]\n[SET n = n + 1]\n[NARRATE "Tick {n}."]\n[/TICK]\nNarrator: "hold"';
    const { result } = run(script, { n: 0 });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.state.ambientNarration?.text).toBe('Tick 1.');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.ambientNarration?.text).toBe('Tick 2.');
  });

  it('suppresses consecutive duplicates so a fast tick cannot flood', () => {
    const script = '[TICK 500ms]\n[NARRATE "The same standing condition."]\n[/TICK]\nNarrator: "hold"';
    const { result } = run(script);
    act(() => { vi.advanceTimersByTime(600); });
    const firstId = result.current.state.ambientNarration?.id;
    act(() => { vi.advanceTimersByTime(600); });
    // same text -> same announcement, not a new one
    expect(result.current.state.ambientNarration?.id).toBe(firstId);
  });

  it('a new line supersedes the previous one and resets its timer', () => {
    const { result } = run('[NARRATE "First." for 5s]\n[NARRATE "Second." for 5s]');
    expect(result.current.state.ambientNarration?.text).toBe('Second.');
    act(() => { vi.advanceTimersByTime(4000); });
    // the first line's expiry must not clear the second
    expect(result.current.state.ambientNarration?.text).toBe('Second.');
    act(() => { vi.advanceTimersByTime(1500); });
    expect(result.current.state.ambientNarration).toBeNull();
  });

  it('a scene change clears it', () => {
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', script: '[NARRATE "Gone soon." for 30s]\n[SCENE s2]' });
    game.scenes.push({ id: 's2', name: 'S2', script: '[SET arrived = 1]' });
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.ambientNarration).toBeNull();
  });
});
