// ======================================================================
// GEORGELAND TERRAIN SOURCES for the editor — filed 2026-09-02 12:34 (-07:00)
// by EDITOR (Georgeland Editor lane).
//
// The editor needs, for a map module id, exactly what the map contract
// promises the game: terrainH(x,z) + terrainNormal(x,z), the water level,
// bounds, a spawn, and the named places a voice can point at ("near the
// beach", "the north ridge"). Two sources today:
//
//   aipotu       — module #0, the game's island. terrainH below is a VERBATIM
//                  copy of georgeworld.html v0.79's terrainH (WS 1.25) so the
//                  editor's ground IS the game's ground. When GW BUILDER lands
//                  the loader, this copy is superseded by the game's own
//                  module #0 export; until then keep it byte-equal.
//   georgeland2  — the big island. Loaded LIVE from georgeland2_study.html in
//                  a hidden iframe (same origin) so its window.GEORGELAND
//                  samplers are the study's own — no copy to drift.
// ======================================================================

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function normalOf(terrainH, e = 1.2){
  return function terrainNormal(x, z, ee){
    const h = ee || e;
    const dx = terrainH(x + h, z) - terrainH(x - h, z);
    const dz = terrainH(x, z + h) - terrainH(x, z - h);
    const nx = -dx, ny = 2 * h, nz = -dz;
    const len = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  };
}

// ---------------------------------------------------------------- AIPOTU
function aipotuTerrain(){
  const WS = 1.25;
  function ridgeMask(x){
    let m = (1 - sstep(55, 78, Math.abs(x))) * (0.78 + 0.22 * Math.sin(x * 0.09 + 1.0));
    m *= (1 - 0.5 * Math.exp(-(((x - 18) / 8) ** 2)));   // low saddle / pass at x≈18
    return m;
  }
  // === VERBATIM from georgeworld.html v0.79 (lines 652-676) ===
  function terrainH(x, z){
    x /= WS; z /= WS;   // the landmass is authored in base coords, scaled up by WS
    const d = Math.hypot(x, z);
    let h = 9 * (1 - sstep(38, 88, d)) - 3.2;
    h += 15 * Math.exp(-(((z + 8) / 10) ** 2)) * ridgeMask(x);
    h += 34 * Math.exp(-(((x - 44) / 16) ** 2 + ((z + 14) / 16) ** 2));
    h -= 14 * Math.exp(-(((x - 44) / 5.5) ** 2 + ((z + 14) / 5.5) ** 2));   // the crater bowl
    h += 10.5 * (1 - sstep(5.5, 17, Math.hypot(x - 26, z - 34)));
    h += 7.0 * (1 - sstep(2.5, 10.5, Math.hypot(x + 24, z - 12)));
    h += 6.0 * (1 - sstep(2.0, 9.0, Math.hypot(x + 15, z - 5)));
    h += 0.6 * Math.sin(x * 0.15) * Math.sin(z * 0.17)
       + 0.4 * Math.sin(x * 0.31 + 2) * Math.sin(z * 0.23 + 1);
    h -= 9 * Math.exp(-(((x - 56) / 14) ** 2 + ((z - 44) / 11) ** 2));   // the surf bay's basin
    return h;
  }
  // === end verbatim ===
  const B = (x, z) => ({ x: x * WS, z: z * WS });
  // the game's PLACES table (gw-dialogue v0.80 placesList) + the sites the sim seats things on
  const places = [
    { key:'beach',    name:'the landing beach', ...B(-10, 54), r: 14, aliases:['beach','landing','shore','south beach','the landing','camp','camps','village'] },
    { key:'ridge',    name:'the ridge',         ...B(0, -8),   r: 30, aliases:['ridge','the ridge line'] },
    { key:'saddle',   name:'the saddle',        ...B(18, -6),  r: 8,  aliases:['saddle','pass','the pass'] },
    { key:'grove',    name:'the far grove',     ...B(-2, -38), r: 12, aliases:['far grove','grove','the grove','north grove'] },
    { key:'volcano',  name:'the volcano',       ...B(44, -14), r: 22, aliases:['volcano','crater','mountain','the peak','peak'] },
    { key:'kingshill',name:"the king's hill",   ...B(26, 34),  r: 12, aliases:['kings hill','king hill','hill','the hill','hilltop','hall','throne'] },
    { key:'surf',     name:'the surf bay',      ...B(40, 38),  r: 12, aliases:['surf bay','surf','bay','the bay'] },
    { key:'twins',    name:'the twin hills',    ...B(-20, 8),  r: 14, aliases:['twin hills','twins','twin hill','the twins','west hills','meadow'] },
    { key:'north',    name:'the north shore',   ...B(-5, -60), r: 16, aliases:['north shore','far shore','northshore'] },
    { key:'quiet',    name:'the quiet slope',   ...B(-33, 30), r: 10, aliases:['quiet slope','graveyard','the graveyard','west slope'] },
    { key:'mine',     name:'the mine',          ...B(41.5, -11.5), r: 8, aliases:['mine','the adit','adit'] },
    { key:'gap',      name:'the gap',           ...B(35, 10),  r: 10, aliases:['gap','the gap','between the hill and the volcano'] },
    { key:'east',     name:'the east shore',    ...B(62, 10),  r: 14, aliases:['east shore','east beach','east coast'] },
    { key:'west',     name:'the west shore',    ...B(-62, 0),  r: 14, aliases:['west shore','west beach','west coast'] },
  ];
  const R = 88 * WS;
  return {
    id:'aipotu', label:'Aipotu — the game island (module #0)', ws: WS,
    seaLevel: 0, dryMin: 1.3, radius: R, extent: Math.round(260 * WS), segs: 200,
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    spawn: B(-10, 54),
    camera: { pos: [-10 * WS, 62, 118 * WS], target: [0, 4, 6] },
    palette: { sky:'#a5ddf5', water:'#3ec6e0' },
    terrainH, terrainNormal: normalOf(terrainH, 1.2), places,
    volcano: B(44, -14),
  };
}

// ------------------------------------------------------------ GEORGELAND 2
function georgeland2Terrain(){
  return new Promise((resolve, reject) => {
    const fr = document.createElement('iframe');
    fr.src = 'georgeland2_study.html?lite=1';
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;left:-20px;top:-20px;width:8px;height:8px;opacity:0;pointer-events:none;border:0';
    document.body.appendChild(fr);
    const t0 = performance.now();
    const poll = () => {
      let G = null;
      try { G = fr.contentWindow && fr.contentWindow.GEORGELAND; } catch(e){ /* not yet */ }
      if(G && G.terrainH){
        const WS = G.WS;
        const terrainH = (x, z) => G.terrainH(x, z);
        const places = (G.SPOTS || []).filter(s => s.r > 0 || s.key).map(s => ({
          key: s.key, name: s.label.replace(/^[^\w']+/, '').toLowerCase(), x: s.x, z: s.z,
          r: Math.max(6, (s.r || 6) * WS), aliases: [s.key.toLowerCase()] }));
        for(const p of (G.PLACES || [])) if(!places.some(q => q.key === p.key))
          places.push({ key: p.key, name: p.name.toLowerCase(), x: p.bx * WS, z: p.bz * WS, r: (p.r || 10) * WS * 0.6, aliases: [] });
        const R = 124 * WS;
        resolve({
          id:'georgeland2', label:'Georgeland 2 — the big island (live from the study)', ws: WS,
          seaLevel: G.SEA_LEVEL || 0, dryMin: (G.SEA_LEVEL || 0) + 1.0, radius: R, extent: 620, segs: 260,
          bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
          spawn: { x: 1 * WS, z: 50 * WS },
          camera: { pos: [0, 150, 330], target: [0, 10, 0] },
          palette: { sky:'#a5ddf5', water:'#2a6f9e' },
          terrainH, terrainNormal: (x, z, e) => G.terrainNormal ? G.terrainNormal(x, z, e) : normalOf(terrainH)(x, z, e),
          places, volcano: G.VOLC, _iframe: fr,
        });
        return;
      }
      if(performance.now() - t0 > 60000){ reject(new Error('georgeland2_study.html did not expose window.GEORGELAND in 60 s')); return; }
      setTimeout(poll, 150);
    };
    poll();
  });
}

export const TERRAINS = {
  aipotu:      { label:'Aipotu — the game island', load: async () => aipotuTerrain() },
  georgeland2: { label:'Georgeland 2 — the big island', load: georgeland2Terrain },
};

export async function loadTerrain(id){
  const T = TERRAINS[id] || TERRAINS.aipotu;
  const t = await T.load();
  // compass helpers every terrain gets
  t.placeByWord = (w) => {
    w = (w || '').toLowerCase().replace(/^the\s+/, '').trim();
    if(!w) return null;
    let best = null, bs = 0;
    for(const p of t.places){
      const names = [p.name.replace(/^the\s+/, ''), p.key, ...(p.aliases || [])];
      for(const n of names){
        const nn = n.toLowerCase().replace(/^the\s+/, '');
        let s = 0;
        if(nn === w) s = 3; else if(w.includes(nn) || nn.includes(w)) s = 1 + Math.min(nn.length, w.length) / 40;
        if(s > bs){ bs = s; best = p; }
      }
    }
    return best;
  };
  t.compassPoint = (word, frac = 0.62) => {
    const C = { north:[0,-1], south:[0,1], east:[1,0], west:[-1,0],
      northeast:[0.7,-0.7], northwest:[-0.7,-0.7], southeast:[0.7,0.7], southwest:[-0.7,0.7], center:[0,0], middle:[0,0] };
    const d = C[(word || '').toLowerCase().replace(/[^a-z]/g, '')];
    if(!d) return null;
    return { x: d[0] * t.radius * frac, z: d[1] * t.radius * frac, name: 'the ' + word, r: t.radius * 0.18 };
  };
  t.isDry = (x, z) => t.terrainH(x, z) >= t.dryMin;
  return t;
}
