// ======================================================================
// GEORGELAND STYLES — the editor's aesthetic-agnostic rendering layer.
// Filed 2026-09-02 13:36 (-07:00) by EDITOR (Georgeland Editor lane).
//
// Doug, 2026-09-02: the flat-shaded / no-texture study contract is no longer
// a mandate. Each Georgeland carries its own aesthetic (doc.style, see
// georgeland_format.js) and the editor must render and place assets of ANY
// style, textured PBR meshes included. So this module gives the editor:
//
//   makeStandIn(preset, type, r, rand)   a placeholder body for a type when the
//                                        style names no mesh for it — one set per
//                                        preset (flat Lambert, or painted-canvas PBR)
//   attachAsset(group, style, type, r)   loads the style's mesh for the type
//                                        (GLB / glTF / FBX, materials untouched),
//                                        fits it to a height, drops it in for the
//                                        stand-in when it arrives; cached per URL
//   buildEnvironment(renderer, sky)      a PMREM environment from a gradient sky so
//                                        metallic / glossy PBR renders instead of
//                                        going black (no addon needed)
//   assetStats()                         bytes fetched per asset URL, for the budget
// ======================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';   // clone() keeps skinned meshes bound to their own skeleton

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- painted canvases (the textured stand-ins)
const texCache = new Map();
function paint(key, w, h, fn){
  if(texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
let pseed = 7;
const prand = () => { pseed = (pseed * 1103515245 + 12345) & 0x7fffffff; return pseed / 0x7fffffff; };
const TEX = {
  bark: () => paint('bark', 128, 256, (g, w, h) => { g.fillStyle = '#7a5836'; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 260; i++){ g.fillStyle = `rgba(${40 + prand() * 60 | 0},${25 + prand() * 40 | 0},${10 + prand() * 25 | 0},${0.35 + prand() * 0.5})`;
      g.fillRect(prand() * w, prand() * h, 2 + prand() * 5, 10 + prand() * 40); } }),
  leaf: () => paint('leaf', 128, 128, (g, w, h) => { g.fillStyle = '#3f7a34'; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 400; i++){ g.fillStyle = `rgba(${60 + prand() * 90 | 0},${120 + prand() * 90 | 0},${40 + prand() * 50 | 0},0.6)`;
      g.beginPath(); g.ellipse(prand() * w, prand() * h, 3 + prand() * 6, 2 + prand() * 3, prand() * 3, 0, 7); g.fill(); } }),
  rock: () => paint('rock', 128, 128, (g, w, h) => { g.fillStyle = '#8d8579'; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 600; i++){ const v = 90 + prand() * 90 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.5)`;
      g.fillRect(prand() * w, prand() * h, 1 + prand() * 4, 1 + prand() * 4); } }),
  berry: () => paint('berry', 64, 64, (g, w, h) => { const r = g.createRadialGradient(22, 22, 4, 32, 32, 34);
    r.addColorStop(0, '#ff8a6a'); r.addColorStop(0.5, '#d83a2a'); r.addColorStop(1, '#7a1a12'); g.fillStyle = r; g.fillRect(0, 0, w, h); }),
  gold: () => paint('gold', 64, 64, (g, w, h) => { g.fillStyle = '#e9b93a'; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 120; i++){ g.fillStyle = `rgba(255,${220 + prand() * 35 | 0},${120 + prand() * 100 | 0},${0.3 + prand() * 0.6})`;
      g.fillRect(prand() * w, prand() * h, 1 + prand() * 5, 1 + prand() * 5); } }),
  sand: () => paint('sand', 128, 128, (g, w, h) => { g.fillStyle = '#e6d3a0'; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 900; i++){ const v = 200 + prand() * 50 | 0; g.fillStyle = `rgba(${v},${v - 20},${v - 60},0.5)`; g.fillRect(prand() * w, prand() * h, 1, 1); } }),
};

// ---------------------------------------------------------------- material sets per preset
const SETS = {};
function set(preset){
  if(SETS[preset]) return SETS[preset];
  let M;
  if(preset === 'standin-textured'){
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
    M = { bush: std({ map: TEX.leaf(), color: 0xb8d8a8 }), bushDk: std({ map: TEX.leaf(), color: 0x86a878 }),
          berry: std({ map: TEX.berry(), roughness: 0.35 }), trunk: std({ map: TEX.bark() }),
          conifer: std({ map: TEX.leaf(), color: 0x78a878 }), frond: std({ map: TEX.leaf(), side: THREE.DoubleSide }),
          rock: std({ map: TEX.rock() }), rockDk: std({ map: TEX.rock(), color: 0x8a8480 }),
          gold: std({ map: TEX.gold(), metalness: 0.85, roughness: 0.3, emissive: 0x3a2a05 }), flat: false };
  } else {
    const lam = (o) => new THREE.MeshLambertMaterial(Object.assign({ flatShading: true }, o));
    M = { bush: lam({ color: 0x5c7a34 }), bushDk: lam({ color: 0x46602a }), berry: lam({ color: 0xe0432f }),
          trunk: lam({ color: 0x8a6239 }), conifer: lam({ color: 0x2f5d3a }), frond: lam({ color: 0x3f9e4d, side: THREE.DoubleSide }),
          rock: lam({ color: 0x8e8577 }), rockDk: lam({ color: 0x5f5850 }), gold: lam({ color: 0xf3c53d, emissive: 0x6d5210 }), flat: true };
  }
  return SETS[preset] = M;
}
export function terrainMaterial(preset){
  if(preset === 'standin-textured') return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

// ---------------------------------------------------------------- the stand-in bodies (Vita = 1.5 units is still the meter-stick)
export function makeStandIn(preset, type, r, rand){
  const M = set(preset === 'meshes' ? 'standin-flat' : preset);
  const g = new THREE.Group();
  const a = Math.max(1, Math.round(r.amount || 2)), rich = clamp(r.richness ?? 0.5, 0, 1);
  const seg = M.flat ? 0 : 1;   // textured bodies get a little more geometry to catch the light
  if(type === 'berry'){
    for(let i = 0; i < 4; i++){
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.42, 0.6), seg), i % 2 ? M.bush : M.bushDk);
      b.position.set(rand(-0.35, 0.35), rand(0.35, 0.6), rand(-0.35, 0.35)); b.castShadow = true; g.add(b);
    }
    for(let i = 0; i < Math.min(3, a); i++){
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.berry);
      const an = i / Math.min(3, a) * Math.PI * 2; b.position.set(Math.cos(an) * 0.45, 0.85 + rand(0, 0.2), Math.sin(an) * 0.45); g.add(b);
    }
    g.scale.setScalar(0.85 + 0.35 * rich);
  } else if(type === 'fir'){
    const s = 0.65 + Math.min(3, a) * 0.3;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 2.2 * s, 5 + seg * 3), M.trunk); t.position.y = 1.1 * s; g.add(t);
    for(let i = 0; i < 3; i++){
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.55 - i * 0.38) * s, 2.1 * s, 7 + seg * 5), M.conifer);
      cone.position.y = (2.1 + i * 1.25) * s; cone.castShadow = i < 2; g.add(cone);
    }
  } else if(type === 'palm'){
    const s = 0.75 + Math.min(3, a) * 0.3, h = 5 * s;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 6 + seg * 4), M.trunk);
    t.position.y = h / 2; t.rotation.z = 0.12; t.castShadow = true; g.add(t);
    const top = new THREE.Vector3(-Math.sin(0.12) * h, Math.cos(0.12) * h, 0);
    for(let i = 0; i < 7; i++){
      const f = new THREE.Mesh(new THREE.BoxGeometry(3.2 * s, 0.08, 0.7), M.frond);
      f.position.copy(top); f.rotation.y = i / 7 * Math.PI * 2; f.rotation.z = -0.55; f.translateX(1.4 * s); f.castShadow = true; g.add(f);
    }
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), M.rockDk); nut.position.copy(top); g.add(nut);
  } else if(type === 'stone'){
    for(let i = 0; i < Math.min(5, a) + 1; i++){
      const rr = rand(0.45, 0.85) * (0.8 + 0.1 * a);
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rr, seg), i % 2 ? M.rock : M.rockDk);
      s.position.set(rand(-0.9, 0.9), rr * 0.55, rand(-0.9, 0.9)); s.rotation.set(rand(3), rand(3), rand(3)); s.castShadow = true; g.add(s);
    }
  } else if(type === 'gold'){
    for(let i = 0; i < 2; i++){
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.6, 0.9), seg), M.rockDk);
      s.position.set(rand(-0.7, 0.7), 0.4, rand(-0.7, 0.7)); s.rotation.set(rand(3), rand(3), rand(3)); s.castShadow = true; g.add(s);
    }
    for(let i = 0; i < Math.min(5, a) + 1; i++){
      const n = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.22, 0.38) * (0.8 + 0.1 * a), seg), M.gold);
      n.position.set(rand(-1, 1), 0.28, rand(-1, 1)); n.rotation.set(rand(3), rand(3), rand(3)); g.add(n);
    }
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, seg), M.gold); beacon.position.y = 2.6 + 0.3 * Math.min(5, a); g.add(beacon);
  }
  return g;
}

// ---------------------------------------------------------------- external mesh assets (any style; materials as authored)
const DEFAULT_HEIGHT = { berry: 1.1, fir: 5.5, palm: 5.5, stone: 1.3, gold: 1.1 };
const templates = new Map();   // url -> Promise<{ obj, box, bytes }>
const stats = new Map();       // url -> { bytes, ok, error }
export function assetStats(){ let bytes = 0, n = 0, failed = 0; for(const s of stats.values()){ bytes += s.bytes || 0; n++; if(!s.ok) failed++; } return { bytes, mb: bytes / 1048576, n, failed, urls: [...stats.entries()] }; }

function loadTemplate(url){
  if(templates.has(url)) return templates.get(url);
  const p = (async () => {
    const st = { bytes: 0, ok: false, error: null }; stats.set(url, st);
    try{
      try{ const h = await fetch(url, { method: 'HEAD', cache: 'no-store' }); st.bytes = +(h.headers.get('content-length') || 0); }catch(e){}
      const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
      let obj;
      if(ext === 'fbx') obj = await new FBXLoader().loadAsync(url);
      else { const g = await new GLTFLoader().loadAsync(url); obj = g.scene || g.scenes[0]; }
      obj.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = false; o.frustumCulled = true; } });
      const box = new THREE.Box3().setFromObject(obj);
      st.ok = true;
      return { obj, box };
    }catch(e){ st.error = e.message || String(e); throw e; }
  })();
  templates.set(url, p); return p;
}
export function preloadAssets(style){
  const out = [];
  for(const [type, a] of Object.entries((style && style.assets) || {})) if(a && a.url) out.push(loadTemplate(a.url).catch(() => null));
  return Promise.all(out);
}
// puts the style's mesh for `type` into `group` (replacing the stand-in children) when it has loaded
export function attachAsset(group, style, type, r, onDone){
  const spec = style && style.assets && style.assets[type];
  if(!spec || !spec.url) return false;
  loadTemplate(spec.url).then(({ obj, box }) => {
    const inst = SkeletonUtils.clone(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const h = Math.max(1e-3, size.y);
    const s = spec.scale != null ? +spec.scale : (spec.height || DEFAULT_HEIGHT[type] || 1.5) * (0.85 + 0.3 * clamp(r.richness ?? 0.5, 0, 1)) / h;
    inst.scale.setScalar(s);
    inst.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s + (+spec.yOffset || 0), -(box.min.z + box.max.z) / 2 * s);
    while(group.children.length) group.remove(group.children[0]);
    group.add(inst); group.userData.asset = spec.url;
    if(onDone) onDone(true);
  }).catch(err => { console.warn(`[styles] ${type}: ${spec.url} failed (${err.message || err}); stand-in kept`); if(onDone) onDone(false, err); });
  return true;
}

// ---------------------------------------------------------------- environment: a PMREM from a painted sky so PBR has something to reflect
let envTex = null, envKey = '';
export function buildEnvironment(renderer, scene, skyHex){
  const key = String(skyHex);
  if(envTex && envKey === key){ scene.environment = envTex; return envTex; }
  const sky = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 24, 16);
  const col = new Float32Array(geo.attributes.position.count * 3);
  const top = new THREE.Color(skyHex).multiplyScalar(0.9), hor = new THREE.Color(0xf0f4f0), gnd = new THREE.Color(0x5a6a4a), c = new THREE.Color();
  for(let i = 0; i < geo.attributes.position.count; i++){
    const y = geo.attributes.position.getY(i) / 50;
    if(y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(gnd, Math.pow(-y, 0.5));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sky.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }));
  sun.position.set(18, 28, 12); sky.add(sun);
  const pm = new THREE.PMREMGenerator(renderer);
  if(envTex) envTex.dispose();
  envTex = pm.fromScene(sky, 0.04).texture; envKey = key; pm.dispose();
  scene.environment = envTex;
  return envTex;
}
