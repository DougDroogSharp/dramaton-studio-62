// Verification against real legacy save files (Dramaton Editor 2.0 era).
// These live in Doug's Dropbox and are up to 22MB, so they are not repo
// fixtures; the suite skips itself on machines where they don't exist.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { migrateGameData } from '@/types';

const DIR = 'C:/Users/dougs/Dropbox/Apps/PhrogDrop/Dramaton Game Files/';
const FILES = [
  'dramaton_protocol_d (12).json',
  'dramaton_protocol_dang_that_platypus (6).json',
  'dramaton_protocol_dang_that_platypus (16).json',
  'dramaton_protocol_dingleberry_stew_AUTOSAVE_3-30-59 PM.dram',
  'The_best_goddamn_game_ever_made.dram',
];

describe.skipIf(!existsSync(DIR))('real legacy save files', () => {
  for (const f of FILES) {
    it.skipIf(!existsSync(DIR + f))(`migrates ${f}`, () => {
      const raw = JSON.parse(readFileSync(DIR + f, 'utf8'));
      const g = migrateGameData(raw);
      // Collections all exist as arrays
      for (const key of ['actors', 'scenes', 'drops', 'items', 'sfx', 'buttons', 'episodes'] as const) {
        expect(Array.isArray(g[key]), `${key} must be an array`).toBe(true);
      }
      expect((g as any).screens).toBeUndefined();
      // Every scene has a valid sceneType and no screenId leftovers
      for (const s of g.scenes) {
        expect(['AGENCY', 'WITNESS']).toContain(s.sceneType);
        expect((s as any).screenId).toBeUndefined();
      }
      // Scenes that referenced a screen/drop point at one that exists
      const dropIds = new Set(g.drops.map(d => d.id));
      for (const s of g.scenes) {
        if (s.dropId) expect(dropIds.has(s.dropId), `dropId ${s.dropId} resolves`).toBe(true);
      }
      // Info essentials survived
      expect(typeof g.info.title).toBe('string');
      expect(g.info.title.length).toBeGreaterThan(0);
    });
  }
});
