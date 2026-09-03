import { describe, it, expect } from 'vitest';
import { migrateGameData, createDefaultGame } from '@/types';

describe('migrateGameData — untrusted shape gate (bridge PUTs, hand-edited files)', () => {
  it('throws on hopeless input instead of returning a broken document', () => {
    expect(() => migrateGameData(null)).toThrow(/game document/);
    expect(() => migrateGameData([1, 2, 3])).toThrow(/game document/);
    expect(() => migrateGameData('a string')).toThrow(/game document/);
  });

  it('repairs a document with no info so the editor cannot white-screen', () => {
    const migrated = migrateGameData({ scenes: [{ id: 's1', name: 'Only Scene' }] });
    expect(migrated.info.worldState).toEqual({});
    expect(typeof migrated.info.enableAutosave).toBe('boolean');
    expect(migrated.actors).toEqual([]);
    expect(migrated.items).toEqual([]);
    expect(migrated.sfx).toEqual([]);
    expect(migrated.scenes[0].name).toBe('Only Scene');
  });

  it('repairs a garbage worldState and keeps real info fields', () => {
    const migrated = migrateGameData({ info: { title: 'Kept', worldState: 'nonsense' } });
    expect(migrated.info.title).toBe('Kept');
    expect(migrated.info.worldState).toEqual({});
  });
});

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

  it('renames the 2.0-era screens collection to drops, and screenId to dropId', () => {
    // Shape mirrors real Dec 2025 exports (dramaton_protocol_*.json)
    const legacy: any = {
      info: { title: 'Old', author: 'A', worldState: {}, styleGuide: null, gameMode: 'INTERACTIVE' },
      actors: [],
      scenes: [{ id: 's1', name: 'Scene', type: 'AGENCY', requirements: {}, stage: [], screenId: 'scr1', script: '' }],
      screens: [{ id: 'scr1', name: 'Backdrop', prompt: 'a room', image: 'data:image/png;base64,x' }],
      items: [{ id: 'i1', name: 'Crazy Table', category: 'prop', acquisition: 'pickup', unlockCondition: null, effects: [] }],
      sfx: [],
    };
    const migrated = migrateGameData(legacy);
    expect(migrated.drops).toHaveLength(1);
    expect(migrated.drops[0].name).toBe('Backdrop');
    expect((migrated as any).screens).toBeUndefined();
    expect(migrated.scenes[0].dropId).toBe('scr1');
    expect((migrated.scenes[0] as any).screenId).toBeUndefined();
    expect(migrated.scenes[0].sceneType).toBe('AGENCY');
    // Item passes through untouched
    expect(migrated.items[0].category).toBe('prop');
  });

  it('leaves modern drops/dropId saves alone', () => {
    const modern = {
      ...createDefaultGame(),
      scenes: [{ id: 's1', name: 'Scene', sceneType: 'AGENCY' as const, dropId: 'd1' }],
      drops: [{ id: 'd1', name: 'Drop', prompt: 'p' }],
    };
    const migrated = migrateGameData(modern);
    expect(migrated.drops).toHaveLength(1);
    expect(migrated.scenes[0].dropId).toBe('d1');
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

describe('migrateGameData — one Narraton shape (decision #5, 2026-09-01)', () => {
  it('folds the editor lane key/phase/subplotId fields into Scene.narraton', () => {
    const legacy = {
      ...createDefaultGame(),
      scenes: [
        { id: 's1', name: 'Keyed', key: { tension: 40, gold: 10 }, phase: 'MIDDLE', subplotId: 'subplot_pinky' },
        { id: 's2', name: 'Plain' },
      ],
    };
    const migrated = migrateGameData(legacy);
    const [s1, s2] = migrated.scenes as any[];
    expect(s1.narraton).toEqual({
      pool: 'main',
      keys: { tension: 40, gold: 10 },
      act: 'MIDDLE',
      subplot: 'subplot_pinky',
    });
    expect('key' in s1).toBe(false);
    expect('phase' in s1).toBe(false);
    expect('subplotId' in s1).toBe(false);
    expect(s2.narraton).toBeUndefined();
  });

  it('keeps an existing narraton block in charge when both shapes are present', () => {
    const legacy = {
      ...createDefaultGame(),
      scenes: [
        {
          id: 's1',
          name: 'Both',
          key: { tension: 40 },
          phase: 'END',
          subplotId: 'old',
          narraton: { pool: 'act2', keys: { gold: { target: 20, scale: 1000 } }, act: 'BEGINNING', subplot: 'new', weight: 2 },
        },
      ],
    };
    const [s1] = migrateGameData(legacy).scenes as any[];
    expect(s1.narraton.pool).toBe('act2');
    expect(s1.narraton.act).toBe('BEGINNING');
    expect(s1.narraton.subplot).toBe('new');
    expect(s1.narraton.weight).toBe(2);
    // legacy keys merge in underneath the block's own
    expect(s1.narraton.keys).toEqual({ tension: 40, gold: { target: 20, scale: 1000 } });
  });

  it('drops empty legacy fields without inventing a pool', () => {
    const legacy = { ...createDefaultGame(), scenes: [{ id: 's1', name: 'Empty key', key: {} }] };
    const [s1] = migrateGameData(legacy).scenes as any[];
    expect(s1.narraton).toBeUndefined();
    expect('key' in s1).toBe(false);
  });
});
