// Skin import: enumerate the animation clips in a GLB / glTF (/ VRM) file.
//
// The editor stores only the MANIFEST — every animation name, including
// non-standard ones — so the clips become valid [POSE ... pose=X] arguments
// for whichever actor wears the skin. No three.js needed: animation names
// live in the glTF JSON, and a GLB is just a binary container around it.

import { ArmatureJoint, Skin } from '../types';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

// Pull animation names out of parsed glTF JSON. Unnamed clips get stable
// fallback names so they are still addressable from Dramscript.
export const animationsFromGltf = (gltf: unknown): string[] => {
  const anims = (gltf as { animations?: { name?: string }[] })?.animations;
  if (!Array.isArray(anims)) return [];
  return anims.map((a, i) => (a?.name?.trim() ? a.name.trim() : `animation_${i}`));
};

// Harvest the rig from parsed glTF JSON: every joint referenced by a glTF
// skin, flattened with each joint's nearest JOINT ancestor as parent. This is
// what an AI collaborator needs to author clips ("slump the shoulders" needs
// to know the shoulder bones exist and where they hang).
export const armatureFromGltf = (gltf: unknown): ArmatureJoint[] => {
  const g = gltf as {
    nodes?: { name?: string; children?: number[] }[];
    skins?: { joints?: number[] }[];
  };
  if (!Array.isArray(g?.nodes) || !Array.isArray(g?.skins)) return [];

  const jointIndices = new Set<number>();
  for (const s of g.skins) {
    for (const j of s.joints ?? []) jointIndices.add(j);
  }
  if (jointIndices.size === 0) return [];

  // child index -> parent index, from the node hierarchy
  const parentOf = new Map<number, number>();
  g.nodes.forEach((node, i) => {
    for (const c of node.children ?? []) parentOf.set(c, i);
  });

  const jointName = (i: number) => g.nodes![i]?.name?.trim() || `joint_${i}`;
  const nearestJointAncestor = (i: number): number | undefined => {
    // Visited guard: broken exporters do emit cyclic node graphs, and an
    // unguarded walk would hang the tab.
    const visited = new Set<number>([i]);
    let p = parentOf.get(i);
    while (p !== undefined && !visited.has(p)) {
      if (jointIndices.has(p)) return p;
      visited.add(p);
      p = parentOf.get(p);
    }
    return undefined;
  };

  return [...jointIndices].sort((a, b) => a - b).map(i => {
    const parent = nearestJointAncestor(i);
    return {
      name: jointName(i),
      ...(parent !== undefined ? { parent: jointName(parent) } : {}),
    };
  });
};

// Parse the JSON chunk out of a GLB (also VRM, which is GLB) and list its
// animations. Throws with a readable message on a malformed file.
export const gltfJsonFromGlb = (buffer: ArrayBuffer): unknown => {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('Not a GLB file (bad magic)');
  }
  let offset = 12; // past header: magic, version, length
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    if (offset + 8 + chunkLength > buffer.byteLength) {
      throw new Error('GLB is truncated or corrupt (chunk overruns file)');
    }
    if (chunkType === CHUNK_JSON) {
      const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
      return JSON.parse(new TextDecoder('utf-8').decode(jsonBytes));
    }
    offset += 8 + chunkLength;
  }
  throw new Error('GLB has no JSON chunk');
};

export const animationsFromGlb = (buffer: ArrayBuffer): string[] =>
  animationsFromGltf(gltfJsonFromGlb(buffer));

// Import from a picked file: .glb/.vrm are binary GLB, .gltf is plain JSON.
export const skinFromFile = (
  fileName: string,
  data: ArrayBuffer,
): Skin => {
  const lower = fileName.toLowerCase();
  const gltf = lower.endsWith('.gltf')
    ? JSON.parse(new TextDecoder('utf-8').decode(data))
    : gltfJsonFromGlb(data);
  const armature = armatureFromGltf(gltf);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return {
    id: `skin_${Date.now()}`,
    name: baseName,
    fileName,
    animations: animationsFromGltf(gltf),
    ...(armature.length > 0 ? { armature } : {}),
    status: 'new',
  };
};

// A skin's full pose vocabulary: baked clips plus authored ones.
export const allSkinAnimations = (
  skin: Pick<Skin, 'animations' | 'authoredAnimations'>,
): string[] => [
  ...skin.animations,
  ...(skin.authoredAnimations ?? []).map(c => c.name),
];

// Lockdown check: with a non-empty allowlist, only listed skin types pass.
// Untyped skins are blocked under lockdown (lockdown means opt-in).
export const isSkinAllowed = (skin: Skin, allowedSkinTypes?: string[]): boolean => {
  if (!allowedSkinTypes || allowedSkinTypes.length === 0) return true;
  return !!skin.skinType && allowedSkinTypes.includes(skin.skinType);
};

// The pose vocabulary a given actor gets from its skin (authored included).
export const skinAnimationsForActor = (
  actor: { skinId?: string } | undefined,
  skins: Pick<Skin, 'id' | 'animations' | 'authoredAnimations'>[] | undefined,
): string[] => {
  if (!actor?.skinId || !skins) return [];
  const skin = skins.find(s => s.id === actor.skinId);
  return skin ? allSkinAnimations(skin) : [];
};
