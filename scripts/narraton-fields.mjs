// Flat Narraton fields for a scene, from the nested `narraton` object the
// builders were first written against. Since 2026-09-02 a Scene carries its
// selection metadata as flat fields (pool, key, keyScale, requires,
// repeatable, weight, act, subplotId); this mirrors `liftLegacyNarraton` in
// src/types.ts (the loader's read-only lift) so every builder emits the one
// shape. Returns an object to spread into a scene literal.
//
//   { ...narratonFields({ pool: 'witness', keys: { wages: { target: 5, scale: 60 } }, repeatable: true }) }
//   → { pool: 'witness', key: { wages: 5 }, keyScale: { wages: 60 }, repeatable: true }

const ACTS = new Set(['BEGINNING', 'MIDDLE', 'END']);

export const narratonFields = (meta) => {
  if (!meta || typeof meta !== 'object') return {};
  const out = {};

  const pool = typeof meta.pool === 'string' ? meta.pool.trim() : '';
  if (pool !== '') out.pool = pool;

  if (meta.keys && typeof meta.keys === 'object') {
    const key = {};
    const keyScale = {};
    for (const [variable, raw] of Object.entries(meta.keys)) {
      const target = typeof raw === 'number' ? raw : Number(raw?.target);
      if (!Number.isFinite(target)) continue;
      key[variable] = target;
      const scale = typeof raw === 'number' ? undefined : raw?.scale;
      if (typeof scale === 'number' && Number.isFinite(scale) && scale > 0 && scale !== 100) {
        keyScale[variable] = scale;
      }
    }
    if (Object.keys(key).length > 0) out.key = key;
    if (Object.keys(keyScale).length > 0) out.keyScale = keyScale;
  }

  if (Array.isArray(meta.requires) && meta.requires.length > 0) out.requires = meta.requires;
  if (typeof meta.repeatable === 'boolean') out.repeatable = meta.repeatable;
  if (typeof meta.weight === 'number' && Number.isFinite(meta.weight) && meta.weight !== 1) out.weight = meta.weight;
  if (ACTS.has(meta.act)) out.act = meta.act;

  const subplot = typeof meta.subplot === 'string' ? meta.subplot.trim() : '';
  if (subplot !== '') out.subplotId = subplot;

  return out;
};
