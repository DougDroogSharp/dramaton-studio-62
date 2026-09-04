// Rig classification without three.js, so it runs in tests and on the
// manifest alone (src/utils/skins.ts harvests the armature at import).
//
// The seven bones the asset stage's walk needs (terrainwalk_study.html
// adoptGltf's gate). Names are colon-free after normalisation:
// "mixamorig:Hips" and Mixamo's re-rig form "mixamorig1Hips" both become
// "mixamorigHips".
//
// Filed 2026-09-02 22:07 -07:00 by EDITOR (actor-3d lane).

// Relative import on purpose: vite-plugin-models.ts (root tsconfig, no
// "@/" alias) imports this file too.
import type { ArmatureJoint, RigKind } from '../types';

export const LEG_BONES = [
  'mixamorigHips',
  'mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot',
  'mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightFoot',
] as const;

const MIXAMO_PREFIX = /^mixamorig\d*:?/;

export const normalizeBoneName = (name: string): string =>
  MIXAMO_PREFIX.test(name) ? name.replace(MIXAMO_PREFIX, 'mixamorig') : name;

export const rigKindFromNames = (names: Iterable<string>): RigKind => {
  const set = new Set<string>();
  for (const n of names) set.add(normalizeBoneName(n));
  if (set.size === 0) return 'static';
  return LEG_BONES.every(b => set.has(b)) ? 'mixamorig' : 'other';
};

export const rigKindFromArmature = (armature: ArmatureJoint[] | undefined): RigKind =>
  rigKindFromNames((armature ?? []).map(j => j.name));

export const rigLabel = (rig: RigKind | undefined): string =>
  rig === 'mixamorig' ? 'WALKS · Mixamo rig'
  : rig === 'other' ? 'RIGGED · not Mixamo-named'
  : rig === 'static' ? 'STATIC · no rig'
  : 'rig unknown';
