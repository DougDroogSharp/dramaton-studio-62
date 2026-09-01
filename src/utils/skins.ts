// Skin import: enumerate the animation clips in a GLB / glTF (/ VRM) file.
//
// The editor stores only the MANIFEST — every animation name, including
// non-standard ones — so the clips become valid [POSE ... pose=X] arguments
// for whichever actor wears the skin. No three.js needed: animation names
// live in the glTF JSON, and a GLB is just a binary container around it.

import { Skin } from '../types';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

// Pull animation names out of parsed glTF JSON. Unnamed clips get stable
// fallback names so they are still addressable from Dramscript.
export const animationsFromGltf = (gltf: unknown): string[] => {
  const anims = (gltf as { animations?: { name?: string }[] })?.animations;
  if (!Array.isArray(anims)) return [];
  return anims.map((a, i) => (a?.name?.trim() ? a.name.trim() : `animation_${i}`));
};

// Parse the JSON chunk out of a GLB (also VRM, which is GLB) and list its
// animations. Throws with a readable message on a malformed file.
export const animationsFromGlb = (buffer: ArrayBuffer): string[] => {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('Not a GLB file (bad magic)');
  }
  let offset = 12; // past header: magic, version, length
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    if (chunkType === CHUNK_JSON) {
      const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
      const json = JSON.parse(new TextDecoder('utf-8').decode(jsonBytes));
      return animationsFromGltf(json);
    }
    offset += 8 + chunkLength;
  }
  throw new Error('GLB has no JSON chunk');
};

// Import from a picked file: .glb/.vrm are binary GLB, .gltf is plain JSON.
export const skinFromFile = (
  fileName: string,
  data: ArrayBuffer,
): Skin => {
  const lower = fileName.toLowerCase();
  let animations: string[];
  if (lower.endsWith('.gltf')) {
    animations = animationsFromGltf(JSON.parse(new TextDecoder('utf-8').decode(data)));
  } else {
    animations = animationsFromGlb(data);
  }
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return {
    id: `skin_${Date.now()}`,
    name: baseName,
    fileName,
    animations,
    status: 'new',
  };
};

// Lockdown check: with a non-empty allowlist, only listed skin types pass.
// Untyped skins are blocked under lockdown (lockdown means opt-in).
export const isSkinAllowed = (skin: Skin, allowedSkinTypes?: string[]): boolean => {
  if (!allowedSkinTypes || allowedSkinTypes.length === 0) return true;
  return !!skin.skinType && allowedSkinTypes.includes(skin.skinType);
};

// The pose vocabulary a given actor gets from its skin.
export const skinAnimationsForActor = (
  actor: { skinId?: string } | undefined,
  skins: Pick<Skin, 'id' | 'animations'>[] | undefined,
): string[] => {
  if (!actor?.skinId || !skins) return [];
  return skins.find(s => s.id === actor.skinId)?.animations ?? [];
};
