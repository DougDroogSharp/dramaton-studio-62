# fx/fireEffects.js — George World fire VFX, v0.1

Filed 2026-09-02 21:05 (-07:00) on branch `fire-effects`. Doug's brief: **"have some fun experimenting with a shader particle for all sorts of fires, from embers to Godzilla's greatest belch."**

Preview: `fire_effects_study.html` (same folder; stage hash `#set=fx:<kind>`). This README is the wiring note for the stage's **Effects** page.

## What it is
One ES module, imports only `three` through the game's importmap. A fire is a `THREE.Group`; position, rotate, scale or parent it like anything else. Inside are up to five GPU layers, each an **instanced billboard-quad system whose entire life is computed in the vertex shader from one clock uniform**, so the CPU never touches a particle and the 2 000-particle atomic belch costs the same per frame as the 30-particle torch:

| layer | blend | what |
|---|---|---|
| flames | additive | fbm-eroded tongues; white-hot core to orange to red; blue combustion tint at the base while a tongue is young |
| embers | additive | tiny twinkling sparks that pop off the coals and wander; belch sparks fall under gravity |
| smoke | normal | puffs lit orange while young, greying and swelling as they rise |
| bed | additive | a flat pulsing coal-glow disc under the fire |
| heat | mask only | drawn only on layer 7 into a half-size heat target; the composite pass turns it into **heat shimmer** (screen-space refraction) |

Plus one flickering `PointLight` per fire.

## Kinds (smallest to largest)
`embers` · `torch` · `small` · `campfire` · `hearth` · `roaring` · `belch` (the gold dragon, loops off, `burst()` per belch) · `atomic` (Godzilla, blue-white). `KINDS` and `PRESETS` are exported; `PRESETS[kind].label` is the display name. All presets are authored at scale 1 with 1 unit = 1 m (the Vita is 1.5 to the crown); the belch reaches ~17 units at scale 1, so scale it 2 to 3 for a Godzilla-sized mouth.

## API
```js
import { FireSystem, Fire, createFire, KINDS, PRESETS, VERSION, HEAT_LAYER } from './fx/fireEffects.js';

const fx = new FireSystem(scene, renderer, { shimmer: true, shimmerStrength: 1, quality: 1 });

const camp = fx.spawn('campfire', { position: new THREE.Vector3(0, 0, 0), scale: 1 });
const breath = fx.spawn('belch', { parent: jawBone, direction: fwd, scale: 2.5 });  // parent OR position
breath.burst(1.2);                 // one belch, mouth open 1.2 s; call again for the next
breath.setLoop(true);              // flamethrower: continuous until setLoop(false)

// every frame, before drawing (dt is clamped to 0.05 inside):
fx.update(dt);
fx.render(camera);                 // replaces renderer.render(scene, camera): scene → HDR target,
                                   // heat masks → half-size target, composite with shimmer → screen.
                                   // fx.shimmer = false makes it a plain renderer.render.

fx.wind.set(2, 0, 0.4);            // world wind, units/s, bends every fire (a fire may own fire.wind instead)
camp.intensity = 0.3;              // 0..1 target, eases over ~1 s; 0 = out. camp.ignite() / camp.extinguish()
camp.aim(dir) / camp.aimAt(point); // point local +Z (the belch direction) along a world direction / at a point
camp.light                         // the PointLight (castShadow off unless spawn({ shadows: true }))
camp.particleCount; fx.particleCount
fx.remove(camp);                   // disposes geometry, materials, light
fx.dispose();
```
`spawn` options: `position`, `direction`, `scale`, `parent`, `intensity`, `loop`, `wind`, `seed`, `quality` (count multiplier), `shadows`, `noSmoke`, `noHeat`, `noBed`.

`createFire(kind, opts)` gives a bare `Fire` for a page that has no `FireSystem`: `scene.add(fire)`, call `fire.update(dt, { wind })` yourself, draw with your own `renderer.render`; you get everything except heat shimmer (the heat layer sits on layer 7 and never shows).

## Wiring it into stage.html's Effects page
1. The page's importmap already maps `three` and `three/addons/`; add `import { FireSystem, KINDS, PRESETS } from './fx/fireEffects.js';`
2. Build the `FireSystem` once after the renderer exists. Fill the effect menu from `KINDS` (labels from `PRESETS[k].label`).
3. On pick: `fx.remove(old)`, then `fx.spawn(kind, { position })`; for `belch`/`atomic` also `fire.aim(dir)` and `fire.burst()` (repeat on a timer or a button).
4. In the frame loop call `fx.update(dt)` then `fx.render(camera)` in place of `renderer.render`.
5. `fx.render` renders the scene into a half-float target with 4× MSAA; it needs WebGL2 (every target browser has it). If the page has its own post-processing, set `fx.shimmer = false` and keep your pipeline.

## Notes
- Tone mapping happens once in the composite pass (three r160 skips it when drawing into a render target), so fire accumulates additively in HDR and the ACES curve rolls the hot cores to white the way film does.
- Smoke is unsorted normal-blended billboards; with the soft alphas that is invisible at these counts.
- No image textures anywhere (STYLE.md); all shape is procedural noise.
- The dragon in the demo is `vendor/models/dragon_meshy.glb` when present. Its mouth point is a guess from the bounding box; I/K/J/L/U/O nudge it in the demo and the HUD prints the local coordinates to copy.
