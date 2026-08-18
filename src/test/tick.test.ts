import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandToString, TickCommand, IfCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';

describe('TICK parsing', () => {
  it('parses a tick block with interval and body', () => {
    const cmds = parseScript('[TICK 500ms]\n[SET n = n + 1]\n[/TICK]');
    expect(cmds).toHaveLength(1);
    const tick = cmds[0] as TickCommand;
    expect(tick.type).toBe('TICK');
    expect(tick.interval).toBe(0.5);
    expect(tick.commands).toHaveLength(1);
    expect(tick.commands[0].type).toBe('SET');
  });

  it('parses seconds intervals', () => {
    const tick = parseScript('[TICK 2s]\n[/TICK]')[0] as TickCommand;
    expect(tick.interval).toBe(2);
  });

  it('supports IF nesting inside the body', () => {
    const tick = parseScript('[TICK 1s]\n[IF a > 2]\n[SET b = 1]\n[ENDIF]\n[/TICK]')[0] as TickCommand;
    expect(tick.commands).toHaveLength(1);
    expect(tick.commands[0].type).toBe('IF');
    expect((tick.commands[0] as IfCommand).commands).toHaveLength(1);
  });

  it('treats an unclosed TICK as unknown (fail soft)', () => {
    const cmds = parseScript('[TICK 1s]\n[SET a = 1]');
    expect(cmds[0].type).toBe('UNKNOWN');
    expect(cmds[1].type).toBe('SET'); // body still parses as normal commands
  });

  it('round-trips through the serializer', () => {
    const src = '[TICK 500ms]\n[SET n = n + 1]\n[/TICK]';
    const tick = parseScript(src)[0] as TickCommand;
    expect(commandToString(tick)).toBe(src);
    const reparsed = parseScript(commandToString(tick))[0] as TickCommand;
    expect(reparsed).toEqual(tick);
  });

  it('serializes whole-second intervals as Ns', () => {
    const tick = parseScript('[TICK 2s]\n[SET a = 1]\n[/TICK]')[0] as TickCommand;
    expect(commandToString(tick)).toBe('[TICK 2s]\n[SET a = 1]\n[/TICK]');
  });

  it('does not block script flow around it', () => {
    const cmds = parseScript('[SET a = 1]\n[TICK 1s]\n[SET b = 2]\n[/TICK]\n[SET c = 3]');
    expect(cmds.map(c => c.type)).toEqual(['SET', 'TICK', 'SET']);
  });
});

describe('TICK runtime', () => {
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
    game.info.worldState = { n: 0 };
    game.scenes.push({ id: 's1', name: 'S1', script });
    game.scenes.push({ id: 's2', name: 'S2', script: 'Narrator: "quiet here"' });
    return game;
  };

  it('runs the body on its interval against live world state', () => {
    const game = makeGame('[TICK 500ms]\n[SET n = n + 1]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(1600); });
    expect(result.current.state.worldState.n).toBe(3);
  });

  it('sees its own writes within one tick pass (SET then IF)', () => {
    const game = makeGame('[TICK 500ms]\n[SET n = n + 1]\n[IF n >= 2]\n[SET hit = true]\n[ENDIF]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.worldState.hit).toBeUndefined();
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.state.worldState.hit).toBe(true);
  });

  it('stops on scene change', () => {
    const game = makeGame('[TICK 500ms]\n[SET n = n + 1]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.worldState.n).toBe(2);

    act(() => { result.current.goToScene('s2'); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.state.worldState.n).toBe(2); // frozen
  });

  it('skips blocking commands in the body with a warning', () => {
    const game = makeGame('[TICK 500ms]\nNarrator: "spam"\n[SET n = n + 1]\n[/TICK]');
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.worldState.n).toBe(2); // SET still ran
    expect(result.current.state.activeDialogue).toBeNull(); // dialogue did not
    expect(console.warn).toHaveBeenCalled();
  });
});
