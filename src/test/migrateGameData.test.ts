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

// Before 2026-09-02 the theater runtime kept its Narraton metadata in a
// nested `scene.narraton` object; the editor's director used flat
// key/phase/subplotId. Unified onto the flat fields; the loader lifts the
// legacy object so old saves, bridge PUTs and hand-edited files keep working.
describe('migrateGameData — legacy nested scene.narraton lifts onto the flat fields', () => {
  const withScenes = (scenes: unknown[], extra: Record<string, unknown> = {}) => ({
    ...createDefaultGame(),
    scenes,
    ...extra,
  });

  it('lifts pool, keys (+scale), requires, repeatable, weight, act and drops the object', () => {
    const migrated = migrateGameData(withScenes([{
      id: 's1', name: 'Legacy',
      narraton: {
        pool: 'witness',
        keys: { wages: { target: 5, scale: 60 }, flareUps: 4, hoard: { target: 500, scale: 100 } },
        requires: [{ variable: 'crisis', operator: '==', value: 1 }],
        repeatable: true,
        weight: 3,
        act: 'END',
      },
    }]));
    const s = migrated.scenes[0];
    expect((s as any).narraton).toBeUndefined();
    expect(s.pool).toBe('witness');
    expect(s.key).toEqual({ wages: 5, flareUps: 4, hoard: 500 });
    expect(s.keyScale).toEqual({ wages: 60 }); // scale 100 is the default, not stored
    expect(s.requires).toEqual([{ variable: 'crisis', operator: '==', value: 1 }]);
    expect(s.repeatable).toBe(true);
    expect(s.weight).toBe(3);
    expect(s.act).toBe('END');
  });

  it('keeps an explicit repeatable:false and drops the default weight 1', () => {
    const migrated = migrateGameData(withScenes([{
      id: 'finale', name: 'Finale', narraton: { pool: 'ch1', repeatable: false, weight: 1 },
    }]));
    const s = migrated.scenes[0];
    expect(s.repeatable).toBe(false);
    expect(s.weight).toBeUndefined();
    expect(s.key).toBeUndefined(); // pool-only: a perfect-match candidate
    expect(s.pool).toBe('ch1');
  });

  it('a legacy subplot string becomes subplotId and creates the Subplot once', () => {
    const migrated = migrateGameData(withScenes([
      { id: 'r1', name: 'R1', narraton: { pool: 'main', subplot: 'resistance' } },
      { id: 'r2', name: 'R2', narraton: { pool: 'main', subplot: 'resistance' } },
      { id: 't1', name: 'T1', narraton: { pool: 'main', subplot: 'tycoon' } },
    ], { subplots: [{ id: 'tycoon', name: 'The Tycoon', owner: 'Tony' }] }));
    expect(migrated.scenes.map(s => s.subplotId)).toEqual(['resistance', 'resistance', 'tycoon']);
    expect(migrated.subplots.map(sp => sp.id)).toEqual(['tycoon', 'resistance']);
    expect(migrated.subplots[0].name).toBe('The Tycoon'); // existing subplot untouched
    expect(migrated.subplots[1]).toMatchObject({ id: 'resistance', name: 'resistance' });
  });

  it('flat fields already present win; the legacy object only fills gaps', () => {
    const migrated = migrateGameData(withScenes([{
      id: 's1', name: 'Both',
      key: { wages: 90 }, keyScale: { wages: 50 }, subplotId: 'editor_sp', phase: 'MIDDLE', repeatable: false,
      narraton: {
        pool: 'main',
        keys: { wages: { target: 10, scale: 60 }, greed: 40 },
        subplot: 'legacy_sp',
        repeatable: true,
        weight: 2,
      },
    }]));
    const s = migrated.scenes[0];
    expect(s.key).toEqual({ wages: 90, greed: 40 });   // wages kept, greed filled in
    expect(s.keyScale).toEqual({ wages: 50 });          // legacy scale for wages ignored
    expect(s.subplotId).toBe('editor_sp');
    expect(migrated.subplots.map(sp => sp.id)).not.toContain('legacy_sp');
    expect(s.phase).toBe('MIDDLE');
    expect(s.repeatable).toBe(false);
    expect(s.pool).toBe('main');
    expect(s.weight).toBe(2);
    expect((s as any).narraton).toBeUndefined();
  });

  it('is a no-op for scenes without the legacy object and idempotent after the lift', () => {
    const modern = withScenes([{ id: 's1', name: 'Modern', pool: 'main', key: { x: 1 }, phase: 'BEGINNING' as const }]);
    const once = migrateGameData(JSON.parse(JSON.stringify(modern)));
    expect(once.scenes[0]).toMatchObject({ pool: 'main', key: { x: 1 }, phase: 'BEGINNING' });
    const legacy = withScenes([{ id: 's2', name: 'Old', narraton: { pool: 'p', keys: { x: { target: 1, scale: 10 } } } }]);
    const first = migrateGameData(JSON.parse(JSON.stringify(legacy)));
    const second = migrateGameData(JSON.parse(JSON.stringify(first)));
    expect(second.scenes[0]).toEqual(first.scenes[0]);
    expect(second.scenes[0]).toMatchObject({ pool: 'p', key: { x: 1 }, keyScale: { x: 10 } });
  });

  it('tolerates garbage in the legacy object (untrusted bridge PUTs)', () => {
    const migrated = migrateGameData(withScenes([
      { id: 'a', name: 'A', narraton: 'nonsense' },
      { id: 'b', name: 'B', narraton: null },
      { id: 'c', name: 'C', narraton: { pool: 7, keys: 'x', requires: 'no', weight: 'heavy', act: 'FOUR', subplot: '  ' } },
      { id: 'd', name: 'D', narraton: { pool: ' main ', keys: { ok: 3, bad: 'high', worse: { target: 'x' } } } },
    ]));
    for (const s of migrated.scenes) expect((s as any).narraton).toBeUndefined();
    expect(migrated.scenes[0].pool).toBeUndefined();
    expect(migrated.scenes[2]).toEqual({ id: 'c', name: 'C', sceneType: 'AGENCY' });
    expect(migrated.scenes[3].pool).toBe('main');
    expect(migrated.scenes[3].key).toEqual({ ok: 3 });
    expect(migrated.subplots).toEqual([]);
  });
});
