import { describe, it, expect } from 'vitest';
import { LEG_BONES, normalizeBoneName, rigKindFromArmature, rigKindFromNames, rigLabel } from '../utils/rigKind';
import { allSkinAnimations, clipPoseName, skinFromStoreEntry } from '../utils/skins';
import { getAutoCompleteSuggestions } from '../utils/scriptParser';
import { GameData } from '../types';

describe('normalizeBoneName', () => {
  it('strips the Mixamo colon', () => {
    expect(normalizeBoneName('mixamorig:Hips')).toBe('mixamorigHips');
  });
  it('folds the re-rig digit form (mixamorig1Hips) into the plain one', () => {
    expect(normalizeBoneName('mixamorig1Hips')).toBe('mixamorigHips');
    expect(normalizeBoneName('mixamorig12:LeftFoot')).toBe('mixamorigLeftFoot');
  });
  it('leaves foreign names alone', () => {
    expect(normalizeBoneName('Spine02')).toBe('Spine02');
    expect(normalizeBoneName('mixamorigHips.quaternion')).toBe('mixamorigHips.quaternion');
  });
});

describe('rigKind', () => {
  const legs = LEG_BONES.map(b => ({ name: b.replace('mixamorig', 'mixamorig:') }));

  it('is static with no joints', () => {
    expect(rigKindFromArmature(undefined)).toBe('static');
    expect(rigKindFromArmature([])).toBe('static');
  });
  it('is mixamorig when all seven leg bones are present, colon or not', () => {
    expect(rigKindFromArmature(legs)).toBe('mixamorig');
    expect(rigKindFromNames(LEG_BONES)).toBe('mixamorig');
    expect(rigKindFromNames(LEG_BONES.map(b => b.replace('mixamorig', 'mixamorig1')))).toBe('mixamorig');
  });
  it('is other when a leg bone is missing or the names are foreign', () => {
    expect(rigKindFromArmature(legs.slice(0, 6))).toBe('other');
    expect(rigKindFromArmature([{ name: 'Spine' }, { name: 'neck', parent: 'Spine' }])).toBe('other');
  });
  it('labels every kind', () => {
    expect(rigLabel('mixamorig')).toMatch(/WALKS/);
    expect(rigLabel('static')).toMatch(/STATIC/);
    expect(rigLabel('other')).toMatch(/RIGGED/);
    expect(rigLabel(undefined)).toMatch(/unknown/);
  });
});

describe('store skins and library clips', () => {
  it('builds a pointer skin from a manifest entry, trimming the parenthetical', () => {
    const s = skinFromStoreEntry({ file: 'vita_meshy_2b.glb', name: 'Vita 2b colorful, revised (older, androgynous; Meshy auto-rigged 2026-09-02)' }, '2026-09-02T22:07:00-07:00');
    expect(s.modelFile).toBe('vita_meshy_2b.glb');
    expect(s.fileName).toBe('vita_meshy_2b.glb');
    expect(s.name).toBe('Vita 2b colorful, revised');
    expect(s.animations).toEqual([]);
    expect(s.source).toEqual({ kind: 'store', filedAt: '2026-09-02T22:07:00-07:00' });
  });
  it('turns a clip label into one Dramscript pose word', () => {
    expect(clipPoseName('wave hello (Big_Wave_Hello, action 28)')).toBe('wave_hello');
    expect(clipPoseName('idle')).toBe('idle');
    expect(clipPoseName('  Dance 2  ')).toBe('dance_2');
    expect(clipPoseName('(nothing)')).toBe('clip');
  });
  it('offers an assigned library clip in [POSE] autocomplete', () => {
    const game = {
      actors: [{ id: 'vita', name: 'Vita', graphics: [], skinId: 's1' }],
      skins: [{ id: 's1', name: 'Vita 2b', modelFile: 'vita_meshy_2b.glb', animations: [], clipRefs: [{ name: 'wave_hello', file: 'vita_anim_wave_clip.glb' }] }],
      info: { customPoses: [] },
    } as unknown as GameData;
    const script = '[POSE vita pose=wa';
    const labels = getAutoCompleteSuggestions(script, script.length, game).map(s => s.label);
    expect(labels).toContain('wave_hello');
  });
  it('offers assigned library clips as poses, without duplicates', () => {
    expect(allSkinAnimations({
      animations: ['walk', 'Idle'],
      authoredAnimations: [{ name: 'slump', clip: {} }],
      clipRefs: [{ name: 'walk', file: 'vita_anim_walk_clip.glb' }, { name: 'cheer', file: 'vita_anim_cheer_clip.glb' }],
    })).toEqual(['walk', 'Idle', 'slump', 'cheer']);
  });
});
