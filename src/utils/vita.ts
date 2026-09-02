// Vita instrumentation → script variables.
//
// Every Vita (actor) exposes its gauges and knobs to coding and scripting:
// the values are materialized into game.info.worldState, so Dramscript
// [SET]/[IF], Narraton scene keys, variable autocomplete, and the test-mode
// panel all see them with no new syntax. Naming (underscores — dots would
// break the \w+ variable grammar):
//   <actorId>_<gauge>          gauge level (the live meter)
//   <actorId>_<gauge>_redline  danger threshold
//   <actorId>_<gauge>_goal     target value
//   <actorId>_<knob>           knob setting

import { Actor, GameData, Gauge, Knob, VitaPreset } from '../types';

// Variable-safe fragment: lowercase word characters only.
export const varName = (...parts: string[]): string =>
  parts
    .map(p => p.trim().toLowerCase().replace(/\W+/g, '_'))
    .filter(Boolean)
    .join('_');

// All variables a Vita exposes, with current values.
export const vitaVariables = (actor: Pick<Actor, 'id' | 'gauges' | 'knobs'>): Record<string, number> => {
  const vars: Record<string, number> = {};
  for (const g of actor.gauges ?? []) {
    if (!g.name.trim()) continue;
    vars[varName(actor.id, g.name)] = g.level;
    vars[varName(actor.id, g.name, 'redline')] = g.redLine;
    vars[varName(actor.id, g.name, 'goal')] = g.goal;
  }
  for (const k of actor.knobs ?? []) {
    if (!k.name.trim()) continue;
    vars[varName(actor.id, k.name)] = k.value;
  }
  return vars;
};

// Write a Vita's variables into world state, removing variables the previous
// version of the actor exposed but the new one no longer does (renames and
// deletions leave no orphans). Pass the actor as it was BEFORE the edit.
export const syncVitaToWorldState = (
  game: GameData,
  updatedActor: Actor,
  previousActor?: Pick<Actor, 'id' | 'gauges' | 'knobs'>,
): GameData => {
  const next = { ...game.info.worldState };
  if (previousActor) {
    for (const stale of Object.keys(vitaVariables(previousActor))) {
      delete next[stale];
    }
  }
  Object.assign(next, vitaVariables(updatedActor));
  return { ...game, info: { ...game.info, worldState: next } };
};

// Apply a preset: replaces the Vita's gauges/knobs with deep copies so later
// tweaks don't mutate the preset.
export const applyVitaPreset = (actor: Actor, preset: VitaPreset): Actor => ({
  ...actor,
  gauges: preset.gauges.map(g => ({ ...g })),
  knobs: preset.knobs.map(k => ({ ...k })),
});

// Capture the Vita's current dial state as a new named preset.
export const presetFromActor = (actor: Actor, name: string): VitaPreset => ({
  id: `preset_${Date.now()}`,
  name,
  gauges: (actor.gauges ?? []).map(g => ({ ...g })),
  knobs: (actor.knobs ?? []).map(k => ({ ...k })),
});

export const defaultGauge = (): Gauge => ({ name: '', level: 50, redLine: 90, goal: 50 });
export const defaultKnob = (): Knob => ({ name: '', value: 50 });
