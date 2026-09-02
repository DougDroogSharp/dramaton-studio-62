# George World — the STUDY STYLE CONTRACT
Filed 2026-08-31 17:58 by HvM Graphics (GW BUILDER), after the consistency audit of all 35 studies. Amended 2026-09-01 by DISPATCH per DECISIONS_2026-09-01.md (#6, #13, #33, #35b): this repo copy is the master; the procedure around it is `docs/george-world/STUDY_PIPELINE.md`.
Every new asset follows this, so everything looks like it belongs in ONE world.

## Realism level
Stylized-real: honest proportions and honest MOTION (real gaits, real physics
feel) built from primitives — capsules, cones, lathes — with **MeshLambertMaterial
+ flatShading** everywhere. No image textures; surface detail comes from
**painted canvases** (brindle, blanket spots, dial plates, deck art) and
**baked vertex colors** (dorsal→ventral shading, foliage tips, water foam).
Metal accents may use MeshStandard (gold, iron, steel) — sparingly.

## Scale
The Vita is the meter-stick: stand-in body = capsule(0.3, 0.42) + head sphere
(0.3), hips at 0.42 — ~1.5 units to the crown. Verified identical across all
12 studies that include one. Everything is sized against it (Poppy shoulder
~1.15 · horse withers ~2.1 · keep 14 high · Godzilla ~9).

## Rendering rig (identical in every study)
ACESFilmic tone mapping · PCFSoft shadows · one warm sun DirectionalLight +
one HemisphereLight (+ rare cool fill) · vertex-colored sky dome · fog matched
to the ground palette. **Exposure bands (deliberate):** daylight scenes
1.08–1.12 · mood/night scenes (fire, volcano, godzilla, tornado) 1.0–1.05.

## Animation tempo (the frame-rate rule)
All studies run requestAnimationFrame with **dt clamped to 0.05** and every
motion dt-scaled — so real-time rate is uniform by construction; nothing is
frame-rate dependent. Authored tempos (the only allowed differences):
- adult walk ~8 rad/s leg phase · run 13 · toddler 10 · ox plod 2.6/dist
- eases: pose transitions lerp at dt*3–6; fast snaps (gait) dt*26–30
- wind is ONE signal everywhere: base + slow gust envelope + high-freq
  flutter; hurricane gusts slam (sharp attack). Stiffness ladder: palm 1.0 ·
  corn 0.9 · fir 0.45 · berry bush 0.22 (stiff = high-frequency, small
  amplitude — never a deep bow).

## Water (one method, everywhere)
Per-vertex height + per-vertex color painted per frame on a Lambert plane:
DEEP 0x2a6f9e · SHALLOW 0x4fa8c4 · FOAM 0xf2fbfd. Ocean waves phase on
distance-to-shore (crests parallel any coastline); rivers phase DOWN the
course (creek short/quick → river long/slow → lake a tenth of that).

## The machine (Georgeotron) vocabulary
Metal bodies 0x8f99a3 / heads 0xb1bac3 · dial plate #2b3138 face, #7c8894
ring, 8 ticks · notch 0x3a4046, HOT 0xff7a5c + ember emissive · coil spring
red 0xd84f4f translucent · pipe green 0x2fa05a translucent + glow beads ·
brass knobs/needles. Part anchors ship as window.GEORGEOTRON_PARTS
{ports/gauges/knobs: name, pos, dir} — see georgeotron_parts_study.html.

## Pipeline form (how assets are saved)
One standalone `*_study.html` per asset: vendored three r160 via the game's
importmap · seeded rand · maker functions with grip/anchor at origin so parts
parent straight into hands/mounts · controls in the corner chip · an entry in
stage.html · the public stage (dramaton-stage.netlify.app) redeployed in the
same step (the Dropbox models/ copy is retired). One git commit per study, on
your own branch in your own worktree; GW BUILDER merges. The machine's one
name is GEORGEOTRON (Georgeomat is retired).

## Out of scope for this contract
Any study another session has uncommitted, and the studies owned by the GW
STUDIES seat on branch gw-studies (terrain, georgeland2, turtle, crab, dragon,
flora, atoll, delta, orca) — not restyled here.
