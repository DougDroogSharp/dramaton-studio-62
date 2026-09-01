// Narraton scene selector — the King-of-Chicago mechanism (CGDC 1989).
//
// Each candidate scene carries a KEY: target values (0–100) for one or more
// world-state variables. The selector ranks candidates by least-squares
// distance from the live world state (sum of squared differences, lower is
// better). Scenes that miss badly on any single variable exclude themselves.
// In-scene variables (Scene.localVars) are invisible here by design.

import { Scene, SceneKey } from '../types';

export interface KeyDistance {
  variable: string;
  target: number;
  actual: number;      // coerced numeric world value (0 when missing/non-numeric)
  diff: number;        // actual - target
}

export interface SceneMatch {
  scene: Scene;
  score: number;               // sum of squared diffs; lower = better match
  distances: KeyDistance[];
  excluded: boolean;           // true when a big miss rules the scene out
  missingVars: string[];       // key variables absent or non-numeric in world state
}

export interface RankOptions {
  // A scene excludes itself when |diff| on any one key variable exceeds this.
  maxMissPerVariable?: number;
}

export const DEFAULT_MAX_MISS = 50;

// World-state values arrive as string | number | boolean (SettingsEditor
// stores raw strings). Coerce to a number for key matching; booleans map to
// 0/100 so they can participate in 0–100 keys; anything non-numeric is 0.
export const toNumeric = (value: string | number | boolean | undefined): number | null => {
  if (value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 100 : 0;
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) ? n : null;
};

export const scoreKey = (
  key: SceneKey,
  worldState: Record<string, string | number | boolean>,
  options: RankOptions = {},
): Omit<SceneMatch, 'scene'> => {
  const maxMiss = options.maxMissPerVariable ?? DEFAULT_MAX_MISS;
  const distances: KeyDistance[] = [];
  const missingVars: string[] = [];
  let score = 0;
  let excluded = false;

  for (const [variable, target] of Object.entries(key)) {
    const numeric = toNumeric(worldState[variable]);
    if (numeric === null) missingVars.push(variable);
    const actual = numeric ?? 0;
    const diff = actual - target;
    distances.push({ variable, target, actual, diff });
    score += diff * diff;
    if (Math.abs(diff) > maxMiss) excluded = true;
  }

  return { score, distances, excluded, missingVars };
};

// Rank every keyed scene against the live world state. Scenes without a key
// (or with an empty key) are not candidates and are omitted. Excluded scenes
// are still returned (flagged) so the editor can show WHY they lost; sort
// order is: eligible scenes by ascending score, then excluded ones.
export const rankScenes = (
  scenes: Scene[],
  worldState: Record<string, string | number | boolean>,
  options: RankOptions = {},
): SceneMatch[] => {
  const matches = scenes
    .filter((s) => s.key && Object.keys(s.key).length > 0)
    .map((s) => ({ scene: s, ...scoreKey(s.key as SceneKey, worldState, options) }));

  return matches.sort((a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
    return a.score - b.score;
  });
};

// The selector's pick: best non-excluded match, or null when every candidate
// excluded itself (the KoC paper's "4–20 candidates" floor is a design goal,
// not a code guarantee).
export const pickNextScene = (
  scenes: Scene[],
  worldState: Record<string, string | number | boolean>,
  options: RankOptions = {},
): SceneMatch | null => {
  const ranked = rankScenes(scenes, worldState, options);
  const eligible = ranked.filter((m) => !m.excluded);
  return eligible.length > 0 ? eligible[0] : null;
};
