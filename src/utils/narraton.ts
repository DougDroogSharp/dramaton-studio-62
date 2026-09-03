// NARRATON — the 1986 King of Chicago storyteller, reborn.
//
// Scenes carry selection metadata (pool, keys, requires, repeatable,
// subplot, weight, act). [NARRATON pool=x] filters the pool by hard gates,
// play history, and subplot rotation, then picks the survivor whose
// keys least-squares match the current world state. Every decision is
// logged to the console — story-space visibility is a feature.

import { Scene, NarratonKey, NarratonAct } from '@/types';
import { WorldVars, evaluateIfCondition } from './expression';

export interface NarratonHistory {
  played: Set<string>; // scene ids already chosen by the selector
}

export const createNarratonHistory = (): NarratonHistory => ({ played: new Set() });

export interface KeyDelta {
  variable: string;
  current: number;
  target: number;
  scale: number;
  normalizedDelta: number;
}

export interface NarratonCandidate {
  scene: Scene;
  eligible: boolean;
  exclusionReasons: string[];
  keyDeltas: KeyDelta[];
  score: number;         // Σ((current − target) / scale)²
  weightedScore: number; // score / weight — lower wins
}

export interface NarratonSelection {
  winner: Scene | null;
  candidates: NarratonCandidate[];
}

const toNumber = (v: string | number | boolean | undefined): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const normalizeKey = (key: number | NarratonKey): { target: number; scale: number } => {
  if (typeof key === 'number') return { target: key, scale: 100 };
  return { target: key.target, scale: key.scale || 100 };
};

// Which act the story is in, from the `act` world variable. Accepts
// 1/2/3 or the names (any case). Anything else — including unset —
// means "no act gate", so games that never set it behave as before.
const ACT_BY_NUMBER: Record<number, NarratonAct> = {
  1: 'BEGINNING',
  2: 'MIDDLE',
  3: 'END',
};

export function readAct(vars: WorldVars): NarratonAct | null {
  const raw = vars.act;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return ACT_BY_NUMBER[raw] ?? null;
  const s = String(raw).trim().toUpperCase();
  if (s === 'BEGINNING' || s === 'MIDDLE' || s === 'END') return s;
  const n = Number(s);
  return Number.isFinite(n) ? (ACT_BY_NUMBER[n] ?? null) : null;
}

export interface SelectOptions {
  // The editor ranks on every render; it does not want the console log.
  quiet?: boolean;
}

// Every pool named by a scene, sorted, for the editor's pool pickers.
export function narratonPools(scenes: Scene[]): string[] {
  const pools = new Set<string>();
  for (const s of scenes) if (s.narraton?.pool) pools.add(s.narraton.pool);
  return [...pools].sort();
}

// Candidates the way the editor shows them: eligible first by weighted
// score, then the excluded tail (kept, with reasons, so the board is legible).
export function sortCandidates(candidates: NarratonCandidate[]): NarratonCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return a.weightedScore - b.weightedScore;
  });
}

export function selectNarratonScene(
  pool: string,
  scenes: Scene[],
  vars: WorldVars,
  history: NarratonHistory,
  options: SelectOptions = {},
): NarratonSelection {
  const poolScenes = scenes.filter(s => s.narraton?.pool === pool);
  const candidates: NarratonCandidate[] = [];

  // Subplot rotation: within a subplot, only the first unplayed scene
  // (in scene-list order) is eligible per selection — one scene per
  // subplot, in order.
  const subplotNext = new Map<string, string>();
  for (const scene of poolScenes) {
    const subplot = scene.narraton?.subplot;
    if (!subplot || subplotNext.has(subplot)) continue;
    const first = poolScenes.find(
      s => s.narraton?.subplot === subplot && !history.played.has(s.id),
    );
    if (first) subplotNext.set(subplot, first.id);
  }

  for (const scene of poolScenes) {
    const meta = scene.narraton!;
    const reasons: string[] = [];

    // Hard gates
    for (const req of meta.requires || []) {
      if (!evaluateIfCondition(req, vars)) {
        reasons.push(`requires ${req.variable} ${req.operator} ${JSON.stringify(req.value)} (currently ${JSON.stringify(vars[req.variable])})`);
      }
    }

    // Already played and not repeatable
    if (history.played.has(scene.id) && !meta.repeatable) {
      reasons.push('already played (not repeatable)');
    }

    // Subplot rotation
    if (meta.subplot) {
      const next = subplotNext.get(meta.subplot);
      if (next === undefined) {
        if (!meta.repeatable) reasons.push(`subplot "${meta.subplot}" exhausted`);
      } else if (next !== scene.id) {
        reasons.push(`subplot "${meta.subplot}" is at scene "${next}"`);
      }
    }

    // Least-squares score over keys, normalized per key
    const keyDeltas: KeyDelta[] = [];
    let score = 0;
    for (const [variable, rawKey] of Object.entries(meta.keys || {})) {
      const { target, scale } = normalizeKey(rawKey);
      const current = toNumber(vars[variable]);
      const normalizedDelta = (current - target) / (scale || 1);
      keyDeltas.push({ variable, current, target, scale, normalizedDelta });
      score += normalizedDelta * normalizedDelta;
    }

    const weight = meta.weight || 1;
    candidates.push({
      scene,
      eligible: reasons.length === 0,
      exclusionReasons: reasons,
      keyDeltas,
      score,
      weightedScore: score / weight,
    });
  }

  // Act gate. The score above matches economic state; this matches
  // dramatic position, so an introduction cannot play at the climax.
  // Applied AFTER eligibility and softly: if nothing in the current
  // act survives, the gate is dropped rather than dead-ending the
  // pool. Untagged scenes always qualify, so existing games are
  // unaffected.
  const currentAct = readAct(vars);
  let eligible = candidates.filter(c => c.eligible);
  if (currentAct) {
    const inAct = eligible.filter(c => {
      const act = c.scene.narraton?.act;
      return !act || act === currentAct;
    });
    if (inAct.length > 0) {
      for (const c of eligible) {
        if (!inAct.includes(c)) {
          c.eligible = false;
          c.exclusionReasons.push(`act ${c.scene.narraton?.act} (story is in ${currentAct})`);
        }
      }
      eligible = inAct;
    } else {
      if (!options.quiet) console.warn(`[Narraton] pool "${pool}": no scene fits act ${currentAct}; ignoring the act gate`);
    }
  }

  // Pick the lowest weighted score; break exact ties randomly (the
  // engine should surprise its own author)
  let winner: Scene | null = null;
  if (eligible.length > 0) {
    const best = Math.min(...eligible.map(c => c.weightedScore));
    const tied = eligible.filter(c => c.weightedScore === best);
    winner = tied[Math.floor(Math.random() * tied.length)].scene;
  }

  if (!options.quiet) logSelection(pool, candidates, eligible.length, winner);
  return { winner, candidates };
}

// Verbose story-space log: the candidate pool, each scene's gates and
// per-key deltas, and the winner.
function logSelection(
  pool: string,
  candidates: NarratonCandidate[],
  eligibleCount: number,
  winner: Scene | null,
) {
  console.group(`[Narraton] pool "${pool}": ${candidates.length} candidates, ${eligibleCount} eligible`);
  for (const c of [...candidates].sort((a, b) => a.weightedScore - b.weightedScore)) {
    const name = `${c.scene.name} (${c.scene.id})`;
    if (!c.eligible) {
      console.log(`✗ ${name} — EXCLUDED: ${c.exclusionReasons.join('; ')}`);
      continue;
    }
    const deltas = c.keyDeltas
      .map(d => `${d.variable}: ${d.current}→${d.target} (Δ/${d.scale}=${d.normalizedDelta.toFixed(3)})`)
      .join(', ');
    const weight = c.scene.narraton?.weight || 1;
    console.log(
      `${c.scene === winner ? '★' : '·'} ${name} — score ${c.score.toFixed(4)}` +
      (weight !== 1 ? ` / weight ${weight} = ${c.weightedScore.toFixed(4)}` : '') +
      (deltas ? ` [${deltas}]` : ' [no keys: perfect match]'),
    );
  }
  if (winner) {
    console.log(`→ WINNER: ${winner.name} (${winner.id})`);
  } else {
    console.warn('→ NO ELIGIBLE SCENE — Narraton yields nothing');
  }
  console.groupEnd();
}
