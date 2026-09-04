import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MODELS_DIR_REL, appendManifestSkin, freeStem, listClips, readListing, storeRiggedGlb, storeSlug } from '../../vite-plugin-models';
import { joinGlb, glbNodeNames } from '../utils/glbRename';

// A throwaway checkout root with a tiny model store in it.
let root = '';
let dir = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'actor3d-store-'));
  dir = join(root, MODELS_DIR_REL);
  mkdirSync(dir, { recursive: true });
  for (const f of [
    'vita_meshy_2b.glb', 'vita_anim_idle.glb', 'vita_anim_idle_clip.glb',
    'vita_anim_wave_clip.glb', 'vita_meshy_2b_running_armature.glb', 'dragon_meshy.glb',
  ]) writeFileSync(join(dir, f), 'x');
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    skins: [
      { file: 'vita_meshy_2b.glb', name: 'Vita 2b' },
      { file: 'missing.fbx', name: 'Gone' },
    ],
    vita_animations: [
      { file: 'vita_anim_idle.glb', name: 'idle (Idle, action 0)' },
      { file: 'vita_anim_wave.glb', name: 'wave hello (Big_Wave_Hello, action 28)' },
    ],
    props: [{ file: 'dragon_meshy.glb', name: 'Gold dragon' }],
  }));
});

afterAll(() => { rmSync(root, { recursive: true, force: true }); });

describe('model store listing', () => {
  it('lists only skins that exist on disk, with sizes', () => {
    const l = readListing(root);
    expect(l.error).toBeUndefined();
    expect(l.skins.map(s => s.file)).toEqual(['vita_meshy_2b.glb']);
    expect(typeof l.skins[0].mb).toBe('number');
    expect(l.props.map(p => p.file)).toEqual(['dragon_meshy.glb']);
  });
  it('finds every bones-only clip file and names it from the manifest when it can', () => {
    const clips = listClips(dir, JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')));
    expect(clips.map(c => c.file)).toEqual([
      'vita_anim_idle_clip.glb', 'vita_anim_wave_clip.glb', 'vita_meshy_2b_running_armature.glb',
    ]);
    expect(clips[0].name).toBe('idle');
    expect(clips[1].name).toBe('wave hello');
    expect(clips[2].name).toBe('vita meshy 2b running');
  });
  it('names store files safely and never overwrites', () => {
    expect(storeSlug('Ivy, the small green one!')).toBe('ivy_the_small_green_one');
    expect(freeStem(dir, 'vita_meshy_2b', ['.glb'])).toBe('vita_meshy_2b_2');
    expect(freeStem(dir, 'brand_new', ['.glb'])).toBe('brand_new');
  });

  it('stores a Meshy rig renamed, keeps the raw, registers only a walker, appends under lock', () => {
    const legs = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end'];
    const nodes = [{ name: 'Armature', children: [1] }, ...legs.map(name => ({ name })), { name: 'char1', mesh: 0, skin: 0 }];
    const rig = { asset: { version: '2.0' }, nodes, skins: [{ joints: legs.map((_, i) => i + 1) }] };
    const glb = Buffer.from(joinGlb({ version: 2, json: rig, rest: [] }));
    const walk = Buffer.from(joinGlb({ version: 2, json: { asset: { version: '2.0' }, nodes: [{ name: 'Hips' }], animations: [{ name: 'walk', channels: [], samplers: [] }] }, rest: [] }));
    const stored = storeRiggedGlb(dir, 'ivy_meshy', glb, [{ suffix: '_walking_armature.glb', data: walk, clip: 'walk' }], { name: 'Ivy (test)', _note: 'unit test' });
    expect(stored.humanoid).toBe(true);
    expect(stored.file).toBe('ivy_meshy.glb');
    expect(stored.files).toEqual(['ivy_meshy_raw.glb', 'ivy_meshy.glb', 'ivy_meshy_walking_armature.glb']);
    expect(stored.renamedBones).toBe(13);
    expect(stored.clips).toEqual([{ name: 'walk', file: 'ivy_meshy_walking_armature.glb' }]);
    const ab = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    const renamed = glbNodeNames(ab(readFileSync(join(dir, 'ivy_meshy.glb'))));
    expect(renamed).toContain('mixamorig:Hips');
    expect(glbNodeNames(ab(readFileSync(join(dir, 'ivy_meshy_walking_armature.glb'))))).toEqual(['mixamorig:Hips']);
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    const entry = manifest.skins.find((s: { file: string }) => s.file === 'ivy_meshy.glb');
    expect(entry).toMatchObject({ name: 'Ivy (test)', _note: 'unit test' });
    // Other entries and other keys survive the append.
    expect(manifest.skins[0].file).toBe('vita_meshy_2b.glb');
    expect(manifest.props[0].file).toBe('dragon_meshy.glb');
    // A prop (no leg bones) is stored but not registered.
    const prop = Buffer.from(joinGlb({ version: 2, json: { asset: { version: '2.0' }, nodes: [{ name: 'DragonRoot' }] }, rest: [] }));
    const stored2 = storeRiggedGlb(dir, 'dragon2_meshy', prop, [], { name: 'Dragon 2' });
    expect(stored2.humanoid).toBe(false);
    expect(stored2.files).toEqual(['dragon2_meshy.glb']);
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).skins.some((s: { file: string }) => s.file === 'dragon2_meshy.glb')).toBe(false);
    // Appending the same file twice does not duplicate.
    appendManifestSkin(dir, { file: 'ivy_meshy.glb', name: 'again' });
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).skins.filter((s: { file: string }) => s.file === 'ivy_meshy.glb')).toHaveLength(1);
  });

  it('reports a missing manifest instead of throwing', () => {
    const l = readListing(join(root, 'nowhere'));
    expect(l.skins).toEqual([]);
    expect(l.error).toMatch(/no manifest/);
  });
});
