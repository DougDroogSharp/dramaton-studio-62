// ======================================================================
// fire_fx.js — the Effects-page adapter for George World fire, v0.2
// Filed 2026-09-02 21:28 (-07:00) on branch fire-effects.
//
// This is the file effects_study.html lazily imports. It matches the
// contract HvM published to the mailbox 2026-09-02 21:20:
//
//   createFire(scene, opts) -> { group, setPreset(name), aim(origin, dir), update(dt), dispose() }
//   presets: 'embers' · 'small' · 'campfire' · 'hearth' · 'big' · 'belch'
//
// and the DRAGONFIRE shape from dragon_study.html (aim/breathe/stop in
// WORLD space) so it drops into the dragon study too. The fire itself is
// fx/fireEffects.js (GPU instanced-quad flames, embers, smoke, coal bed,
// flickering light, heat mask). Side-effect free, importable twice.
//
// opts: { scale=1, wind=0.35 (0..2, the bench slider), preset, auto=true,
//         quality=1, shadows=false }
//
// Extras beyond the contract (all optional):
//   setWind(w)             0..2 slider value, or a THREE.Vector3 in world units/s
//   burst(seconds) / breathe(seconds, power) / stop()   the belch (loop off)
//   setLoop(on)            belch as a continuous flamethrower
//   setIntensity(0..1)     dies down / flares up, eased
//   render(renderer, camera)  call INSTEAD of renderer.render to get heat
//                          shimmer (scene → HDR target → composite). Without
//                          it everything still draws, just no shimmer.
//   fire                   the live fx/fireEffects.js Fire (light, level…)
// ======================================================================
import * as THREE from 'three';
import { Fire, FireSystem, PRESETS as FX_PRESETS, VERSION as FX_VERSION } from './fx/fireEffects.js';

export const VERSION = '0.2';
export const PRESETS = ['embers', 'small', 'campfire', 'hearth', 'big', 'belch'];
const MAP = { embers: 'embers', small: 'small', campfire: 'campfire', hearth: 'hearth', big: 'roaring', belch: 'belch',
              torch: 'torch', roaring: 'roaring', atomic: 'atomic' };

const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();

export function createFire(scene, opts = {}){
  const group = new THREE.Group();
  group.name = 'fire_fx';
  if(opts.scale !== undefined) group.scale.setScalar(opts.scale);
  // one FireSystem per createFire: it owns the wind and the optional shimmer pass
  const sys = new FireSystem(scene, null, { shimmer: true, quality: opts.quality === undefined ? 1 : opts.quality });
  let fire = null, preset = null;
  let auto = opts.auto === undefined ? true : !!opts.auto, autoT = 0.3;
  // world-space aim, DRAGONFIRE style; null = sit at the group origin, rise up
  const aimO = new THREE.Vector3(), aimD = new THREE.Vector3(0, 0, 1);
  let aimed = false;

  function setWind(w){
    if(w && w.isVector3) sys.wind.copy(w);
    else { const k = +w || 0; sys.wind.set(k*1.6, 0, k*0.3); }   // slider 0..2 → up to 3.2 units/s
  }
  setWind(opts.wind === undefined ? 0.35 : opts.wind);

  function applyAim(){
    if(!fire || !aimed) return;
    group.updateWorldMatrix(true, false);
    fire.position.copy(group.worldToLocal(_o.copy(aimO)));
    group.getWorldQuaternion(_q);
    _d.copy(aimD).normalize().applyQuaternion(_q.invert());     // world dir → group-local
    fire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _d);
  }
  function setPreset(name){
    const kind = MAP[name];
    if(!kind) throw new Error('fire_fx: unknown preset "' + name + '" (have ' + PRESETS.join(', ') + ')');
    if(fire){ sys.remove(fire); fire = null; }
    preset = name;
    fire = sys.spawn(kind, { parent: group, shadows: !!opts.shadows });
    if(aimed) applyAim();
    else if(kind === 'belch' || kind === 'atomic'){
      // un-aimed belch on the bench: mouth height, blowing along -X across the view
      fire.position.set(0, 1.0, 0);
      fire.aim(new THREE.Vector3(-1, 0.12, 0));
    }
    if(!fire.loop) autoT = 0.3;
    return fire;
  }
  function aim(origin, dir){
    aimO.copy(origin); aimD.copy(dir).normalize(); aimed = true;
    applyAim();
  }
  function burst(seconds){ if(fire && !fire.loop) fire.burst(seconds); }
  function breathe(seconds, power){ if(!fire) return; if(power !== undefined) fire.intensity = Math.max(0, Math.min(1, power)); burst(seconds); }
  function stop(){ if(fire && !fire.loop) fire.stopBurst(); }
  function update(dt){
    dt = Math.min(0.05, dt || 0);
    if(fire && aimed) applyAim();
    if(fire && !fire.loop && auto){ autoT -= dt; if(autoT <= 0){ fire.burst(); autoT = 4 + Math.random()*1.5; } }
    sys.update(dt);
  }
  function render(renderer, camera){ sys.renderer = renderer; sys.render(camera); }
  function dispose(){
    sys.dispose(); fire = null;
    if(group.parent) group.parent.remove(group);
  }

  const api = {
    group, setPreset, aim, update, dispose,
    setWind, burst, breathe, stop, render,
    setLoop(on){ if(fire) fire.setLoop(on); },
    setIntensity(v){ if(fire) fire.intensity = v; },
    set auto(v){ auto = !!v; }, get auto(){ return auto; },
    get fire(){ return fire; }, get preset(){ return preset; }, get light(){ return fire && fire.light; },
    get burning(){ return !!fire && (fire.loop ? fire.level > 0.01 : fire.burstEnvelope > 0); },
    get root(){ return group; },          // DRAGONFIRE called it root
    PRESETS, VERSION, fxVersion: FX_VERSION, labels: Object.fromEntries(PRESETS.map(p => [p, FX_PRESETS[MAP[p]].label])),
  };
  if(opts.preset) setPreset(opts.preset);
  return api;
}
export default createFire;
