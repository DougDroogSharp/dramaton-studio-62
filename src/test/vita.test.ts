import { describe, it, expect } from 'vitest';
import {
  varName,
  vitaVariables,
  syncVitaToWorldState,
  applyVitaPreset,
  presetFromActor,
} from '../utils/vita';
import { Actor, GameData, createDefaultGame, createStarterVitaPresets, migrateGameData } from '../types';

const vita = (extra: Partial<Actor> = {}): Actor => ({
  id: 'george',
  name: 'George',
  graphics: [],
  gauges: [{ name: 'hunger', level: 25, redLine: 90, goal: 20 }],
  knobs: [{ name: 'appetite', value: 90 }],
  ...extra,
});

const gameWith = (worldState: Record<string, string | number | boolean> = {}): GameData => {
  const g = createDefaultGame();
  g.info.worldState = worldState;
  return g;
};

describe('varName', () => {
  it('joins fragments as lowercase word characters', () => {
    expect(varName('George', 'Blood Sugar')).toBe('george_blood_sugar');
    expect(varName('george', 'hunger', 'redline')).toBe('george_hunger_redline');
  });
});

describe('vitaVariables', () => {
  it('exposes level, redline, goal per gauge and value per knob', () => {
    expect(vitaVariables(vita())).toEqual({
      george_hunger: 25,
      george_hunger_redline: 90,
      george_hunger_goal: 20,
      george_appetite: 90,
    });
  });

  it('skips unnamed rows and handles missing arrays', () => {
    expect(vitaVariables({ id: 'g', gauges: [{ name: ' ', level: 1, redLine: 2, goal: 3 }] })).toEqual({});
    expect(vitaVariables({ id: 'g' })).toEqual({});
  });
});

describe('syncVitaToWorldState', () => {
  it('materializes the variables into world state, keeping unrelated vars', () => {
    const result = syncVitaToWorldState(gameWith({ plot_tension: 40 }), vita());
    expect(result.info.worldState).toMatchObject({
      plot_tension: 40,
      george_hunger: 25,
      george_appetite: 90,
    });
  });

  it('removes orphans when a gauge is renamed or deleted', () => {
    const before = vita();
    const game = syncVitaToWorldState(gameWith(), before);
    const renamed = vita({ gauges: [{ name: 'satiety', level: 70, redLine: 5, goal: 80 }] });
    const result = syncVitaToWorldState(game, renamed, before);
    expect(result.info.worldState.george_satiety).toBe(70);
    expect(result.info.worldState).not.toHaveProperty('george_hunger');
    expect(result.info.worldState).not.toHaveProperty('george_hunger_redline');
    expect(result.info.worldState.george_appetite).toBe(90);
  });
});

describe('presets', () => {
  it('applyVitaPreset deep-copies so tweaks do not mutate the preset', () => {
    const [happy] = createStarterVitaPresets();
    const dressed = applyVitaPreset(vita({ gauges: [], knobs: [] }), happy);
    dressed.gauges![0].level = 1;
    expect(happy.gauges[0].level).not.toBe(1);
    expect(dressed.knobs!.map(k => k.name)).toContain('appetite');
  });

  it('presetFromActor captures the current dial state', () => {
    const p = presetFromActor(vita(), 'Grumpy Full');
    expect(p.name).toBe('Grumpy Full');
    expect(p.gauges).toEqual(vita().gauges);
  });

  it('migrateGameData seeds starter presets once', () => {
    const migrated = migrateGameData({ info: { worldState: {} }, actors: [], scenes: [] });
    expect(migrated.vitaPresets.map(p => p.name)).toEqual(['Happy Voracious', 'Starving Lazy']);
    const already = migrateGameData({ info: { worldState: {} }, vitaPresets: [] });
    expect(already.vitaPresets).toEqual([]);
  });
});
