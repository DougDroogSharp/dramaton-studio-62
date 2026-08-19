import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import { parseScript, ScriptCommand, TickCommand, IfCommand, ChoiceCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { migrateGameData, GameData } from '@/types';

// Validates the campaign scaffold (public/hvb-campaign.json):
// structure resolves, every chapter's machine runs, and both endings
// are reachable.

const loadGame = (): GameData => {
  const raw = readFileSync(resolve(__dirname, '../../public/hvb-campaign.json'), 'utf8');
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

describe('hvb-campaign.json', () => {
  const game = loadGame();

  it('every scene script parses with zero UNKNOWN commands', () => {
    for (const scene of game.scenes) {
      const unknown = collectUnknown(parseScript(scene.script || ''));
      expect(unknown, `scene ${scene.id} has unparsed lines`).toEqual([]);
    }
  });

  it('every SCENE jump and CHOICE target resolves', () => {
    const sceneIds = new Set(game.scenes.map(s => s.id));
    const walk = (cmds: ScriptCommand[], from: string) => {
      for (const c of cmds) {
        if (c.type === 'SCENE') expect(sceneIds.has(c.sceneId), `${from}: SCENE ${c.sceneId}`).toBe(true);
        if (c.type === 'CHOICE') {
          for (const o of (c as ChoiceCommand).options) {
            expect(sceneIds.has(o.target), `${from}: choice -> ${o.target}`).toBe(true);
          }
        }
        if (c.type === 'IF' || c.type === 'TICK') walk((c as IfCommand | TickCommand).commands, from);
      }
    };
    for (const scene of game.scenes) walk(parseScript(scene.script || ''), scene.id);
  });

  it('all five chapter pools plus the sandbox pool are populated', () => {
    for (let n = 1; n <= 5; n++) {
      const pool = game.scenes.filter(s => s.narraton?.pool === `ch${n}`);
      expect(pool.length, `pool ch${n}`).toBeGreaterThanOrEqual(4); // 3 scenes + finale
      const finale = pool.find(s => s.id === `ch${n}_finale`)!;
      expect(finale.narraton?.repeatable).toBe(false);
      expect(finale.narraton?.requires?.length).toBeGreaterThan(0);
    }
    expect(game.scenes.filter(s => s.narraton?.pool === 'witness').length).toBeGreaterThanOrEqual(4);
  });

  it('chapter finales chain: 1→2→3→4→5→menu', () => {
    for (let n = 1; n <= 5; n++) {
      const finale = game.scenes.find(s => s.id === `ch${n}_finale`)!;
      const jumps = parseScript(finale.script!).filter(c => c.type === 'SCENE');
      const target = n < 5 ? `ch${n + 1}_intro` : 'menu';
      expect((jumps[0] as { sceneId: string }).sceneId).toBe(target);
    }
  });

  describe('runtime', () => {
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

    // Enter a chapter hub with commentary/endings pushed far away so a
    // test can watch the economy undisturbed unless it wants them.
    const mountHub = (hubId: string) => {
      const rendered = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: hubId }));
      act(() => {
        rendered.result.current.setVariable('c_commentaryCooldown', 100000);
      });
      return rendered;
    };

    it('chapter intros apply era presets and reset the sim', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'ch2_intro' }));
      // click through the two intro narration lines
      for (let i = 0; i < 2; i++) {
        act(() => { vi.advanceTimersByTime(10000); });
        act(() => { result.current.advance(); });
      }
      const ws = result.current.state.worldState;
      expect(result.current.state.currentSceneId).toBe('ch2_machine');
      expect(ws.greed).toBe(100);        // Leopold preset
      expect(ws.repression).toBe(95);
      expect(ws.chapter).toBe(2);
      expect(ws.hoard).toBe(0);          // sim reset
    });

    // Click through intro narration until the target scene is reached
    const clickThrough = (result: { current: ReturnType<typeof useScriptRunner> }, target: string, maxClicks = 8) => {
      for (let i = 0; i < maxClicks && result.current.state.currentSceneId !== target; i++) {
        act(() => { vi.advanceTimersByTime(10000); });
        act(() => { result.current.advance(); });
      }
    };

    it('the legacy carries when arriving from the previous chapter', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'menu' }));
      // simulate the end of chapter 1: a built-up world
      act(() => {
        result.current.setVariable('chapter', 1);
        result.current.setVariable('hoard', 300);
        result.current.setVariable('prestige', 60);
        result.current.setVariable('education', 50);
        result.current.setVariable('productivity', 2.5);
        result.current.setVariable('publicFund', 100);
        result.current.setVariable('singleTax', 1);
      });
      act(() => { result.current.goToScene('ch2_intro'); });
      clickThrough(result, 'ch2_machine');

      const ws = result.current.state.worldState;
      expect(result.current.state.currentSceneId).toBe('ch2_machine');
      expect(ws.hoard).toBeCloseTo(300 * 0.6);        // c_legacyHoard
      expect(ws.prestige).toBeCloseTo(60 * 0.7);      // c_legacyPrestige
      expect(ws.education).toBeCloseTo(25);           // max(50*0.5, preset 10)
      expect(ws.productivity).toBe(2.5);              // progress never regresses
      expect(ws.publicFund).toBeCloseTo(25);
      expect(ws.singleTax).toBe(0);                   // each era re-wins the lever
      expect(ws.chapter).toBe(2);
    });

    it('a menu jump to a non-adjacent chapter plays fresh', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'menu' }));
      act(() => {
        result.current.setVariable('chapter', 5);
        result.current.setVariable('hoard', 900);
        result.current.setVariable('productivity', 3);
      });
      act(() => { result.current.goToScene('ch2_intro'); });
      clickThrough(result, 'ch2_machine');

      const ws = result.current.state.worldState;
      expect(ws.hoard).toBe(0);
      expect(ws.productivity).toBe(1.5);
      expect(ws.education).toBe(10); // Leopold preset
    });

    it('re-entering the current chapter resumes it untouched', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'menu' }));
      act(() => {
        result.current.setVariable('chapter', 3);
        result.current.setVariable('hoard', 250);
        result.current.setVariable('singleTax', 1);
      });
      // menu round-trip back into the same chapter (e.g. after tuning)
      act(() => { result.current.goToScene('ch3_intro'); });
      clickThrough(result, 'ch3_machine');

      const ws = result.current.state.worldState;
      expect(result.current.state.currentSceneId).toBe('ch3_machine');
      expect(ws.hoard).toBe(250);     // nothing reset
      expect(ws.singleTax).toBe(1);   // even the lever survives a resume
    });

    it('chapter 1 always starts the ledger empty (even after sandbox)', () => {
      const { result } = renderHook(() => useScriptRunner({ game: loadGame(), startSceneId: 'menu' }));
      act(() => {
        result.current.setVariable('chapter', 0); // sandbox marker
        result.current.setVariable('hoard', 500);
      });
      act(() => { result.current.goToScene('ch1_intro'); });
      clickThrough(result, 'ch1_machine');

      expect(result.current.state.worldState.hoard).toBe(0);
      expect(result.current.state.worldState.chapter).toBe(1);
    });

    it('every chapter hub ticks: product moves in all five', () => {
      for (let n = 1; n <= 5; n++) {
        const { result, unmount } = mountHub(`ch${n}_machine`);
        act(() => { vi.advanceTimersByTime(3000); });
        expect(Number(result.current.state.worldState.product), `ch${n} product`).toBeGreaterThan(0);
        expect(result.current.state.activeSliders.size, `ch${n} panel`).toBe(7);
        unmount();
      }
    });

    it('COLLAPSE is reachable: starved wages + mass flare-ups sustained', () => {
      const { result } = mountHub('ch1_machine');
      act(() => {
        // grind wages to the survival floor with maximum flare pressure
        result.current.setVariable('greed', 100);
        result.current.setVariable('speculation', 65);
        result.current.setVariable('regulation', 0);
        result.current.setVariable('hierarchy', 100);
        result.current.setVariable('education', 0);
        result.current.setVariable('c_collapseTicks', 10); // faster test
      });
      act(() => { vi.advanceTimersByTime(15000); }); // 30 ticks

      expect(result.current.state.currentSceneId).toBe('ending_collapse');
    });

    it('RECONSTITUTION is reachable: lever held while education climbs', () => {
      const { result } = mountHub('ch5_machine');
      act(() => {
        result.current.setVariable('singleTax', 1);
        result.current.setVariable('education', 90);
        result.current.setVariable('c_reconTicks', 10);
        // keep wages healthy so collapse never races it
        result.current.setVariable('greed', 10);
        result.current.setVariable('speculation', 10);
      });
      act(() => { vi.advanceTimersByTime(15000); });

      expect(result.current.state.currentSceneId).toBe('ending_reconstitution');
    });

    it('the sandbox never ends on its own', () => {
      const { result } = mountHub('sandbox_machine');
      act(() => {
        result.current.setVariable('greed', 100);
        result.current.setVariable('hierarchy', 100);
        result.current.setVariable('regulation', 0);
        result.current.setVariable('c_collapseTicks', 5);
      });
      act(() => { vi.advanceTimersByTime(20000); });

      expect(result.current.state.currentSceneId).toBe('sandbox_machine'); // no endings wired
    });
  });
});
