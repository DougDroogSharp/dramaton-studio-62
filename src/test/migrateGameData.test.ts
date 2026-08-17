import { describe, it, expect } from 'vitest';
import { migrateGameData, createDefaultGame } from '@/types';

describe('migrateGameData — sceneType normalization', () => {
  it('defaults scenes with legacy sceneType values to AGENCY', () => {
    const legacy = {
      ...createDefaultGame(),
      scenes: [
        { id: 's1', name: 'Old Dialogue', sceneType: 'Dialogue' },
        { id: 's2', name: 'Old Cutscene', sceneType: 'Cutscene' },
        { id: 's3', name: 'No Type' },
      ],
    };
    const migrated = migrateGameData(legacy);
    expect(migrated.scenes.map(s => s.sceneType)).toEqual(['AGENCY', 'AGENCY', 'AGENCY']);
  });

  it('honors the 2.0-era `type` field carrying AGENCY/WITNESS', () => {
    const legacy = {
      ...createDefaultGame(),
      scenes: [
        { id: 's1', name: 'Old Agency', type: 'AGENCY' },
        { id: 's2', name: 'Old Witness', type: 'WITNESS' },
        { id: 's3', name: 'Old Other', type: 'Dialogue' },
      ],
    };
    const migrated = migrateGameData(legacy);
    expect(migrated.scenes.map(s => s.sceneType)).toEqual(['AGENCY', 'WITNESS', 'AGENCY']);
  });

  it('preserves valid AGENCY/WITNESS values', () => {
    const data = {
      ...createDefaultGame(),
      scenes: [
        { id: 's1', name: 'Acts', sceneType: 'AGENCY' },
        { id: 's2', name: 'Watches', sceneType: 'WITNESS' },
      ],
    };
    const migrated = migrateGameData(data);
    expect(migrated.scenes.map(s => s.sceneType)).toEqual(['AGENCY', 'WITNESS']);
  });

  it('still creates missing buttons/episodes arrays (legacy save shape)', () => {
    const legacy: any = {
      info: { title: 'Old', author: 'A', worldState: {}, gameMode: 'INTERACTIVE', styleGuide: null, enableAutosave: true },
      actors: [],
      scenes: [{ id: 's1', name: 'Scene', sceneType: 'Dialogue' }],
      drops: [],
      items: [],
      sfx: [],
    };
    const migrated = migrateGameData(legacy);
    expect(migrated.buttons).toEqual([]);
    expect(migrated.episodes).toHaveLength(1);
    expect(migrated.episodes[0].sceneIds).toEqual(['s1']);
    expect(migrated.scenes[0].sceneType).toBe('AGENCY');
  });
});
