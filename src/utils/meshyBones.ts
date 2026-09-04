// Meshy auto-rig bone names -> Mixamo names, exactly as the Meshy session
// did it by hand for vita_meshy / vita_meshy_2 / 2b / 2c, alien and
// legionary (derived 2026-09-03 00:40 -07:00 by diffing <name>_meshy_raw.glb
// against <name>_meshy.glb in the model store; all six rigs share the same
// 24-joint skeleton). Names the stage's normalizeBones() then strips to
// "mixamorigHips" etc.; the seven leg bones make it a WALKER.
//
// Filed 2026-09-03 00:40 -07:00 by EDITOR (actor-3d lane).

export const MESHY_TO_MIXAMO: Record<string, string> = {
  Hips: 'mixamorig:Hips',
  LeftUpLeg: 'mixamorig:LeftUpLeg',
  LeftLeg: 'mixamorig:LeftLeg',
  LeftFoot: 'mixamorig:LeftFoot',
  LeftToeBase: 'mixamorig:LeftToeBase',
  RightUpLeg: 'mixamorig:RightUpLeg',
  RightLeg: 'mixamorig:RightLeg',
  RightFoot: 'mixamorig:RightFoot',
  RightToeBase: 'mixamorig:RightToeBase',
  // Meshy numbers the spine from the top; Mixamo from the hips.
  Spine02: 'mixamorig:Spine',
  Spine01: 'mixamorig:Spine1',
  Spine: 'mixamorig:Spine2',
  LeftShoulder: 'mixamorig:LeftShoulder',
  LeftArm: 'mixamorig:LeftArm',
  LeftForeArm: 'mixamorig:LeftForeArm',
  LeftHand: 'mixamorig:LeftHand',
  RightShoulder: 'mixamorig:RightShoulder',
  RightArm: 'mixamorig:RightArm',
  RightForeArm: 'mixamorig:RightForeArm',
  RightHand: 'mixamorig:RightHand',
  neck: 'mixamorig:Neck',
  Head: 'mixamorig:Head',
  head_end: 'mixamorig:HeadTop_End',
  // headfront stays headfront (not a Mixamo joint).
};

export const meshyToMixamo = (name: string): string => MESHY_TO_MIXAMO[name] ?? name;

// True when a node-name list looks like Meshy's raw rig (so renaming is due).
export const looksLikeMeshyRig = (names: Iterable<string>): boolean => {
  const set = new Set(names);
  return set.has('Hips') && set.has('Spine02') && set.has('LeftUpLeg') && !set.has('mixamorig:Hips');
};
