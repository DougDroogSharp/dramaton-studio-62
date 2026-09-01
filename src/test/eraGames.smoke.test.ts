import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { migrateGameData, GameData } from '@/types';

// Smoke-plays every era game headlessly: start at the title scene,
// click through dialogue and take first choices, and require that the
// runner never crashes and actually shows dialogue along the way.

const GAMES = ['hvb-william', 'hvb-leopold', 'hvb-capone', 'hvb-elon', 'hvb-art-demo'];

const loadGame = (name: string): GameData => {
  const raw = readFileSync(resolve(__dirname, `../../public/${name}.json`), 'utf8');
  return migrateGameData(JSON.parse(raw));
};

describe('era games smoke-play', () => {
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

  for (const name of GAMES) {
    it(`${name} plays through from the title scene`, () => {
      const game = loadGame(name);
      const startId = game.info.titleSceneId || game.scenes[0].id;
      const { result } = renderHook(() => useScriptRunner({ game, startSceneId: startId }));

      let sawDialogue = 0;
      const visited = new Set<string>([result.current.state.currentSceneId]);

      // 60 interaction steps: finish typewriter, advance, take first choice
      for (let step = 0; step < 60; step++) {
        act(() => { vi.advanceTimersByTime(4000); });
        act(() => {
          if (result.current.state.choices) result.current.selectChoice(0);
          else result.current.advance();
        });
        if (result.current.state.activeDialogue) sawDialogue++;
        visited.add(result.current.state.currentSceneId);
      }

      expect(sawDialogue, `${name}: dialogue shown`).toBeGreaterThan(3);
      expect(visited.size, `${name}: scenes visited`).toBeGreaterThan(1);
    });
  }
});
