import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript, RandomCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame } from '@/types';

const SRC = '[RANDOM]\n[SET pick = 1]\n[OR]\n[SET pick = 2]\n[OR]\n[SET pick = 3]\n[/RANDOM]\n[SET after = 1]';

describe('RANDOM block parsing', () => {
  it('parses branches split on [OR]', () => {
    const cmds = parseScript(SRC);
    expect(cmds).toHaveLength(2);
    const rnd = cmds[0] as RandomCommand;
    expect(rnd.type).toBe('RANDOM');
    expect(rnd.branches).toHaveLength(3);
    expect(rnd.branches.map(b => b.length)).toEqual([1, 1, 1]);
  });

  it('round-trips through the serializer', () => {
    const roundTripped = commandsToScript(parseScript(SRC));
    expect(parseScript(roundTripped)).toEqual(parseScript(SRC));
  });

  it('nested RANDOM keeps its [OR]s to itself', () => {
    const src = '[RANDOM]\n[RANDOM]\n[SET a = 1]\n[OR]\n[SET a = 2]\n[/RANDOM]\n[OR]\n[SET a = 3]\n[/RANDOM]';
    const rnd = parseScript(src)[0] as RandomCommand;
    expect(rnd.branches).toHaveLength(2);
    const inner = rnd.branches[0][0] as RandomCommand;
    expect(inner.type).toBe('RANDOM');
    expect(inner.branches).toHaveLength(2);
  });

  it('unclosed RANDOM degrades to UNKNOWN (fail-soft)', () => {
    const cmds = parseScript('[RANDOM]\n[SET a = 1]');
    expect(cmds.map(c => c.type)).toEqual(['UNKNOWN', 'SET']);
  });
});

describe('RANDOM block execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const run = (script: string, rand: number) => {
    vi.spyOn(Math, 'random').mockReturnValue(rand);
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', script });
    return renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
  };

  it('plays exactly one branch and continues after the block', () => {
    const { result } = run(SRC, 0.4); // 3 branches: index 1
    expect(result.current.state.worldState.pick).toBe(2);
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('first and last branches are reachable', () => {
    const first = run(SRC, 0.0);
    expect(first.result.current.state.worldState.pick).toBe(1);
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const last = run(SRC, 0.99);
    expect(last.result.current.state.worldState.pick).toBe(3);
  });

  it('dialogue inside a branch yields normally', () => {
    const { result } = run('[RANDOM]\nBoss: "Heads."\n[OR]\nBoss: "Tails."\n[/RANDOM]\n[SET after = 1]', 0.0);
    expect(result.current.state.activeDialogue?.text).toBe('Heads.');
    act(() => { result.current.advance(); });
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('works inside TICK bodies', () => {
    const script = '[TICK 1s]\n[RANDOM]\n[SET pick = 1]\n[OR]\n[SET pick = 2]\n[/TICK]\nNarrator: "hold"';
    // note: intentionally missing [/RANDOM] above would be fail-soft; use a correct one:
    const good = '[TICK 1s]\n[RANDOM]\n[SET pick = 1]\n[OR]\n[SET pick = 2]\n[/RANDOM]\n[/TICK]\nNarrator: "hold"';
    void script;
    const { result } = run(good, 0.9);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.state.worldState.pick).toBe(2);
  });
});
