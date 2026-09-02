// Narraton — the King-of-Chicago scene selector (CGDC 1989), and the ONE
// reader of a scene's selection metadata (Scene.pool / key / keyScale /
// requires / repeatable / weight / act / phase / subplotId). The editor's
// board (NarratonDirector, test mode) and the play-time [NARRATON pool=x]
// command in useScriptRunner both come here. Unified 2026-09-02; the older
// nested `scene.narraton` shape is lifted by migrateGameData and never read.
//
// Each candidate scene carries a KEY: target values for one or more
// world-state variables. The selector ranks candidates by least-squares
// distance from the live world state (sum of squared normalized differences,
// lower is better). Scenes that miss badly on any single variable exclude
// themselves. In-scene variables (Scene.localVars) are invisible here by design.

import { Scene, SceneKey, SceneKeyScale, ScenePhase, NarratonAct } from '../types';
import { evaluateIfCondition, WorldVars } from './expression';

export interface KeyDistance {
  variable: string;
  target: number;
  actual: number;         // coerced numeric world value (0 when missing/non-numeric)
  diff: number;           // actual - target, in the variable's own units
  scale: number;          // the key's range (100 unless Scene.keyScale says otherwise)
  normalizedDiff: number; // diff × 100 / scale — what the score squares
}

export interface SceneMatch {
  scene: Scene;
  score: number;               // sum of squared normalized diffs; lower = better match
  distances: KeyDistance[];
  excluded: boolean;           // true when a big miss rules the scene out
  missingVars: string[];       // key variables absent or non-numeric in world state
}

export interface RankOptions {
  // A scene excludes itself when the normalized |diff| on any one key
  // variable exceeds this (i.e. a miss of more than half the key's scale).
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

// The range a key is matched over. Absent, non-finite or non-positive → 100.
export const keyScaleFor = (keyScale: SceneKeyScale | undefined, variable: string): number => {
  const s = keyScale?.[variable];
  return typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 100;
};

export const hasKey = (scene: Scene): boolean => !!scene.key && Object.keys(scene.key).length > 0;

// A scene the selector can see: keyed, or a member of a pool (a pool-only
// scene has no keys and matches every state perfectly — a gated finale, say).
export const isNarratonCandidate = (scene: Scene): boolean =>
  hasKey(scene) || (typeof scene.pool === 'string' && scene.pool.trim() !== '');

export const scoreKey = (
  key: SceneKey,
  worldState: WorldVars,
  options: RankOptions = {},
  keyScale?: SceneKeyScale,
): Omit<SceneMatch, 'scene'> => {
  const maxMiss = options.maxMissPerVariable ?? DEFAULT_MAX_MISS;
  const distances: KeyDistance[] = [];
  const missingVars: string[] = [];
  let score = 0;
  let excluded = false;

  for (const [variable, rawTarget] of Object.entries(key)) {
    const scale = keyScaleFor(keyScale, variable);
    // A non-numeric target (hand-edited .dram, bridge PUT) would make the
    // whole score NaN and the scene would sort arbitrarily — exclude instead.
    const target = Number(rawTarget);
    if (!Number.isFinite(target)) {
      missingVars.push(variable);
      distances.push({
        variable, target: NaN, actual: toNumeric(worldState[variable]) ?? 0, diff: NaN, scale, normalizedDiff: NaN,
      });
      excluded = true;
      continue;
    }
    const numeric = toNumeric(worldState[variable]);
    if (numeric === null) missingVars.push(variable);
    const actual = numeric ?? 0;
    const diff = actual - target;
    const normalizedDiff = (diff * 100) / scale;
    distances.push({ variable, target, actual, diff, scale, normalizedDiff });
    score += normalizedDiff * normalizedDiff;
    if (Math.abs(normalizedDiff) > maxMiss) excluded = true;
  }

  return { score, distances, excluded, missingVars };
};

// Rank every candidate scene against the live world state. Scenes that are
// neither keyed nor pooled are not candidates and are omitted. Excluded
// scenes are still returned (flagged) so the editor can show WHY they lost;
// sort order is: eligible scenes by ascending score, then excluded ones.
export const rankScenes = (
  scenes: Scene[],
  worldState: WorldVars,
  options: RankOptions = {},
): SceneMatch[] => {
  const matches = scenes
    .filter(isNarratonCandidate)
    .map((s) => ({ scene: s, ...scoreKey(s.key ?? {}, worldState, options, s.keyScale) }));

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
  worldState: WorldVars,
  options: RankOptions = {},
): SceneMatch | null => {
  const ranked = rankScenes(scenes, worldState, options);
  const eligible = ranked.filter((m) => !m.excluded);
  return eligible.length > 0 ? eligible[0] : null;
};

// ── The director (full KoC behavior) ────────────────────────────────────────
//
// Beyond raw key distance, the original Narraton:
//   - consumed episodes from bags (a played scene never repeats, unless
//     the scene is marked repeatable),
//   - honored hard gates (requires),
//   - respected phase order inside a sequence (BEGINNING → MIDDLE → END,
//     with twist-variants allowed within the current phase),
//   - rotated between owners' bags so subplots braid,
//   - kept an introduction from playing at the climax (the act gate),
//   - let an author bias a scene (weight divides its score).

export interface NarratonHistory {
  // Scene ids the SELECTOR has chosen (scenes reached by [SCENE] do not count).
  playedSceneIds: string[];
  lastSubplotId?: string;
}

export const createNarratonHistory = (): NarratonHistory => ({ playedSceneIds: [] });

export type IneligibleReason = 'gated' | 'played' | 'wrong-phase' | 'big-miss' | 'wrong-act';

export interface DirectedMatch extends SceneMatch {
  // score / weight, plus the rotation penalty; what the director actually sorts by
  adjustedScore: number;
  ineligible?: IneligibleReason;
  // Human-readable why, for the log and the board
  detail?: string;
  // true when the rotation penalty applied (same subplot as the last scene)
  sameSubplot?: boolean;
}

export interface DirectOptions extends RankOptions {
  // Added to the score of scenes from the SAME subplot as the last played
  // scene — the rotation that braids subplots. In squared-difference units
  // (200 ≈ a 14-point extra miss); 0 disables it. Additive, not a
  // multiplier, so perfect matches (score 0) still pay it.
  rotationPenalty?: number;
  // Only scenes whose `pool` equals this are candidates ([NARRATON pool=x]).
  // Undefined = the whole board (the editor's view).
  pool?: string;
  // 'stable' (default): the first of equal scores wins, so the editor's
  // board is deterministic. 'random': exact ties break randomly — the
  // engine should surprise its own author at play time.
  tieBreak?: 'stable' | 'random';
}

export const DEFAULT_ROTATION_PENALTY = 200;

const PHASE_RANK: Record<ScenePhase, number> = { BEGINNING: 0, MIDDLE: 1, END: 2 };

// Which act the story is in, from the `act` world variable. Accepts 1/2/3
// or the names (any case). Anything else — including unset — means "no act
// gate", so games that never set it behave as before.
const ACT_BY_NUMBER: Record<number, NarratonAct> = { 1: 'BEGINNING', 2: 'MIDDLE', 3: 'END' };

export function readAct(vars: WorldVars): NarratonAct | null {
  const raw = vars.act;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return ACT_BY_NUMBER[raw] ?? null;
  const s = String(raw).trim().toUpperCase();
  if (s === 'BEGINNING' || s === 'MIDDLE' || s === 'END') return s;
  const n = Number(s);
  return Number.isFinite(n) ? (ACT_BY_NUMBER[n] ?? null) : null;
}

const weightOf = (scene: Scene): number =>
  typeof scene.weight === 'number' && Number.isFinite(scene.weight) && scene.weight > 0 ? scene.weight : 1;

// Per-subplot progress: the highest phase already played.
const subplotProgress = (
  scenes: Scene[],
  playedSceneIds: string[],
): Map<string, number> => {
  const progress = new Map<string, number>();
  const played = new Set(playedSceneIds);
  for (const s of scenes) {
    if (!s.subplotId || !s.phase || !played.has(s.id)) continue;
    const rank = PHASE_RANK[s.phase];
    if (rank > (progress.get(s.subplotId) ?? -1)) progress.set(s.subplotId, rank);
  }
  return progress;
};

// A phased subplot scene is eligible in its subplot's CURRENT phase (another
// twist-variant of what's been reached) or the NEXT one. Unphased scenes and
// scenes outside subplots are always phase-eligible.
const phaseEligible = (scene: Scene, progress: Map<string, number>): boolean => {
  if (!scene.subplotId || !scene.phase) return true;
  const reached = progress.get(scene.subplotId) ?? -1;
  return PHASE_RANK[scene.phase] <= reached + 1;
};

// Rank every candidate scene the way the director sees it. Ineligible scenes
// are kept (flagged with WHY) so the editor can show the whole board; sort
// order is eligible-by-adjusted-score, then the ineligible tail.
export const narratonRank = (
  scenes: Scene[],
  worldState: WorldVars,
  history: NarratonHistory = { playedSceneIds: [] },
  options: DirectOptions = {},
): DirectedMatch[] => {
  const rotationPenalty = options.rotationPenalty ?? DEFAULT_ROTATION_PENALTY;
  const board = options.pool === undefined ? scenes : scenes.filter((s) => s.pool === options.pool);
  const played = new Set(history.playedSceneIds);
  // Subplot progress counts every scene, whatever pool it sits in.
  const progress = subplotProgress(scenes, history.playedSceneIds);

  const matches = rankScenes(board, worldState, options).map<DirectedMatch>((m) => {
    const s = m.scene;
    const sameSubplot = !!history.lastSubplotId && s.subplotId === history.lastSubplotId;
    const adjustedScore = m.score / weightOf(s) + (sameSubplot ? rotationPenalty : 0);
    let ineligible: IneligibleReason | undefined;
    let detail: string | undefined;
    const failedGate = (s.requires ?? []).find((req) => !evaluateIfCondition(req, worldState));
    if (failedGate) {
      ineligible = 'gated';
      detail = `requires ${failedGate.variable} ${failedGate.operator} ${JSON.stringify(failedGate.value)}` +
        ` (currently ${JSON.stringify(worldState[failedGate.variable])})`;
    } else if (played.has(s.id) && !s.repeatable) {
      ineligible = 'played';
      detail = 'already played (not repeatable)';
    } else if (!phaseEligible(s, progress)) {
      ineligible = 'wrong-phase';
      detail = `${s.phase} waits for its subplot's earlier phase`;
    } else if (m.excluded) {
      ineligible = 'big-miss';
      const miss = m.distances.find((d) => !Number.isFinite(d.normalizedDiff) || Math.abs(d.normalizedDiff) > (options.maxMissPerVariable ?? DEFAULT_MAX_MISS));
      detail = miss ? `big miss on ${miss.variable} (${miss.actual} vs ${miss.target})` : 'big miss';
    }
    return {
      ...m,
      adjustedScore,
      ...(ineligible ? { ineligible, detail } : {}),
      ...(sameSubplot ? { sameSubplot } : {}),
    };
  });

  // Act gate. The score matches economic state; this matches dramatic
  // position. Applied AFTER eligibility and softly: if nothing in the
  // current act survives, the gate is dropped rather than dead-ending the
  // pool. Untagged scenes always qualify, so existing games are unaffected.
  const currentAct = readAct(worldState);
  if (currentAct) {
    const eligible = matches.filter((m) => !m.ineligible);
    const inAct = eligible.filter((m) => !m.scene.act || m.scene.act === currentAct);
    if (inAct.length > 0) {
      for (const m of eligible) {
        if (inAct.includes(m)) continue;
        m.ineligible = 'wrong-act';
        m.detail = `act ${m.scene.act} (story is in ${currentAct})`;
      }
    }
  }

  return matches.sort((a, b) => {
    if (!a.ineligible !== !b.ineligible) return a.ineligible ? 1 : -1;
    return a.adjustedScore - b.adjustedScore;
  });
};

// The winner among an already-ranked board, or null when it is exhausted.
export const pickFromRanked = (
  ranked: DirectedMatch[],
  tieBreak: DirectOptions['tieBreak'] = 'stable',
): DirectedMatch | null => {
  const eligible = ranked.filter((m) => !m.ineligible);
  if (eligible.length === 0) return null;
  if (tieBreak !== 'random') return eligible[0];
  const best = eligible[0].adjustedScore;
  const tied = eligible.filter((m) => m.adjustedScore === best);
  return tied[Math.floor(Math.random() * tied.length)];
};

// The director's pick, or null when the board is exhausted.
export const narratonDirect = (
  scenes: Scene[],
  worldState: WorldVars,
  history: NarratonHistory = { playedSceneIds: [] },
  options: DirectOptions = {},
): DirectedMatch | null => pickFromRanked(narratonRank(scenes, worldState, history, options), options.tieBreak);

// Verbose story-space log (Doug's '95 debugging wishlist): the candidate
// pool, each scene's gates and per-key deltas, and the winner.
export function logNarratonSelection(
  pool: string,
  ranked: DirectedMatch[],
  winner: DirectedMatch | null,
  worldState: WorldVars,
): void {
  const eligible = ranked.filter((m) => !m.ineligible);
  console.group(`[Narraton] pool "${pool}": ${ranked.length} candidates, ${eligible.length} eligible`);
  const currentAct = readAct(worldState);
  if (currentAct && eligible.length > 0 && !eligible.some((m) => !m.scene.act || m.scene.act === currentAct)) {
    console.warn(`[Narraton] pool "${pool}": no scene fits act ${currentAct}; ignoring the act gate`);
  }
  for (const m of ranked) {
    const name = `${m.scene.name} (${m.scene.id})`;
    if (m.ineligible) {
      console.log(`✗ ${name} — EXCLUDED: ${m.detail ?? m.ineligible}`);
      continue;
    }
    const deltas = m.distances
      .map((d) => `${d.variable}: ${d.actual}→${d.target}` + (d.scale !== 100 ? ` (×100/${d.scale}=${d.normalizedDiff.toFixed(1)})` : ''))
      .join(', ');
    const weight = weightOf(m.scene);
    console.log(
      `${m === winner ? '★' : '·'} ${name} — score ${m.score.toFixed(2)}` +
      (weight !== 1 ? ` / weight ${weight}` : '') +
      (m.sameSubplot ? ' + rotation penalty' : '') +
      (weight !== 1 || m.sameSubplot ? ` = ${m.adjustedScore.toFixed(2)}` : '') +
      (deltas ? ` [${deltas}]` : ' [no keys: perfect match]'),
    );
  }
  if (winner) {
    console.log(`→ WINNER: ${winner.scene.name} (${winner.scene.id})`);
  } else {
    console.warn('→ NO ELIGIBLE SCENE — Narraton yields nothing');
  }
  console.groupEnd();
}
