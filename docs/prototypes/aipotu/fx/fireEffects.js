// ======================================================================
// fireEffects.js — George World FIRE VFX, v0.1
// Filed 2026-09-02 21:05 (-07:00) on branch fire-effects (own worktree).
//
// Doug's brief: "have some fun experimenting with a shader particle for
// all sorts of fires, from embers to Godzilla's greatest belch."
//
// One self-contained ES module (imports only `three` through the game's
// importmap). Every fire is a THREE.Group you position / rotate / scale
// like any object. Inside it: up to five GPU layers, each an instanced
// billboard quad system whose whole life is computed in the VERTEX shader
// from one clock uniform — the CPU never touches a particle. Layers:
//
//   flames  additive, fbm-eroded tongues, white-hot core → orange → red,
//           blue combustion tint at the base while the tongue is young
//   embers  tiny twinkling sparks that pop off the coals and wander
//   smoke   normal-blended puffs, lit orange while young, greying, growing
//   bed     a flat pulsing coal-glow disc under the fire
//   heat    an invisible mask drawn only into the heat render target that
//           the FireSystem's composite pass turns into HEAT SHIMMER
//
// plus one flickering PointLight per fire.
//
// Two emission modes. Loop (campfires): particles cycle for ever, phase-
// spread. Burst (dragon belch): particles are born once, spread over
// `burst(seconds)`, then die; call burst() again for the next belch.
//
// ---- HOW THE STAGE'S EFFECTS PAGE WIRES IT IN -------------------------
//   import { FireSystem, KINDS } from './fx/fireEffects.js';
//   const fx = new FireSystem(scene, renderer);            // once
//   const camp = fx.spawn('campfire', { position: new THREE.Vector3(0,0,0) });
//   const breath = fx.spawn('belch', { position: mouthPos, direction: fwd, scale: 2.5 });
//   breath.burst(1.2);                                     // one belch
//   // per frame (dt clamped to 0.05 inside):
//   fx.update(dt);
//   fx.render(camera);            // instead of renderer.render(scene, camera)
//                                 // → applies heat shimmer; or fx.shimmer=false
//                                 //   and call renderer.render yourself
//   fx.wind.set(1, 0, 0);         // world wind, units/s, bends every fire
//   camp.intensity = 0.3;         // dies down (0 = out), eases over ~1 s
//   fx.remove(camp);              // frees geometry + materials
// Fires can be parented to anything (a dragon's jaw): fx.spawn(kind,
// { parent: jawBone, ... }) — world up and wind are re-derived each frame.
// See fx/README.md for the full API and the preset table.
// ======================================================================
import * as THREE from 'three';

export const VERSION = '0.2';   // 0.2 (2026-09-02 21:28): stopBurst(); fire_fx.js adapter for the Effects page
export const HEAT_LAYER = 7;   // heat masks live on this layer only

// ---------------------------------------------------------------------
// GLSL
// ---------------------------------------------------------------------
const NOISE_GLSL = /* glsl */`
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i = 0; i < 3; i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; }
  return v;
}
`;

// The one vertex shader. Per-instance attributes: spawn point, launch
// velocity, four randoms (phase, cull, seedA, seedB), lifetime, size.
// Motion = launch velocity under exponential drag + buoyant lift along
// world-up (passed in LOCAL space) + wind + a per-particle sinusoid swirl.
const PARTICLE_VERT = /* glsl */`
uniform float uTime, uLoop, uBurstStart, uBurstSpread, uIntensity, uWorldScale;
uniform vec3 uUp, uWind;
uniform float uBuoy, uDrag, uTurb, uSpin, uAspect, uGrow, uTilt;
attribute vec3 aPos; attribute vec3 aVel; attribute vec4 aRand; attribute float aLife; attribute float aSize;
varying vec2 vUv; varying float vT; varying float vSeed; varying float vFade;
void main(){
  float life = aLife;
  float age = (uLoop > 0.5) ? mod(uTime + aRand.x*life, life) : (uTime - uBurstStart - aRand.x*uBurstSpread);
  float t = age / life;
  vUv = uv; vT = t; vSeed = aRand.z*13.7 + aRand.w*7.9;
  if(age < 0.0 || t > 1.0 || aRand.y > uIntensity){
    vFade = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return;   // collapsed = no fragments
  }
  float k = max(uDrag, 1e-3);
  vec3 p = aPos + aVel * (1.0 - exp(-k*age)) / k;
  p += uUp * (0.5*uBuoy*age*age);
  p += uWind * age * t;
  float s1 = aRand.z*6.2832, s2 = aRand.w*6.2832, s3 = (aRand.z + aRand.w)*3.1416;
  float f1 = 1.5 + 2.5*aRand.w, f2 = 1.0 + 2.0*aRand.z, f3 = 2.0 + 1.5*aRand.x;
  p += uTurb * vec3(sin(age*f1 + s1), 0.4*sin(age*f2 + s2), cos(age*f3 + s3)) * min(age, 1.0) * (0.3 + t);
  float size;
  #ifdef SMOKE
    size = aSize * (0.35 + uGrow*t);
    vFade = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.45, 1.0, t));
  #elif defined(EMBER)
    size = aSize * (1.0 - 0.5*t);
    vFade = 1.0 - smoothstep(0.6, 1.0, t);
  #else
    size = aSize * mix(0.55, 1.0, smoothstep(0.0, 0.15, t)) * (1.0 + uGrow*smoothstep(0.0, 0.7, t)) * (1.0 - 0.6*smoothstep(0.55, 1.0, t));
    vFade = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.55, 1.0, t));
  #endif
  size *= (0.55 + 0.45*uIntensity) * uWorldScale;
  float ang = (aRand.z - 0.5)*uTilt + uSpin * age * (aRand.w - 0.5)*2.0;
  vec2 c = (uv - 0.5) * vec2(1.0, uAspect);
  vec2 rc = vec2(c.x*cos(ang) - c.y*sin(ang), c.x*sin(ang) + c.y*cos(ang));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  mv.xy += rc * size;
  gl_Position = projectionMatrix * mv;
}
`;

const FLAME_FRAG = /* glsl */`
uniform float uTime, uBright, uNoiseScale, uBlue;
uniform vec3 uColHot, uColMid, uColCool, uColBase;
varying vec2 vUv; varying float vT; varying float vSeed; varying float vFade;
${NOISE_GLSL}
void main(){
  if(vFade <= 0.0) discard;
  vec2 q = vUv - 0.5;
  float r = length(q)*2.0;
  float n = fbm(vUv*uNoiseScale + vec2(vSeed, -uTime*1.7 + vSeed*0.5));
  float mask = (1.0 - r) - n*(0.45 + 0.75*vT);
  mask = smoothstep(0.0, 0.3, mask);
  if(mask <= 0.003) discard;
  float heat = clamp((1.0 - r)*1.25*(1.0 - vT*0.85) + (n - 0.5)*0.3, 0.0, 1.0);
  vec3 col = mix(uColCool, uColMid, smoothstep(0.0, 0.5, heat));
  col = mix(col, uColHot, smoothstep(0.45, 1.0, heat));
  col = mix(col, uColBase, smoothstep(0.18, 0.0, vT) * (1.0 - heat) * uBlue);
  gl_FragColor = vec4(col * uBright, mask * vFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SMOKE_FRAG = /* glsl */`
uniform float uTime, uOpacity, uNoiseScale;
uniform vec3 uColLit, uColDark;
varying vec2 vUv; varying float vT; varying float vSeed; varying float vFade;
${NOISE_GLSL}
void main(){
  if(vFade <= 0.0) discard;
  vec2 q = vUv - 0.5;
  float r = length(q)*2.0;
  float n = fbm(vUv*uNoiseScale + vec2(vSeed, vSeed*0.7 + uTime*0.15));
  float mask = smoothstep(0.0, 0.5, (1.0 - r) - n*0.55);
  if(mask <= 0.003) discard;
  vec3 col = mix(uColLit, uColDark, smoothstep(0.0, 0.45, vT));
  col *= 0.75 + 0.5*n;
  gl_FragColor = vec4(col, mask * vFade * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const EMBER_FRAG = /* glsl */`
uniform float uTime, uBright;
uniform vec3 uColHot, uColCool;
varying vec2 vUv; varying float vT; varying float vSeed; varying float vFade;
void main(){
  if(vFade <= 0.0) discard;
  vec2 q = vUv - 0.5;
  float r = length(q)*2.0;
  float core = smoothstep(1.0, 0.0, r); core *= core;
  float tw = 0.65 + 0.35*sin(uTime*(18.0 + 20.0*fract(vSeed)) + vSeed*10.0);
  vec3 col = mix(uColHot, uColCool, smoothstep(0.1, 0.9, vT));
  float a = core * vFade * tw;
  if(a <= 0.004) discard;
  gl_FragColor = vec4(col * uBright, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const HEAT_FRAG = /* glsl */`
uniform float uTime, uStrength, uNoiseScale;
varying vec2 vUv; varying float vT; varying float vSeed; varying float vFade;
${NOISE_GLSL}
void main(){
  if(vFade <= 0.0) discard;
  vec2 q = vUv - 0.5;
  float r = length(q)*2.0;
  float n = fbm(vUv*uNoiseScale + vec2(vSeed, -uTime*0.8));
  float mask = smoothstep(0.0, 0.6, (1.0 - r) - n*0.4);
  float v = mask * vFade * uStrength;
  gl_FragColor = vec4(v, v, v, v);
}
`;

const BED_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BED_FRAG = /* glsl */`
uniform float uTime, uBright, uIntensity;
uniform vec3 uColHot, uColCool;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  vec2 q = vUv - 0.5;
  float r = length(q)*2.0;
  float n = fbm(vUv*4.0 + vec2(uTime*0.3, uTime*0.2));
  float n2 = fbm(vUv*9.0 - uTime*0.7);
  float glow = smoothstep(1.0, 0.1, r) * (0.55 + 0.45*n) * (0.8 + 0.4*sin(uTime*3.1 + n2*6.0));
  glow *= 0.25 + 0.75*uIntensity;
  vec3 col = mix(uColCool, uColHot, smoothstep(0.2, 0.9, glow + n2*0.3));
  gl_FragColor = vec4(col * uBright, glow);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Composite: scene colour (linear, HDR) displaced by scrolling noise where
// the heat mask is bright, then tone-mapped once and encoded to the screen.
const COMPOSITE_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const COMPOSITE_FRAG = /* glsl */`
uniform sampler2D tScene, tHeat;
uniform float uTime, uStrength, uAspect;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  float h = texture2D(tHeat, vUv).r;
  vec2 off = vec2(0.0);
  if(h > 0.002){
    vec2 p = vUv * vec2(uAspect, 1.0);
    float n1 = fbm(p*vec2(18.0, 9.0) + vec2(0.0, -uTime*1.6));
    float n2 = fbm(p*vec2(14.0, 11.0) + vec2(7.0, -uTime*1.3));
    off = (vec2(n1, n2) - 0.5) * min(h, 1.0) * uStrength * 0.035;
  }
  gl_FragColor = texture2D(tScene, vUv + off);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------
// Presets. Units: 1 = 1 metre (the Vita is ~1.5 to the crown). Every
// number is at scale 1; fire.scale multiplies the lot. count is per
// layer; speed/spread = launch cone about `dir`; buoy = lift (units/s²,
// negative = gravity); drag = exponential velocity decay (1/s); turb =
// swirl amplitude; grow = how much a puff swells over its life.
// ---------------------------------------------------------------------
const FIRE_COLS  = { hot: 0xfff4c0, mid: 0xff9a1e, cool: 0xc8300a, base: 0x4a78ff };
const GOLD_COLS  = { hot: 0xfff8d8, mid: 0xffb027, cool: 0xd6421c, base: 0x4a78ff };
const ATOM_COLS  = { hot: 0xe8fbff, mid: 0x63c8ff, cool: 0x1d3fd6, base: 0xffffff };
const EMBER_COLS = { hot: 0xffd27a, cool: 0xb0200a };
const SMOKE_COLS = { lit: 0xff7a2a, dark: 0x2a2a30 };

const UP = [0, 1, 0], FWD = [0, 0, 1];

export const PRESETS = {
  embers: {
    label: 'Campfire embers', loop: true,
    flames: { count: 28, spawn: { type: 'disc', r: 0.3, h: 0.02 }, size: [0.08, 0.16], life: [0.35, 0.7],
              dir: UP, speed: [0.15, 0.35], spread: 0.5, buoy: 0.6, drag: 1.0, turb: 0.04, grow: 0,
              bright: 1.6, noise: 2.5, blue: 0.5, aspect: 1.6, tilt: 0.6, spin: 0, cols: FIRE_COLS },
    embers: { count: 90, spawn: { type: 'disc', r: 0.32, h: 0.05 }, size: [0.025, 0.05], life: [1.5, 4],
              dir: UP, speed: [0.25, 0.9], spread: 0.7, buoy: 0.25, drag: 0.9, turb: 0.22, bright: 2.5, cols: EMBER_COLS },
    smoke:  { count: 14, spawn: { type: 'disc', r: 0.25, h: 0.1 }, size: [0.25, 0.45], life: [2, 3.5],
              dir: UP, speed: [0.25, 0.45], spread: 0.4, buoy: 0.3, drag: 1.0, turb: 0.1, grow: 2.0, opacity: 0.18, noise: 2.2, cols: SMOKE_COLS },
    heat:   { count: 10, spawn: { type: 'disc', r: 0.3, h: 0.1 }, size: [0.6, 1.0], life: [1.2, 2],
              dir: UP, speed: [0.5, 0.9], spread: 0.3, buoy: 0.8, drag: 1.0, turb: 0.1, grow: 0.5, strength: 0.35 },
    bed:    { r: 0.45, sx: 1, bright: 1.2, cols: EMBER_COLS },
    light:  { color: 0xff6a1c, intensity: 3, dist: 5, at: [0, 0.15, 0], flicker: 0.5 },
  },
  torch: {
    label: 'Torch', loop: true,
    flames: { count: 36, spawn: { type: 'disc', r: 0.07, h: 0.02 }, size: [0.09, 0.17], life: [0.35, 0.6],
              dir: UP, speed: [0.5, 0.9], spread: 0.3, buoy: 1.4, drag: 1.5, turb: 0.03, grow: 0.15,
              bright: 1.8, noise: 2.2, blue: 0.6, aspect: 1.8, tilt: 0.5, spin: 0, cols: FIRE_COLS },
    embers: { count: 8, spawn: { type: 'disc', r: 0.06, h: 0.02 }, size: [0.015, 0.03], life: [0.8, 1.8],
              dir: UP, speed: [0.4, 1.0], spread: 0.5, buoy: 0.3, drag: 1.2, turb: 0.12, bright: 2.4, cols: EMBER_COLS },
    smoke:  { count: 6, spawn: { type: 'disc', r: 0.05, h: 0.1 }, size: [0.12, 0.2], life: [1.2, 2],
              dir: UP, speed: [0.4, 0.7], spread: 0.3, buoy: 0.4, drag: 1.0, turb: 0.06, grow: 2.0, opacity: 0.15, noise: 2.2, cols: SMOKE_COLS },
    heat:   { count: 4, spawn: { type: 'disc', r: 0.06, h: 0.05 }, size: [0.3, 0.5], life: [0.8, 1.3],
              dir: UP, speed: [0.7, 1.0], spread: 0.3, buoy: 1.0, drag: 1.0, turb: 0.05, grow: 0.5, strength: 0.3 },
    light:  { color: 0xff8a30, intensity: 4, dist: 6, at: [0, 0.15, 0], flicker: 0.45 },
  },
  small: {
    label: 'A small fire', loop: true,
    flames: { count: 60, spawn: { type: 'disc', r: 0.16, h: 0.03 }, size: [0.14, 0.28], life: [0.45, 0.85],
              dir: UP, speed: [0.5, 1.0], spread: 0.35, buoy: 1.2, drag: 1.2, turb: 0.05, grow: 0.2,
              bright: 1.7, noise: 2.2, blue: 0.9, aspect: 1.7, tilt: 0.6, spin: 0, cols: FIRE_COLS },
    embers: { count: 20, spawn: { type: 'disc', r: 0.16, h: 0.04 }, size: [0.02, 0.04], life: [1, 2.5],
              dir: UP, speed: [0.5, 1.4], spread: 0.5, buoy: 0.3, drag: 1.0, turb: 0.15, bright: 2.5, cols: EMBER_COLS },
    smoke:  { count: 10, spawn: { type: 'disc', r: 0.12, h: 0.2 }, size: [0.2, 0.35], life: [1.8, 3],
              dir: UP, speed: [0.5, 0.8], spread: 0.3, buoy: 0.35, drag: 1.0, turb: 0.1, grow: 2.2, opacity: 0.22, noise: 2.2, cols: SMOKE_COLS },
    heat:   { count: 8, spawn: { type: 'disc', r: 0.15, h: 0.1 }, size: [0.5, 0.8], life: [1, 1.6],
              dir: UP, speed: [0.9, 1.3], spread: 0.3, buoy: 1.0, drag: 1.0, turb: 0.08, grow: 0.6, strength: 0.4 },
    bed:    { r: 0.22, sx: 1, bright: 1.3, cols: EMBER_COLS },
    light:  { color: 0xff7a26, intensity: 6, dist: 7, at: [0, 0.3, 0], flicker: 0.4 },
  },
  campfire: {
    label: 'Blazing campfire', loop: true,
    flames: { count: 140, spawn: { type: 'disc', r: 0.35, h: 0.05 }, size: [0.28, 0.5], life: [0.55, 1.0],
              dir: UP, speed: [0.9, 1.7], spread: 0.3, buoy: 1.8, drag: 1.1, turb: 0.07, grow: 0.25,
              bright: 1.8, noise: 2.2, blue: 0.9, aspect: 1.8, tilt: 0.6, spin: 0, cols: FIRE_COLS },
    embers: { count: 70, spawn: { type: 'disc', r: 0.35, h: 0.05 }, size: [0.025, 0.05], life: [1.2, 3],
              dir: UP, speed: [0.9, 2.4], spread: 0.55, buoy: 0.3, drag: 1.0, turb: 0.2, bright: 2.6, cols: EMBER_COLS },
    smoke:  { count: 36, spawn: { type: 'disc', r: 0.25, h: 0.5 }, size: [0.35, 0.6], life: [2.5, 4],
              dir: UP, speed: [0.8, 1.3], spread: 0.3, buoy: 0.4, drag: 1.0, turb: 0.15, grow: 2.6, opacity: 0.28, noise: 2.2, cols: SMOKE_COLS },
    heat:   { count: 16, spawn: { type: 'disc', r: 0.3, h: 0.2 }, size: [0.9, 1.4], life: [1.2, 2],
              dir: UP, speed: [1.4, 2.2], spread: 0.3, buoy: 1.2, drag: 1.0, turb: 0.1, grow: 0.6, strength: 0.5 },
    bed:    { r: 0.5, sx: 1, bright: 1.4, cols: EMBER_COLS },
    light:  { color: 0xff7a26, intensity: 14, dist: 12, at: [0, 0.5, 0], flicker: 0.35 },
  },
  hearth: {
    label: 'Blazing hearth', loop: true,
    flames: { count: 110, spawn: { type: 'rect', w: 1.0, d: 0.35, h: 0.06 }, size: [0.24, 0.42], life: [0.55, 1.0],
              dir: UP, speed: [0.9, 1.7], spread: 0.22, buoy: 1.8, drag: 1.1, turb: 0.06, grow: 0.25,
              bright: 1.5, noise: 2.2, blue: 0.9, aspect: 1.9, tilt: 0.5, spin: 0, cols: FIRE_COLS },
    embers: { count: 30, spawn: { type: 'rect', w: 0.9, d: 0.3, h: 0.05 }, size: [0.02, 0.045], life: [1, 2.5],
              dir: UP, speed: [0.8, 2.0], spread: 0.35, buoy: 0.3, drag: 1.0, turb: 0.12, bright: 2.5, cols: EMBER_COLS },
    smoke:  { count: 12, spawn: { type: 'rect', w: 0.7, d: 0.25, h: 0.6 }, size: [0.3, 0.5], life: [1.5, 2.5],
              dir: UP, speed: [1.0, 1.6], spread: 0.15, buoy: 0.5, drag: 1.0, turb: 0.05, grow: 2.0, opacity: 0.15, noise: 2.2, cols: SMOKE_COLS },
    heat:   { count: 20, spawn: { type: 'rect', w: 0.9, d: 0.3, h: 0.2 }, size: [0.8, 1.3], life: [1.2, 2],
              dir: UP, speed: [1.6, 2.4], spread: 0.15, buoy: 1.2, drag: 1.0, turb: 0.06, grow: 0.5, strength: 0.5 },
    bed:    { r: 0.55, sx: 1.9, bright: 1.5, cols: EMBER_COLS },
    light:  { color: 0xffa040, intensity: 14, dist: 16, at: [0, 0.6, 0], flicker: 0.3 },
  },
  roaring: {
    label: 'Big roaring flames', loop: true,
    flames: { count: 420, spawn: { type: 'disc', r: 1.1, h: 0.15 }, size: [0.7, 1.3], life: [0.8, 1.5],
              dir: UP, speed: [1.8, 3.4], spread: 0.3, buoy: 2.6, drag: 1.0, turb: 0.18, grow: 0.35,
              bright: 1.9, noise: 2.0, blue: 0.5, aspect: 1.9, tilt: 0.6, spin: 0.3, cols: FIRE_COLS },
    embers: { count: 240, spawn: { type: 'disc', r: 1.1, h: 0.2 }, size: [0.03, 0.07], life: [1.5, 4],
              dir: UP, speed: [2, 5], spread: 0.6, buoy: 0.5, drag: 0.9, turb: 0.45, bright: 2.8, cols: EMBER_COLS },
    smoke:  { count: 130, spawn: { type: 'disc', r: 0.9, h: 1.5 }, size: [0.9, 1.8], life: [3, 5.5],
              dir: UP, speed: [1.6, 2.6], spread: 0.3, buoy: 0.6, drag: 1.0, turb: 0.3, grow: 2.4, opacity: 0.35, noise: 2.0, cols: { lit: 0xff7a2a, dark: 0x1c1b20 } },
    heat:   { count: 40, spawn: { type: 'disc', r: 1.0, h: 0.5 }, size: [2, 3.5], life: [1.5, 2.5],
              dir: UP, speed: [2.5, 4], spread: 0.3, buoy: 1.5, drag: 1.0, turb: 0.2, grow: 0.6, strength: 0.7 },
    bed:    { r: 1.4, sx: 1, bright: 1.5, cols: EMBER_COLS },
    light:  { color: 0xff7a26, intensity: 60, dist: 30, at: [0, 1.4, 0], flicker: 0.3 },
  },
  belch: {
    label: 'Dragon belch', loop: false, burst: 1.1,
    flames: { count: 900, spawn: { type: 'sphere', r: 0.2 }, size: [0.35, 0.7], life: [1.0, 1.7],
              dir: FWD, speed: [16, 26], spread: 0.18, buoy: 2.5, drag: 1.3, turb: 0.5, grow: 4.0,
              bright: 2.2, noise: 3.2, blue: 0, aspect: 1.0, tilt: 6.28, spin: 2.0, cols: GOLD_COLS },
    embers: { count: 320, spawn: { type: 'sphere', r: 0.2 }, size: [0.04, 0.09], life: [1, 2.2],
              dir: FWD, speed: [18, 32], spread: 0.25, buoy: -1.0, drag: 0.9, turb: 0.4, bright: 2.8, cols: EMBER_COLS },
    smoke:  { count: 200, spawn: { type: 'sphere', r: 0.25 }, size: [0.6, 1.2], life: [1.8, 3.2],
              dir: FWD, speed: [12, 20], spread: 0.22, buoy: 2.2, drag: 1.4, turb: 0.5, grow: 4.5, opacity: 0.5, noise: 2.0, cols: { lit: 0xff7a2a, dark: 0x17130f } },
    heat:   { count: 60, spawn: { type: 'sphere', r: 0.3 }, size: [1.5, 2.5], life: [1.4, 2.2],
              dir: FWD, speed: [14, 24], spread: 0.2, buoy: 2.0, drag: 1.2, turb: 0.4, grow: 3.0, strength: 1.0 },
    light:  { color: 0xffa040, intensity: 120, dist: 45, at: [0, 0, 5], flicker: 0.4 },
  },
  atomic: {
    label: 'Godzilla — atomic belch', loop: false, burst: 1.6,
    flames: { count: 1300, spawn: { type: 'sphere', r: 0.25 }, size: [0.4, 0.8], life: [1.2, 2.0],
              dir: FWD, speed: [24, 40], spread: 0.12, buoy: 1.5, drag: 1.1, turb: 0.6, grow: 3.5,
              bright: 2.4, noise: 3.2, blue: 0, aspect: 1.0, tilt: 6.28, spin: 2.5, cols: ATOM_COLS },
    embers: { count: 400, spawn: { type: 'sphere', r: 0.25 }, size: [0.05, 0.1], life: [1, 2.4],
              dir: FWD, speed: [26, 46], spread: 0.18, buoy: -1.0, drag: 0.8, turb: 0.5, bright: 3.0, cols: { hot: 0xdff6ff, cool: 0x2a4fe0 } },
    smoke:  { count: 160, spawn: { type: 'sphere', r: 0.3 }, size: [0.7, 1.4], life: [2, 3.5],
              dir: FWD, speed: [16, 26], spread: 0.18, buoy: 1.8, drag: 1.3, turb: 0.6, grow: 4.0, opacity: 0.35, noise: 2.0, cols: { lit: 0x9fdcff, dark: 0x2a3a4a } },
    heat:   { count: 80, spawn: { type: 'sphere', r: 0.35 }, size: [1.8, 3.0], life: [1.6, 2.4],
              dir: FWD, speed: [20, 34], spread: 0.15, buoy: 1.2, drag: 1.0, turb: 0.5, grow: 3.0, strength: 1.0 },
    light:  { color: 0x7fd0ff, intensity: 200, dist: 70, at: [0, 0, 8], flicker: 0.5 },
  },
};
export const KINDS = Object.keys(PRESETS);

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
function makeRand(seed){
  let s = (seed | 0) || 451451;
  return (a = 1, b) => { s = (s*1103515245 + 12345) & 0x7fffffff; const r = s/0x7fffffff; return b === undefined ? r*a : a + r*(b - a); };
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _plane = new THREE.PlaneGeometry(1, 1);

function spawnPoint(sp, rand, out){
  switch(sp.type){
    case 'rect': out.set(rand(-0.5, 0.5)*sp.w, rand(0, sp.h || 0), rand(-0.5, 0.5)*sp.d); break;
    case 'sphere': { const u = rand(-1, 1), th = rand(6.2832), rr = sp.r*Math.cbrt(rand());
      const k = Math.sqrt(1 - u*u); out.set(rr*k*Math.cos(th), rr*k*Math.sin(th), rr*u); break; }
    default: { const th = rand(6.2832), rr = sp.r*Math.sqrt(rand());
      out.set(rr*Math.cos(th), rand(0, sp.h || 0), rr*Math.sin(th)); }
  }
  return out;
}
// random unit vector inside a cone of half-angle `spread` about `dir`
function coneDir(dir, spread, rand, out){
  const th = spread*Math.sqrt(rand()), ph = rand(6.2832);
  out.set(Math.sin(th)*Math.cos(ph), Math.sin(th)*Math.sin(ph), Math.cos(th));
  _q.setFromUnitVectors(_v.set(0, 0, 1), _w.set(dir[0], dir[1], dir[2]).normalize());
  return out.applyQuaternion(_q);
}

function makeLayer(kind, spec, rand, mult){
  const n = Math.max(1, Math.round(spec.count*mult));
  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(_plane.index);
  geo.setAttribute('position', _plane.attributes.position);
  geo.setAttribute('uv', _plane.attributes.uv);
  geo.instanceCount = n;
  const pos = new Float32Array(n*3), vel = new Float32Array(n*3), rnd = new Float32Array(n*4), life = new Float32Array(n), size = new Float32Array(n);
  const p = new THREE.Vector3(), d = new THREE.Vector3();
  for(let i = 0; i < n; i++){
    spawnPoint(spec.spawn, rand, p);
    coneDir(spec.dir, spec.spread, rand, d).multiplyScalar(rand(spec.speed[0], spec.speed[1]));
    pos.set([p.x, p.y, p.z], i*3);
    vel.set([d.x, d.y, d.z], i*3);
    rnd.set([rand(), rand(), rand(), rand()], i*4);
    life[i] = rand(spec.life[0], spec.life[1]);
    size[i] = rand(spec.size[0], spec.size[1]);
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(vel, 3));
  geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  geo.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 1));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));

  const uniforms = {
    uTime: { value: 0 }, uLoop: { value: 1 }, uBurstStart: { value: -1e9 }, uBurstSpread: { value: 1 },
    uIntensity: { value: 1 }, uWorldScale: { value: 1 },
    uUp: { value: new THREE.Vector3(0, 1, 0) }, uWind: { value: new THREE.Vector3() },
    uBuoy: { value: spec.buoy }, uDrag: { value: spec.drag }, uTurb: { value: spec.turb || 0 },
    uSpin: { value: spec.spin || 0 }, uAspect: { value: spec.aspect || 1 }, uGrow: { value: spec.grow || 0 },
    uTilt: { value: spec.tilt === undefined ? 6.28 : spec.tilt },
    uNoiseScale: { value: spec.noise || 2.2 },
  };
  let frag, blending = THREE.AdditiveBlending, defines = {}, toneMapped = true, order = 11;
  if(kind === 'flames'){
    frag = FLAME_FRAG;
    Object.assign(uniforms, { uBright: { value: spec.bright }, uBlue: { value: spec.blue || 0 },
      uColHot: { value: new THREE.Color(spec.cols.hot) }, uColMid: { value: new THREE.Color(spec.cols.mid) },
      uColCool: { value: new THREE.Color(spec.cols.cool) }, uColBase: { value: new THREE.Color(spec.cols.base) } });
  } else if(kind === 'embers'){
    frag = EMBER_FRAG; defines = { EMBER: 1 }; order = 12;
    Object.assign(uniforms, { uBright: { value: spec.bright },
      uColHot: { value: new THREE.Color(spec.cols.hot) }, uColCool: { value: new THREE.Color(spec.cols.cool) } });
  } else if(kind === 'smoke'){
    frag = SMOKE_FRAG; defines = { SMOKE: 1 }; blending = THREE.NormalBlending; order = 13;
    Object.assign(uniforms, { uOpacity: { value: spec.opacity },
      uColLit: { value: new THREE.Color(spec.cols.lit) }, uColDark: { value: new THREE.Color(spec.cols.dark) } });
  } else { // heat
    frag = HEAT_FRAG; toneMapped = false; order = 14;
    Object.assign(uniforms, { uStrength: { value: spec.strength } });
  }
  const mat = new THREE.ShaderMaterial({ defines, uniforms, vertexShader: PARTICLE_VERT, fragmentShader: frag,
    transparent: true, depthWrite: false, depthTest: true, blending, toneMapped, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.name = 'fire:' + kind;
  if(kind === 'heat') mesh.layers.set(HEAT_LAYER);
  return mesh;
}

function makeBed(spec){
  const uniforms = { uTime: { value: 0 }, uBright: { value: spec.bright }, uIntensity: { value: 1 },
    uColHot: { value: new THREE.Color(spec.cols.hot) }, uColCool: { value: new THREE.Color(spec.cols.cool) } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: BED_VERT, fragmentShader: BED_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(_plane, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.y = 0.012;
  mesh.scale.set(spec.r*2*(spec.sx || 1), spec.r*2, 1);
  mesh.renderOrder = 10;
  mesh.name = 'fire:bed';
  return mesh;
}

// ---------------------------------------------------------------------
// Fire — one effect, a Group. Position / rotate / scale / parent it.
// ---------------------------------------------------------------------
export class Fire extends THREE.Group {
  constructor(kind, opts = {}){
    super();
    const preset = PRESETS[kind];
    if(!preset) throw new Error('fireEffects: unknown kind "' + kind + '" (have ' + KINDS.join(', ') + ')');
    this.kind = kind;
    this.name = 'fire:' + kind;
    this.time = 0;
    this.loop = opts.loop === undefined ? !!preset.loop : !!opts.loop;
    this.intensity = opts.intensity === undefined ? 1 : opts.intensity;   // target, 0..1
    this.level = this.intensity;                                           // eased current value
    this.wind = opts.wind ? opts.wind.clone() : null;                      // world units/s; null → system wind
    this.burstLength = preset.burst || 1;
    this.burstStart = -1e9;
    this.maxLife = 0;
    const rand = makeRand(opts.seed);
    const mult = opts.quality === undefined ? 1 : opts.quality;
    this.layers_ = {};
    for(const k of ['flames', 'embers', 'smoke', 'heat']){
      const spec = preset[k];
      if(!spec || (opts.noSmoke && k === 'smoke') || (opts.noHeat && k === 'heat')) continue;
      const m = makeLayer(k, spec, rand, mult);
      this.layers_[k] = m;
      this.add(m);
      this.maxLife = Math.max(this.maxLife, spec.life[1]);
    }
    if(preset.bed && !opts.noBed){ this.layers_.bed = makeBed(preset.bed); this.add(this.layers_.bed); }
    const L = preset.light;
    this.light = new THREE.PointLight(L.color, 0, L.dist, 2);
    this.light.position.fromArray(L.at);
    this.light.castShadow = !!opts.shadows;
    this.lightSpec = L;
    this.add(this.light);
    this.flickerPhase = rand(100);

    if(opts.position) this.position.copy(opts.position);
    if(opts.scale !== undefined) this.scale.setScalar(opts.scale);
    if(opts.direction) this.aim(opts.direction);
    if(opts.parent) opts.parent.add(this);
    this._setLoop();
  }
  _setLoop(){ for(const m of Object.values(this.layers_)) if(m.material.uniforms.uLoop) m.material.uniforms.uLoop.value = this.loop ? 1 : 0; }
  setLoop(on){ this.loop = !!on; this._setLoop(); return this; }
  /** point the fire's local +Z (the belch direction) along a world direction */
  aim(dir){ _v.copy(dir).normalize(); this.getWorldPosition(_w); this.lookAt(_w.add(_v)); return this; }
  /** point the belch at a world point */
  aimAt(point){ this.lookAt(point); return this; }
  /** fire one burst (belch / atomic); seconds = how long the mouth stays open */
  burst(seconds){
    const len = seconds || this.burstLength;
    this.burstStart = this.time;
    this.burstLen = len;
    for(const m of Object.values(this.layers_)){
      const u = m.material.uniforms;
      if(u.uBurstStart){ u.uBurstStart.value = this.time; u.uBurstSpread.value = len; }
    }
    return this;
  }
  /** cut a burst short: everything already in flight dies on schedule, nothing new is born */
  stopBurst(){
    this.burstStart = -1e9;
    for(const m of Object.values(this.layers_)){ const u = m.material.uniforms; if(u.uBurstStart) u.uBurstStart.value = -1e9; }
    return this;
  }
  /** fraction of the burst still alive (0 when quiet); 1 while looping */
  get burstEnvelope(){
    if(this.loop) return 1;
    const a = this.time - this.burstStart;
    if(a < 0) return 0;
    const len = this.burstLen || this.burstLength;
    const attack = Math.min(1, a/0.12);
    const decay = 1 - THREE.MathUtils.smoothstep(a, len + this.maxLife*0.35, len + this.maxLife);
    return attack*decay;
  }
  ignite(){ this.intensity = 1; return this; }
  extinguish(){ this.intensity = 0; return this; }
  /** @param dt seconds (clamped to 0.05) @param ctx { wind: THREE.Vector3 } */
  update(dt, ctx = {}){
    dt = Math.min(dt || 0, 0.05);
    this.time += dt;
    this.level += (this.intensity - this.level)*Math.min(1, dt*3);
    this.getWorldQuaternion(_q);
    this.getWorldScale(_s);
    const inv = _q.invert();
    const up = _v.set(0, 1, 0).applyQuaternion(inv);
    const wind = _w.copy(this.wind || ctx.wind || _zero).applyQuaternion(inv);
    const ws = _s.x;
    for(const m of Object.values(this.layers_)){
      const u = m.material.uniforms;
      u.uTime.value = this.time;
      u.uIntensity.value = this.level;
      if(u.uWorldScale){ u.uWorldScale.value = ws; u.uUp.value.copy(up); u.uWind.value.copy(wind); }
    }
    // light: base × eased intensity × burst envelope × flicker
    const t = this.time + this.flickerPhase, L = this.lightSpec;
    const fl = 1 - L.flicker*(0.5 + 0.5*(Math.sin(t*17.3)*0.5 + Math.sin(t*7.1)*0.3 + Math.sin(t*31.7)*0.2));
    this.light.intensity = L.intensity*this.level*this.burstEnvelope*fl*ws*ws;
    this.light.distance = L.dist*ws;
  }
  get particleCount(){ let n = 0; for(const m of Object.values(this.layers_)) if(m.geometry.instanceCount) n += m.geometry.instanceCount; return n; }
  dispose(){
    for(const m of Object.values(this.layers_)){ if(m.geometry !== _plane) m.geometry.dispose(); m.material.dispose(); }
    this.light.dispose();
    if(this.parent) this.parent.remove(this);
  }
}
const _zero = new THREE.Vector3();

/** standalone convenience: a Fire you add to the scene and update yourself */
export function createFire(kind, opts){ return new Fire(kind, opts); }

// ---------------------------------------------------------------------
// FireSystem — owns the fires, the shared wind, and the heat-shimmer pass.
// ---------------------------------------------------------------------
export class FireSystem {
  constructor(scene, renderer, opts = {}){
    this.scene = scene;
    this.renderer = renderer;
    this.fires = [];
    this.wind = new THREE.Vector3();
    this.shimmer = opts.shimmer === undefined ? true : !!opts.shimmer;
    this.shimmerStrength = opts.shimmerStrength === undefined ? 1 : opts.shimmerStrength;
    this.heatScale = opts.heatScale || 0.5;          // heat RT = this × drawing buffer
    this.quality = opts.quality === undefined ? 1 : opts.quality;
    this.time = 0;
    this._rt = null; this._heat = null; this._size = new THREE.Vector2();
    this._cc = new THREE.Color();
    this._quadMat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, tHeat: { value: null }, uTime: { value: 0 }, uStrength: { value: 1 }, uAspect: { value: 1 } },
      vertexShader: COMPOSITE_VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false });
    this._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._quadMat);
    this._quadScene = new THREE.Scene(); this._quadScene.add(this._quad);
    this._quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  spawn(kind, opts = {}){
    const f = new Fire(kind, Object.assign({ quality: this.quality }, opts));
    if(!opts.parent) this.scene.add(f);
    this.fires.push(f);
    return f;
  }
  remove(fire){
    const i = this.fires.indexOf(fire);
    if(i >= 0) this.fires.splice(i, 1);
    fire.dispose();
  }
  update(dt){
    dt = Math.min(dt || 0, 0.05);
    this.time += dt;
    for(const f of this.fires) f.update(dt, { wind: this.wind });
  }
  get particleCount(){ let n = 0; for(const f of this.fires) n += f.particleCount; return n; }
  _ensureTargets(){
    const r = this.renderer;
    r.getDrawingBufferSize(this._size);
    const w = Math.max(1, Math.floor(this._size.x)), h = Math.max(1, Math.floor(this._size.y));
    if(!this._rt || this._rt.width !== w || this._rt.height !== h){
      if(this._rt){ this._rt.dispose(); this._heat.dispose(); }
      this._rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true,
        samples: r.capabilities.isWebGL2 ? 4 : 0 });
      const hw = Math.max(1, Math.floor(w*this.heatScale)), hh = Math.max(1, Math.floor(h*this.heatScale));
      this._heat = new THREE.WebGLRenderTarget(hw, hh, { depthBuffer: false });
      this._heat.texture.minFilter = THREE.LinearFilter; this._heat.texture.magFilter = THREE.LinearFilter;
      this._quadMat.uniforms.tScene.value = this._rt.texture;
      this._quadMat.uniforms.tHeat.value = this._heat.texture;
      this._quadMat.uniforms.uAspect.value = w/h;
    }
  }
  /** draw the scene; with shimmer on this is scene→RT, heat→RT, composite→screen */
  render(camera){
    const r = this.renderer, scene = this.scene;
    const wantHeat = this.shimmer && this.shimmerStrength > 0 && this.fires.some(f => f.layers_.heat && (f.loop ? f.level > 0.01 : f.burstEnvelope > 0));
    if(!wantHeat){ r.render(scene, camera); return; }
    this._ensureTargets();
    const prevRT = r.getRenderTarget();
    r.setRenderTarget(this._rt);
    r.render(scene, camera);
    // heat masks only
    const bg = scene.background, fog = scene.fog, mask = camera.layers.mask;
    r.getClearColor(this._cc); const ca = r.getClearAlpha();
    scene.background = null; scene.fog = null; camera.layers.set(HEAT_LAYER);
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this._heat);
    r.render(scene, camera);
    camera.layers.mask = mask; scene.background = bg; scene.fog = fog; r.setClearColor(this._cc, ca);
    // composite
    this._quadMat.uniforms.uTime.value = this.time;
    this._quadMat.uniforms.uStrength.value = this.shimmerStrength;
    r.setRenderTarget(prevRT);
    r.render(this._quadScene, this._quadCam);
  }
  dispose(){
    for(const f of this.fires) f.dispose();
    this.fires.length = 0;
    if(this._rt){ this._rt.dispose(); this._heat.dispose(); this._rt = null; }
    this._quadMat.dispose(); this._quad.geometry.dispose();
  }
}
