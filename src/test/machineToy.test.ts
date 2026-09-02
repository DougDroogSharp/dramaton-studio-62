import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import { parseScript, ScriptCommand, TickCommand, IfCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { migrateGameData, GameData } from '@/types';

// Validates the generated Machine toy game (public/machine-toy.json):
// every script parses clean, the rig references resolve, and the
// economy actually moves when the tick runs.

const loadGame = (): GameData => {
  const raw = readFileSync(resolve(__dirname, '../../public/machine-toy.json'), 'utf8');
  return migrateGameData(JSON.parse(raw));
};

const collectUnknown = (cmds: ScriptCommand[], out: string[] = []): string[] => {
  for (const c of cmds) {
    if (c.type === 'UNKNOWN' && (c as { raw: string }).raw.trim() !== '') {
      out.push((c as { raw: string }).raw);
    }
    if (c.type === 'IF' || c.type === 'TICK') collectUnknown((c as IfCommand | TickCommand).commands, out);
  }
  return out;
};

describe('machine-toy.json', () => {
  const game = loadGame();

  it('every scene script parses with zero UNKNOWN commands', () => {
    for (const scene of game.scenes) {
      const unknown = collectUnknown(parseScript(scene.script || ''));
      expect(unknown, `scene ${scene.id} has unparsed lines`).toEqual([]);
    }
  });

  it('the machine scene has a TICK and its BIND targets exist on stage', () => {
    const machine = game.scenes.find(s => s.id === 'the_machine')!;
    const cmds = parseScript(machine.script!);
    expect(cmds.some(c => c.type === 'TICK')).toBe(true);

    const stageIds = new Set(machine.stage!.map(e => e.id));
    for (const c of cmds) {
      if (c.type === 'BIND') {
        expect(stageIds.has(c.elementId), `BIND target ${c.elementId} missing from stage`).toBe(true);
      }
    }
  });

  it('scene jumps and effect/actor references all resolve', () => {
    const sceneIds = new Set(game.scenes.map(s => s.id));
    const sfxIds = new Set(game.sfx.map(s => s.id));
    const machine = game.scenes.find(s => s.id === 'the_machine')!;
    const stageIds = new Set(machine.stage!.map(e => e.id));

    const walk = (cmds: ScriptCommand[]) => {
      for (const c of cmds) {
        if (c.type === 'SCENE') expect(sceneIds.has(c.sceneId), `SCENE ${c.sceneId}`).toBe(true);
        if (c.type === 'EFFECT' || c.type === 'CLEAR_EFFECT') {
          expect(sfxIds.has(c.sfxId), `sfx ${c.sfxId}`).toBe(true);
          expect(stageIds.has(c.targetId), `effect target ${c.targetId}`).toBe(true);
        }
        if (c.type === 'IF' || c.type === 'TICK') walk((c as IfCommand | TickCommand).commands);
      }
    };
    for (const scene of game.scenes) walk(parseScript(scene.script || ''));
  });

  it('the tuning cockpit exposes every coefficient and keeps ticking', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'machine_tuning' }));

      expect(result.current.state.activeSliders.size).toBe(36);
      expect(result.current.state.activeGauges.size).toBe(5);
      expect(result.current.state.activeButtons.has('back_button')).toBe(true);
      // every c_* coefficient in worldState is on a slider
      const sliderVars = new Set(result.current.state.activeSliders.keys());
      for (const key of Object.keys(loadGame().info.worldState)) {
        if (key.startsWith('c_') && key !== 'c_collapseTicks' && key !== 'c_reconTicks' && key !== 'c_reconEduMin') {
          expect(sliderVars.has(key), `coefficient ${key} missing from cockpit`).toBe(true);
        }
      }

      // the economy ticks here too
      act(() => { vi.advanceTimersByTime(3000); });
      expect(Number(result.current.state.worldState.product)).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('the witness pool has candidates and the lever scene is gated', () => {
    const pool = game.scenes.filter(s => s.pool === 'witness');
    expect(pool.length).toBeGreaterThanOrEqual(4);
    const lever = game.scenes.find(s => s.id === 'witness_singletax')!;
    expect(lever.requires).toEqual([{ variable: 'singleTax', operator: '==', value: 1 }]);
    // Keys with a range carry it as keyScale (wages over 60, not 100)
    const poverty = game.scenes.find(s => s.id === 'witness_poverty')!;
    expect(poverty.key?.wages).toBe(5);
    expect(poverty.keyScale?.wages).toBe(60);
    expect(game.scenes.some(s => 'narraton' in s)).toBe(false);
  });

  describe('the economy runs', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'group').mockImplementation(() => {});
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('ticks move product, rent, wages, hoard and drive the rig', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'the_machine' }));

      // dismiss the intro narration so the WAIT hold engages
      act(() => { vi.advanceTimersByTime(8000); });
      act(() => { result.current.advance(); });

      act(() => { vi.advanceTimersByTime(5000); }); // 10 ticks

      const ws = result.current.state.worldState;
      expect(Number(ws.product)).toBeGreaterThan(0);
      expect(Number(ws.rent)).toBeGreaterThan(0);
      expect(Number(ws.wages)).toBeGreaterThan(0);
      expect(Number(ws.hoard)).toBeGreaterThan(0);
      expect(Number(ws.wheelAngle)).toBeGreaterThan(0);

      // the rig is driven
      const overrides = result.current.state.elementOverrides;
      expect(overrides.get('production_wheel')?.rotation).toBeGreaterThan(0);
      expect(overrides.get('margin_floor')?.y).toBeDefined();
      expect(overrides.get('prestige_shell')?.opacity).toBeGreaterThan(0);

      // instruments are up
      expect(result.current.state.activeSliders.size).toBe(7);
      expect(result.current.state.activeGauges.size).toBe(4);
    });

    it('maxing greed+speculation starves wages and sparks flare-ups', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'the_machine' }));
      act(() => { vi.advanceTimersByTime(8000); });
      act(() => { result.current.advance(); });

      act(() => {
        result.current.setVariable('greed', 100);
        result.current.setVariable('speculation', 65); // below crisis line: no scene jump
        result.current.setVariable('regulation', 0);
        result.current.setVariable('hierarchy', 0);
      });
      act(() => { vi.advanceTimersByTime(6000); });

      // margin: 100 − 65·0.5 − 100·0.3 + 0 = 37.5
      const ws = result.current.state.worldState;
      expect(Number(ws.marginHeight)).toBeLessThan(40);
      expect(Number(ws.flareUps)).toBeGreaterThan(0);
      // flare effect landed on the first human
      expect(result.current.state.activeEffects.get('human_1')).toContain('electric_flare');
    });

    it('pulling the single tax lever raises the margin and fills the fund', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'the_machine' }));
      act(() => { vi.advanceTimersByTime(8000); });
      act(() => { result.current.advance(); });

      // grind the margin down first
      act(() => {
        result.current.setVariable('greed', 90);
        result.current.setVariable('speculation', 60);
      });
      act(() => { vi.advanceTimersByTime(3000); });
      const before = Number(result.current.state.worldState.marginHeight);

      act(() => { result.current.setVariable('singleTax', 1); });
      act(() => { vi.advanceTimersByTime(3000); });

      const ws = result.current.state.worldState;
      expect(Number(ws.marginHeight)).toBeGreaterThan(before);
      expect(Number(ws.publicFund)).toBeGreaterThan(0);
    });
  });
});
