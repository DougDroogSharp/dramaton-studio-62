// ======================================================================
// GEORGELAND FILE FORMAT — georgeland/1  (the ONE contract, two consumers)
// Filed 2026-09-02 12:30 (-07:00) by EDITOR (Georgeland Editor lane).
//
// The Georgeland Editor WRITES this shape; the George World map loader READS
// it. This module is the single source of truth for the shape: the editor
// imports it to build + validate documents, and the game's ?georgeland= hook
// imports it to validate + snap what it loads. Change the shape HERE, once.
//
// Proposed against GEORGELAND_EDITOR_DESIGN.md §2 (Ludo, 2026-09-02) and the
// map-module contract in MAILBOX (HvM Graphics 2026-08-31 22:54: a map exposes
// terrainH(x,z) + terrainNormal(x,z)). HvM Graphics' fuller loader contract
// had not been posted when this was written; the mailbox note that accompanies
// this file proposes it for reconciliation.
//
// SHAPE (JSON):
// {
//   "format": "georgeland/1",
//   "id": "aipotu-berry-tutorial",          // file name stem; [a-z0-9-_]
//   "displayName": "Aipotu — berry tutorial",
//   "paletteAccents": { "sky": "#a5ddf5", "water": "#3ec6e0" },
//   "terrain": {
//     "module": "aipotu",                    // a map MODULE id: aipotu (= the game's
//                                            //   island, module #0), georgeland2, ...
//                                            //   The loader owns the module → terrainH
//                                            //   binding; the file never carries a heightmap.
//     "ws": 1.25,                            // world scale the module was authored at
//     "seaLevel": 0,                         // water plane Y
//     "dryMin": 1.3,                         // terrainH above which ground is dry land
//     "bounds": { "minX":-162, "maxX":162, "minZ":-162, "maxZ":162 },
//     "spawn": { "x":-12.5, "z":67.5 },      // default landing / camera focus
//     "camera": { "pos":[-12.5,40,140], "target":[0,0,0] }
//   },
//   "resources": [                           // EVERY position is (x,z) on the ground;
//     { "id":"r1", "type":"berry",           //   y is a CACHE of terrainH(x,z) at save
//       "x":-14.2, "z":58.1, "y":2.4,        //   time. Readers re-sample through the
//       "amount":2, "richness":0.6,          //   module's terrainH so nothing floats.
//       "cluster":"c1" }
//   ],
//   "clusters": [                            // editing convenience + a name for voice:
//     { "id":"c1", "label":"beach berries",  //   "make the beach berries richer"
//       "type":"berry", "x":-14, "z":60, "r":8 }
//   ],
//   "resourceMode": "replace",               // replace: a type present in the file
//                                            //   REPLACES the game's built-in scatter of
//                                            //   that type; add: file resources are added
//                                            //   on top of the built-ins.
//   "placements": [],                        // Phase 2: named anchors {key,x,z,r,...}
//   "cast": [],                              // Phase 2: starting Vitas
//   "conditions": {},                        // Phase 2: slavery/childLabour/reproduction…
//   "meta": { "author":"Doug", "created":"2026-09-02T19:30:00-07:00",
//             "modified":"…", "editor":"Georgeland Editor v0.1",
//             "tutorialStage": null, "notes":"" }
// }
//
// RESOURCE TYPES (Phase 1). amount = how much is there (bush berries 1-3, fir
// size 1-3, stone/gold units 1-5). richness 0..1 = how fast/well it yields
// (berry: regrow speed — the game's `far` rich bush is richness ≥ 0.5).
// ======================================================================
export const FORMAT = 'georgeland/1';

export const RESOURCE_TYPES = {
  berry: { label:'Berries',     emoji:'🫐', color:0xd8433a, amountLabel:'berries on the bush',
           amountMin:1, amountMax:3, amountDefault:2, aliases:['berry','berries','food','bush','bushes','patch','patches'] },
  fir:   { label:'Fir timber',  emoji:'🌲', color:0x2f5d3a, amountLabel:'fir size',
           amountMin:1, amountMax:3, amountDefault:2, aliases:['fir','firs','pine','pines','timber','conifer','conifers','tree','trees','wood','forest'] },
  palm:  { label:'Palm',        emoji:'🌴', color:0x3f9e4d, amountLabel:'palm height',
           amountMin:1, amountMax:3, amountDefault:2, aliases:['palm','palms','grove','groves','coconut'] },
  stone: { label:'Stone / ore', emoji:'🪨', color:0x8e8577, amountLabel:'stone units',
           amountMin:1, amountMax:5, amountDefault:2, aliases:['stone','stones','rock','rocks','ore','quarry','iron','boulder','boulders'] },
  gold:  { label:'Gold',        emoji:'💰', color:0xf3c53d, amountLabel:'gold units',
           amountMin:1, amountMax:5, amountDefault:2, aliases:['gold','nugget','nuggets','vein','treasure'] },
};
export const TYPE_ORDER = ['berry', 'fir', 'palm', 'stone', 'gold'];

export function typeFromWord(w){
  w = (w || '').toLowerCase().replace(/[^a-z]/g, '');
  for(const k of TYPE_ORDER) if(k === w || RESOURCE_TYPES[k].aliases.includes(w)) return k;
  return null;
}

export function nowStamp(){
  // ISO with the local offset (a real clock, never guessed)
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), s = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${s}${p(Math.floor(Math.abs(off)/60))}:${p(Math.abs(off)%60)}`;
}

export function safeId(s){
  return String(s || 'georgeland').toLowerCase().trim()
    .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'georgeland';
}

// a fresh document on a terrain descriptor ({ id, ws, seaLevel, dryMin, bounds, spawn, camera, palette })
export function newGeorgeland(terrain, opts = {}){
  const id = safeId(opts.id || `${terrain.id}-new`);
  return {
    format: FORMAT,
    id,
    displayName: opts.displayName || id,
    paletteAccents: Object.assign({ sky:'#a5ddf5', water:'#3ec6e0' }, terrain.palette || {}),
    terrain: {
      module: terrain.id, ws: terrain.ws, seaLevel: terrain.seaLevel, dryMin: terrain.dryMin,
      bounds: Object.assign({}, terrain.bounds),
      spawn: Object.assign({}, terrain.spawn),
      camera: { pos: terrain.camera.pos.slice(), target: terrain.camera.target.slice() },
    },
    resources: [], clusters: [], resourceMode: 'replace',
    placements: [], cast: [], conditions: {},
    meta: { author: opts.author || 'Doug', created: nowStamp(), modified: nowStamp(),
            editor: opts.editor || 'Georgeland Editor', tutorialStage: null, notes: '' },
  };
}

export function nextId(doc, prefix){
  let n = 0;
  const list = prefix === 'c' ? doc.clusters : doc.resources;
  for(const r of list){ const m = /^[a-z]+(\d+)$/.exec(r.id || ''); if(m) n = Math.max(n, +m[1]); }
  return prefix + (n + 1);
}

// re-sample every resource's cached y through the terrain sampler
export function snapResources(doc, terrainH){
  for(const r of doc.resources) r.y = +terrainH(r.x, r.z).toFixed(3);
  return doc;
}

export function clampAmount(type, a){
  const T = RESOURCE_TYPES[type] || RESOURCE_TYPES.berry;
  return Math.max(T.amountMin, Math.min(T.amountMax, Math.round(a)));
}

// Validation — errors block a save/load, warnings are advice.
export function validateGeorgeland(doc, terrainH){
  const errors = [], warnings = [];
  const num = v => typeof v === 'number' && isFinite(v);
  if(!doc || typeof doc !== 'object'){ return { ok:false, errors:['not an object'], warnings }; }
  if(doc.format !== FORMAT) errors.push(`format must be "${FORMAT}" (got ${JSON.stringify(doc.format)})`);
  if(typeof doc.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(doc.id)) errors.push('id must be a lowercase slug [a-z0-9-]');
  if(typeof doc.displayName !== 'string' || !doc.displayName.trim()) errors.push('displayName required');
  const t = doc.terrain;
  if(!t || typeof t !== 'object') errors.push('terrain block required');
  else {
    if(typeof t.module !== 'string' || !t.module) errors.push('terrain.module (map module id) required');
    if(!num(t.ws) || t.ws <= 0) errors.push('terrain.ws must be a positive number');
    if(!num(t.seaLevel)) errors.push('terrain.seaLevel must be a number');
    if(!num(t.dryMin)) warnings.push('terrain.dryMin missing (defaulting to seaLevel + 1.3)');
    const b = t.bounds;
    if(!b || !num(b.minX) || !num(b.maxX) || !num(b.minZ) || !num(b.maxZ) || b.minX >= b.maxX || b.minZ >= b.maxZ)
      errors.push('terrain.bounds {minX,maxX,minZ,maxZ} required');
    if(!t.spawn || !num(t.spawn.x) || !num(t.spawn.z)) errors.push('terrain.spawn {x,z} required');
    if(!t.camera || !Array.isArray(t.camera.pos) || t.camera.pos.length !== 3 || !Array.isArray(t.camera.target) || t.camera.target.length !== 3)
      warnings.push('terrain.camera {pos[3],target[3]} missing');
  }
  if(!Array.isArray(doc.resources)) errors.push('resources[] required');
  else {
    const ids = new Set();
    const dry = t && num(t.dryMin) ? t.dryMin : ((t && num(t.seaLevel) ? t.seaLevel : 0) + 1.3);
    doc.resources.forEach((r, i) => {
      const at = `resources[${i}]`;
      if(!r || typeof r !== 'object'){ errors.push(`${at} not an object`); return; }
      if(typeof r.id !== 'string' || !r.id) errors.push(`${at}.id required`);
      else if(ids.has(r.id)) errors.push(`${at}.id duplicate "${r.id}"`); else ids.add(r.id);
      if(!RESOURCE_TYPES[r.type]) errors.push(`${at}.type "${r.type}" unknown (${TYPE_ORDER.join('|')})`);
      if(!num(r.x) || !num(r.z)) errors.push(`${at} needs numeric x,z`);
      else if(t && t.bounds && num(t.bounds.minX) && (r.x < t.bounds.minX || r.x > t.bounds.maxX || r.z < t.bounds.minZ || r.z > t.bounds.maxZ))
        warnings.push(`${at} (${r.id}) is outside terrain.bounds`);
      if(!num(r.y)) warnings.push(`${at} (${r.id}) has no cached y (loader re-samples anyway)`);
      if(!num(r.amount) || r.amount < 1) errors.push(`${at}.amount must be ≥ 1`);
      if(!num(r.richness) || r.richness < 0 || r.richness > 1) errors.push(`${at}.richness must be 0..1`);
      if(r.cluster != null && !(doc.clusters || []).some(c => c.id === r.cluster)) warnings.push(`${at} (${r.id}) names cluster "${r.cluster}" which is not in clusters[]`);
      if(terrainH && num(r.x) && num(r.z) && terrainH(r.x, r.z) < dry) warnings.push(`${r.id} (${r.type}) stands in the surf (terrainH < dryMin)`);
    });
  }
  if(doc.clusters != null && !Array.isArray(doc.clusters)) errors.push('clusters must be an array');
  if(doc.resourceMode != null && !['replace', 'add'].includes(doc.resourceMode)) errors.push('resourceMode must be replace|add');
  for(const k of ['placements', 'cast']) if(doc[k] != null && !Array.isArray(doc[k])) errors.push(`${k} must be an array`);
  if(doc.conditions != null && typeof doc.conditions !== 'object') errors.push('conditions must be an object');
  if(!doc.meta || typeof doc.meta !== 'object') warnings.push('meta block missing');
  return { ok: errors.length === 0, errors, warnings };
}

export function summarize(doc){
  const counts = {};
  for(const k of TYPE_ORDER) counts[k] = 0;
  for(const r of doc.resources || []) counts[r.type] = (counts[r.type] || 0) + 1;
  return counts;
}
