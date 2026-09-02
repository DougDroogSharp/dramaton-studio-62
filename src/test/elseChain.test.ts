import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript, IfCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';

describe('ELSE / ELSEIF parsing', () => {
  it('parses a full chain into the IF command', () => {
    const cmds = parseScript(
      '[IF heat > 80]\n[SET zone = "fire"]\n[ELSEIF heat > 50]\n[SET zone = "simmer"]\n[ELSE]\n[SET zone = "calm"]\n[ENDIF]',
    );
    expect(cmds).toHaveLength(1);
    const ifCmd = cmds[0] as IfCommand;
    expect(ifCmd.type).toBe('IF');
    expect(ifCmd.commands).toHaveLength(1);
    expect(ifCmd.elifs).toHaveLength(1);
    expect(ifCmd.elifs![0]).toMatchObject({ variable: 'heat', operator: '>', value: 50 });
    expect(ifCmd.elifs![0].commands).toHaveLength(1);
    expect(ifCmd.elseCommands).toHaveLength(1);
  });

  it('round-trips through the serializer', () => {
    const src = '[IF heat > 80]\n[SET zone = "fire"]\n[ELSEIF heat > 50]\n[SET zone = "simmer"]\n[ELSE]\n[SET zone = "calm"]\n[ENDIF]';
    const roundTripped = commandsToScript(parseScript(src));
    expect(parseScript(roundTripped)).toEqual(parseScript(src));
  });

  it('plain IF/ENDIF is untouched (no elifs, no else)', () => {
    const cmds = parseScript('[IF x == 1]\n[SET y = 2]\n[ENDIF]');
    const ifCmd = cmds[0] as IfCommand;
    expect(ifCmd.elifs).toBeUndefined();
    expect(ifCmd.elseCommands).toBeUndefined();
  });

  it('nested chains attach to the correct IF', () => {
    const cmds = parseScript(
      '[IF a == 1]\n[IF b == 1]\n[SET r = 1]\n[ELSE]\n[SET r = 2]\n[ENDIF]\n[ELSE]\n[SET r = 3]\n[ENDIF]',
    );
    const outer = cmds[0] as IfCommand;
    expect(outer.elseCommands).toHaveLength(1);
    const inner = outer.commands[0] as IfCommand;
    expect(inner.type).toBe('IF');
    expect(inner.elseCommands).toHaveLength(1);
  });

  it('stray ELSE/ELSEIF outside an IF is dropped fail-soft', () => {
    const cmds = parseScript('[ELSE]\n[ELSEIF x > 1]\n[SET a = 1]');
    expect(cmds.map(c => c.type)).toEqual(['SET']);
  });
});

describe('ELSE / ELSEIF execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const CHAIN =
    '[IF heat > 80]\n[SET zone = "fire"]\n[ELSEIF heat > 50]\n[SET zone = "simmer"]\n[ELSE]\n[SET zone = "calm"]\n[ENDIF]\n[SET after = 1]';

  const run = (heat: number, script = CHAIN): GameData => {
    const game = createDefaultGame();
    game.info.worldState = { heat };
    game.scenes.push({ id: 's1', name: 'S1', script });
    return game;
  };

  it('takes the IF branch and skips the rest', () => {
    const { result } = renderHook(() => useScriptRunner({ game: run(90), startSceneId: 's1' }));
    expect(result.current.state.worldState.zone).toBe('fire');
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('takes the ELSEIF branch', () => {
    const { result } = renderHook(() => useScriptRunner({ game: run(60), startSceneId: 's1' }));
    expect(result.current.state.worldState.zone).toBe('simmer');
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('falls through to ELSE', () => {
    const { result } = renderHook(() => useScriptRunner({ game: run(10), startSceneId: 's1' }));
    expect(result.current.state.worldState.zone).toBe('calm');
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('dialogue inside a chain branch yields normally', () => {
    const script =
      '[IF heat > 80]\nAldric: "It burns."\n[ELSE]\nAldric: "Quiet today."\n[ENDIF]\n[SET after = 1]';
    const { result } = renderHook(() => useScriptRunner({ game: run(10, script), startSceneId: 's1' }));
    expect(result.current.state.activeDialogue?.text).toBe('Quiet today.');
    expect(result.current.state.worldState.after).toBeUndefined();
    act(() => { result.current.advance(); });
    expect(result.current.state.worldState.after).toBe(1);
  });

  it('works inside TICK bodies', () => {
    const script =
      '[TICK 1s]\n[IF heat > 80]\n[SET zone = "fire"]\n[ELSEIF heat > 50]\n[SET zone = "simmer"]\n[ELSE]\n[SET zone = "calm"]\n[ENDIF]\n[/TICK]\nNarrator: "hold"';
    const { result } = renderHook(() => useScriptRunner({ game: run(60, script), startSceneId: 's1' }));
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.state.worldState.zone).toBe('simmer');
  });
});
