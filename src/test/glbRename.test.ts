import { describe, it, expect } from 'vitest';
import { glbNodeNames, joinGlb, renameGlbNodes, splitGlb } from '../utils/glbRename';
import { MESHY_TO_MIXAMO, looksLikeMeshyRig, meshyToMixamo } from '../utils/meshyBones';
import { gltfJsonFromGlb, armatureFromGltf } from '../utils/skins';
import { rigKindFromArmature } from '../utils/rigKind';

const meshyRig = {
  asset: { version: '2.0' },
  nodes: [
    { name: 'Armature', children: [1] },
    { name: 'Hips', children: [2, 5] },
    { name: 'LeftUpLeg', children: [3] }, { name: 'LeftLeg', children: [4] }, { name: 'LeftFoot' },
    { name: 'RightUpLeg', children: [6] }, { name: 'RightLeg', children: [7] }, { name: 'RightFoot' },
    { name: 'Spine02', children: [9] }, { name: 'Spine01', children: [10] }, { name: 'Spine', children: [11] },
    { name: 'neck', children: [12] }, { name: 'Head', children: [13] }, { name: 'head_end' }, { name: 'headfront' },
    { name: 'char1', mesh: 0, skin: 0 },
  ],
  skins: [{ joints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }],
  animations: [{ name: 'Armature|clip0|baselayer', channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }], samplers: [] }],
};

const makeGlb = (json: unknown, bin?: Uint8Array): ArrayBuffer =>
  joinGlb({ version: 2, json, rest: bin ? [{ type: 0x004e4942, data: bin }] : [] });

describe('GLB rename', () => {
  it('round-trips a GLB with a binary chunk and 4-byte padding', () => {
    const bin = new Uint8Array([1, 2, 3, 4, 5]);
    const glb = makeGlb({ asset: { version: '2.0' }, nodes: [{ name: 'x' }] }, bin);
    expect(glb.byteLength % 4).toBe(0);
    const parts = splitGlb(glb);
    expect((parts.json as { nodes: { name: string }[] }).nodes[0].name).toBe('x');
    expect(parts.rest).toHaveLength(1);
    expect([...parts.rest[0].data.slice(0, 5)]).toEqual([1, 2, 3, 4, 5]);
    expect(parts.rest[0].data.length).toBe(8);
    expect(gltfJsonFromGlb(glb)).toEqual({ asset: { version: '2.0' }, nodes: [{ name: 'x' }] });
  });

  it('renames Meshy joints to mixamorig and leaves the rest', () => {
    const glb = makeGlb(meshyRig, new Uint8Array([9, 9, 9, 9]));
    expect(looksLikeMeshyRig(glbNodeNames(glb))).toBe(true);
    const { glb: out, renamed } = renameGlbNodes(glb, meshyToMixamo);
    expect(renamed).toBe(Object.keys(MESHY_TO_MIXAMO).length - 2 /* toe bases, hands etc. absent */ - 8);
    const names = glbNodeNames(out);
    expect(names).toContain('mixamorig:Hips');
    expect(names).toContain('mixamorig:Spine');   // was Spine02
    expect(names).toContain('mixamorig:Spine2');  // was Spine
    expect(names).toContain('mixamorig:HeadTop_End');
    expect(names).toContain('headfront');
    expect(names).toContain('Armature');
    expect(looksLikeMeshyRig(names)).toBe(false);
    // The skin manifest reads it as a walker now.
    const armature = armatureFromGltf(gltfJsonFromGlb(out));
    expect(rigKindFromArmature(armature)).toBe('mixamorig');
    // Animations still bind by node index, untouched.
    const json = gltfJsonFromGlb(out) as typeof meshyRig;
    expect(json.animations[0].channels[0].target.node).toBe(1);
  });

  it('returns the same buffer when nothing renames', () => {
    const glb = makeGlb({ asset: { version: '2.0' }, nodes: [{ name: 'mixamorig:Hips' }] });
    const r = renameGlbNodes(glb, meshyToMixamo);
    expect(r.renamed).toBe(0);
    expect(r.glb).toBe(glb);
  });
});
