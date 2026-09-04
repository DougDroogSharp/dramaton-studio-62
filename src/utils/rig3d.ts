// 3-D body helpers for the actor editor: load a store model, size it to the
// stage's standard height with its feet on the ground, classify its rig,
// and play library clips on it.
//
// PORTED, not imported, from the asset stage (docs/prototypes/aipotu/
// terrainwalk_study.html v7 / skin_test_study.html v5, HvM 3D session,
// 2026-09-02): those files change hourly and belong to another lane, so the
// editor carries its own copy of the four rules that matter and accepts the
// drift. Keep the rules in step when the stage changes them:
//   1. TARGET_H = 1.55 — every character is auto-scaled to this height.
//   2. measure the RENDER (SkinnedMesh.computeBoundingBox per mesh), never
//      Box3.setFromObject, which reads bind-pose bounds and lies by ~3x for
//      GLB rigs hanging under an Armature node scaled 0.01.
//   3. bone names normalise "mixamorig:Hips" -> "mixamorigHips" (widened to
//      "mixamorig1Hips" too, the Mixamo re-rig form the stage note flagged).
//   4. clips play quaternions only: Meshy's auto-rig emits .position and
//      .scale tracks that resize the skeleton mid-clip.
//
// Filed 2026-09-02 22:07 -07:00 by EDITOR (actor-3d lane).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { RigKind } from '@/types';
import { normalizeBoneName, rigKindFromNames } from './rigKind';

export { LEG_BONES, normalizeBoneName, rigKindFromArmature, rigLabel } from './rigKind';

export const TARGET_H = 1.55;

export interface LoadedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export const normalizeBones = (obj: THREE.Object3D): THREE.Object3D => {
  obj.traverse(o => { o.name = normalizeBoneName(o.name); });
  return obj;
};

// Track names carry the bone name ("mixamorig:Hips.quaternion"): normalise
// them the same way so a clip file binds to a normalised rig.
export const normalizeClipNames = (clip: THREE.AnimationClip): THREE.AnimationClip => {
  for (const tr of clip.tracks) tr.name = normalizeBoneName(tr.name);
  return clip;
};

export const quatsOnly = (clip: THREE.AnimationClip): THREE.AnimationClip =>
  new THREE.AnimationClip(
    clip.name,
    clip.duration,
    clip.tracks.filter(tr => !tr.name.endsWith('.position') && !tr.name.endsWith('.scale')),
  );

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// .glb/.gltf/.vrm and .fbx both come back as {scene, animations}.
export const loadModel = (url: string): Promise<LoadedModel> =>
  new Promise((resolve, reject) => {
    if (/\.fbx(\?|$)/i.test(url)) {
      fbxLoader.load(
        url,
        obj => resolve({ scene: normalizeBones(obj), animations: (obj.animations ?? []).map(normalizeClipNames) }),
        undefined,
        reject,
      );
    } else {
      gltfLoader.load(
        url,
        g => resolve({ scene: normalizeBones(g.scene), animations: g.animations.map(normalizeClipNames) }),
        undefined,
        reject,
      );
    }
  });

// A clip file (*_clip.glb / *_armature.glb) is bones only; we want just its
// animations, quaternions only, ready to bind by bone name.
export const loadClips = async (url: string): Promise<THREE.AnimationClip[]> => {
  const { animations } = await loadModel(url);
  return animations.map(c => quatsOnly(c));
};

// Rule 2: measure what is drawn.
export const measuredHeight = (node: THREE.Object3D): { h: number; minY: number } => {
  node.updateMatrixWorld(true);
  let box: THREE.Box3 | null = null;
  node.traverse(o => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    let b: THREE.Box3;
    if (mesh.isSkinnedMesh && typeof mesh.computeBoundingBox === 'function') {
      mesh.computeBoundingBox();
      b = (mesh.boundingBox as THREE.Box3).clone().applyMatrix4(mesh.matrixWorld);
    } else {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      b = (mesh.geometry.boundingBox as THREE.Box3).clone().applyMatrix4(mesh.matrixWorld);
    }
    box = box ? box.union(b) : b;
  });
  const bb = box as THREE.Box3 | null;
  return bb ? { h: bb.max.y - bb.min.y, minY: bb.min.y } : { h: 0, minY: 0 };
};

// Rule 1: scale to TARGET_H, then re-measure and plant the feet on y = 0.
// Returns the height the model rendered at BEFORE scaling (heightM in the
// skin manifest) so the editor can say "came in at 4.3, scaled to 1.55".
export const groundAndScale = (node: THREE.Object3D, targetH = TARGET_H): number => {
  const m0 = measuredHeight(node);
  if (m0.h > 0) node.scale.setScalar(targetH / m0.h);
  const m1 = measuredHeight(node);
  node.position.y -= m1.minY;
  node.updateMatrixWorld(true);
  return m0.h;
};

export const firstSkinnedMesh = (obj: THREE.Object3D): THREE.SkinnedMesh | null => {
  let found: THREE.SkinnedMesh | null = null;
  obj.traverse(o => { if (!found && (o as THREE.SkinnedMesh).isSkinnedMesh) found = o as THREE.SkinnedMesh; });
  return found;
};

export const boneNames = (obj: THREE.Object3D): string[] => {
  const names: string[] = [];
  obj.traverse(o => { if ((o as THREE.Bone).isBone) names.push(o.name); });
  return names;
};

export const rigKindFromScene = (obj: THREE.Object3D): RigKind => rigKindFromNames(boneNames(obj));

// Dispose everything a loaded model allocated on the GPU.
export const disposeModel = (obj: THREE.Object3D): void => {
  obj.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.normalMap?.dispose();
      mat.roughnessMap?.dispose();
      mat.metalnessMap?.dispose();
      mat.emissiveMap?.dispose();
      mat.dispose();
    }
  });
};
