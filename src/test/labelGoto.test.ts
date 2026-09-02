import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame } from '@/types';

describe('LABEL / GOTO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const run = (script: string) => {
    const game = createDefaultGame();
    game.scenes.push({ id: 's1', name: 'S1', script });
    return renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
  };

  it('parses and round-trips', () => {
    const src = '[LABEL top]\n[SET a = 1]\n[GOTO top]';
    expect(parseScript(src)).toEqual([
      { type: 'LABEL', name: 'top' },
      { type: 'SET', variable: 'a', value: 1 },
      { type: 'GOTO', name: 'top' },
    ]);
    expect(commandsToScript(parseScript(src))).toBe(src);
  });

  it('jumps forward over commands', () => {
    const { result } = run('[GOTO end]\n[SET skipped = 1]\n[LABEL end]\n[SET done = 1]');
    expect(result.current.state.worldState.skipped).toBeUndefined();
    expect(result.current.state.worldState.done).toBe(1);
  });

  it('jumps backward (retry loop broken by a condition)', () => {
    const script = [
      '[SET tries = 0]',
      '[LABEL again]',
      '[SET tries = tries + 1]',
      '[IF tries < 3]',
      '[GOTO again]',
      '[ENDIF]',
      '[SET done = 1]',
    ].join('\n');
    const { result } = run(script);
    expect(result.current.state.worldState.tries).toBe(3);
    expect(result.current.state.worldState.done).toBe(1);
  });

  it('unknown label warns and falls through', () => {
    const { result } = run('[GOTO nowhere]\n[SET done = 1]');
    expect(result.current.state.worldState.done).toBe(1);
  });

  it('an unbroken GOTO loop is stopped by the step guard', () => {
    const { result } = run('[LABEL spin]\n[SET n = n + 1]\n[GOTO spin]');
    // guard stops the pass; the runner must not hang and n stays finite
    expect(Number(result.current.state.worldState.n)).toBeGreaterThan(0);
  });

  it('GOTO into an IF body works (labels are flat)', () => {
    const script = [
      '[GOTO inside]',
      '[SET skipped = 1]',
      '[IF 1 == 2]',
      '[LABEL inside]',
      '[SET reached = 1]',
      '[ENDIF]',
      '[SET done = 1]',
    ].join('\n');
    const { result } = run(script);
    expect(result.current.state.worldState.skipped).toBeUndefined();
    expect(result.current.state.worldState.reached).toBe(1);
    expect(result.current.state.worldState.done).toBe(1);
  });
});
