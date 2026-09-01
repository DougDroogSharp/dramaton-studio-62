import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript, ChoiceCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame } from '@/types';

describe('choice upgrades: parsing', () => {
  it('parses gates and effects on options', () => {
    const src = '[CHOICE]\n- "Bribe" (if gold >= 50) -> bribe [SET gold = gold - 50] [SET heat = heat + 10]\n- "Walk" -> street\n[/CHOICE]';
    const choice = parseScript(src)[0] as ChoiceCommand;
    expect(choice.options).toHaveLength(2);
    expect(choice.options[0].condition).toMatchObject({ variable: 'gold', operator: '>=', value: 50 });
    expect(choice.options[0].effects).toHaveLength(2);
    expect(choice.options[0].effects![0]).toMatchObject({ variable: 'gold', isExpression: true });
    expect(choice.options[1].condition).toBeUndefined();
    expect(choice.options[1].effects).toBeUndefined();
  });

  it('parses the timed header', () => {
    const choice = parseScript('[CHOICE 10s -> nobody_moved]\n- "Act" -> act\n[/CHOICE]')[0] as ChoiceCommand;
    expect(choice.timeout).toEqual({ seconds: 10, target: 'nobody_moved' });
  });

  it('round-trips gates, effects and timeout', () => {
    const src = '[CHOICE 10s -> late]\n- "Bribe" (if gold >= 50) -> bribe [SET gold = gold - 50]\n- "Walk" -> street\n[/CHOICE]';
    expect(parseScript(commandsToScript(parseScript(src)))).toEqual(parseScript(src));
  });

  it('plain choices are unchanged', () => {
    const src = '[CHOICE]\n- "One" -> a\n- "Two" -> b\n[/CHOICE]';
    expect(commandsToScript(parseScript(src))).toBe(src);
  });
});

describe('choice upgrades: execution', () => {
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
    game.scenes.push({ id: 'bribe', name: 'B', script: '[SET arrived = 1]' });
    game.scenes.push({ id: 'street', name: 'S', script: '[SET arrived = 2]' });
    game.scenes.push({ id: 'late', name: 'L', script: '[SET arrived = 3]' });
    return renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
  };

  const GATED = '[CHOICE]\n- "Bribe" (if gold >= 50) -> bribe [SET gold = gold - 50]\n- "Walk" -> street\n[/CHOICE]';

  it('hides options whose gate fails', () => {
    const { result } = run(GATED, { gold: 10 });
    expect(result.current.state.choices?.options.map(o => o.text)).toEqual(['Walk']);
  });

  it('shows gated options when affordable', () => {
    const { result } = run(GATED, { gold: 100 });
    expect(result.current.state.choices?.options.map(o => o.text)).toEqual(['Bribe', 'Walk']);
  });

  it('applies effects on selection, before the jump', () => {
    const { result } = run(GATED, { gold: 100 });
    act(() => { result.current.selectChoice(0); });
    expect(result.current.state.worldState.gold).toBe(50);
    expect(result.current.state.currentSceneId).toBe('bribe');
  });

  it('skips the choice entirely when every option is gated out', () => {
    const script = '[CHOICE]\n- "Bribe" (if gold >= 50) -> bribe\n[/CHOICE]\n[SET fellThrough = 1]';
    const { result } = run(script, { gold: 0 });
    expect(result.current.state.choices).toBeNull();
    expect(result.current.state.worldState.fellThrough).toBe(1);
  });

  it('timed choice jumps to the fallback on hesitation', () => {
    const { result } = run('[CHOICE 10s -> late]\n- "Act" -> street\n[/CHOICE]');
    expect(result.current.state.currentSceneId).toBe('s1');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.state.currentSceneId).toBe('late');
  });

  it('choosing in time cancels the timeout', () => {
    const { result } = run('[CHOICE 10s -> late]\n- "Act" -> street\n[/CHOICE]');
    act(() => { result.current.selectChoice(0); });
    expect(result.current.state.currentSceneId).toBe('street');
    act(() => { vi.advanceTimersByTime(20000); });
    expect(result.current.state.currentSceneId).toBe('street');
  });
});
