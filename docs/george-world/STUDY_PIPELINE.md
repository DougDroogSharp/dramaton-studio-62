# STUDY PIPELINE — how a 3-D study gets built, verified, registered and shipped

Filed 2026-09-01 17:39 by DISPATCH.
**Replaces ASSET_FOUNDRY_BRIEF.md + FOUNDRY_ANSWERS.md** (both in Dropbox `Projects/AIPOTU`; keep them as history, do not follow them).
Obeys DECISIONS_2026-09-01.md rulings #6, #7b, #12, #13, #33, #34, #35a, #35b.

**Who obeys it:** the **GW STUDIES** seat (owner of every study), any foundry session, and anyone else who builds a `*_study.html`.
Doug's protocol applies on top: ONE thing at a time, short replies, **bold** never italics, real Get-Date timestamps on everything you file.

## 1. Where you work

- **Never in the builder's main checkout** (`C:\Users\dougs\dramaton-studio-62`). That folder and `georgeworld.html` belong to GW BUILDER (decision #33).
- Make your own worktree on your own branch, one session per folder:
  `git -C C:\Users\dougs\dramaton-studio-62 worktree add -b <branch> C:\Users\dougs\<name> main`
  (GW STUDIES today = branch `gw-studies`.) A worktree is a folder checkout of the same repo, not a session; two sessions in one folder is how a volcano got replaced under its author.
- Serve your own port from your worktree's `docs\prototypes\aipotu`: `python serve_nocache.py 8215` (foundry), 8216 (dialogue), 8217+ for anyone else. **:8201 is the builder's** — never start or stop it.
- Studies live in ONE place: `docs/prototypes/aipotu/` in the repo. The Dropbox `models/` folder is **retired** (decision #6) — no more copies there; Side C reviews on the public stage. Dropbox `Projects/AIPOTU` is for docs only.
- Read a study's source from git, never from a Dropbox reader (it strips scripts). If you must hand an uncommitted page to a chat session, copy it as `models/src/<name>.html.txt`.

## 2. The style contract

`docs/prototypes/aipotu/STYLE.md` is the law; read it in full before your first asset. This is only the summary.
The meter-stick is the **Vita**: stand-in = capsule(0.3, 0.42) + head sphere(0.3), hips at 0.42, **~1.5 units to the crown**.
Size everything against it and include a stand-in whenever a Vita uses the asset.

Five non-negotiables:
1. **MeshLambertMaterial + flatShading:true** on primitives (capsules, cones, lathes, boxes); MeshStandard only for rare metal accents.
2. **No image textures** — surface detail is painted canvases and baked vertex colors only.
3. **Vita = 1.5 units** — the scale stick for everything (Poppy shoulder ~1.15 · horse withers ~2.1 · keep 14 high).
4. **dt clamped to 0.05** and every motion dt-scaled — nothing frame-rate dependent.
5. **One wind signal** — base + slow gust envelope + high-frequency flutter; stiffness ladder palm 1.0 → corn 0.9 → fir 0.45 → berry bush 0.22 (stiff = small and fast, never a deep bow).

Same rig every study: ACESFilmic tone mapping, exposure 1.08–1.12 daylight / 1.0–1.05 mood, PCFSoft shadows, one warm sun DirectionalLight + one HemisphereLight, vertex-colored sky dome (BackSide sphere, fog:false), fog matched to the ground palette.
Water: per-vertex height + color per frame on a Lambert plane — DEEP 0x2a6f9e · SHALLOW 0x4fa8c4 · FOAM 0xf2fbfd.
The machine vocabulary is **GEORGEOTRON** — one name for the page, the machine, the bench and the parts kit; "Georgeomat" is retired (decision #13). Part anchors ship as `window.GEORGEOTRON_PARTS` (see `georgeotron_parts_study.html`).

## 3. Picking the rig

- **Quadrupeds** (horse, goat, donkey, dog, beaver, pig): procedural primitive rig in code like `horse_study.html` — body group, four leg groups (upper/lower/hoof), neck + head chain, tail chain. Walk = 4-beat (leg offsets 0, 0.5, 0.25, 0.75), trot = diagonal pairs (0/0.5), gallop gathers and extends. Bigger body = slower leg phase (ox plod 2.6/dist vs horse walk ~8 rad/s).
- **Birds / fish / serpents / cetaceans**: chain rigs — a spine of segments driven by a traveling sine (`orca_study`, `fish_study`) or wing groups with flap + glide envelopes (`seagull_study`).
- **Machines**: no armature — pivoted groups per moving part (`windmill_study`, `spinningwheel_study`, `georgeotron_parts_study`).
- **Humanoids / Vitas**: the stand-in capsule Vita with procedural limbs unless the description demands real skins. Then, and only then, the GLB armature pipeline: `vita_rig_study` (the body), `skin_test_study` (skins × clips + imports), `terrainwalk_study` (full leg IK, any skin), `anim_viewer` (drop a .glb, audit clips). Bone and track names are Mixamo-prefixed **without the colon** — normalize imports with `name.replace('mixamorig:','mixamorig')`. **Quaternion tracks travel between rigs; position tracks stay home.** FBX (Mixamo exports) now loads through the vendored `three/addons/loaders/FBXLoader.js` (+ `libs/fflate.module.js`, `curves/NURBS*`) — decision #35a, on branch `gw-studies`.
- In every case the rig is THREE.Group hierarchies rotated in the animation loop, dt-scaled — never keyframe files, never bones/skinning, unless it is the Vita GLB pipeline.

## 4. The file skeleton

One standalone `<slug>_study.html`, in this order:
1. HTML comment header: STUDY NAME, filed date, one paragraph saying what the loop shows.
2. A corner `#chip` div: title + version + interaction hint; every study control (dropdowns, buttons) lives in the chip. Give any mode `<select>` an id and any mode button a `data-m` (section 7).
3. The game importmap, verbatim:
   `{ "imports": { "three": "./vendor/three/three.module.js", "three/addons/": "./vendor/three/addons/" } }`
4. `<script type="module">`: import THREE + OrbitControls; a SEEDED rand (`seed = (seed*1103515245+12345) & 0x7fffffff`) so the study is deterministic; clamp/lerp/smoothstep helpers; renderer/scene/camera/controls/sky/lights/ground per the rig above; maker functions with the grip/anchor at the ORIGIN so parts parent straight into hands and mounts; the animation loop with `dt = Math.min(clock.getDelta(), 0.05)`; export a manual stepper (`window.<NAME>_STEP(dt)`) for captures.
5. The stage remote-control snippet (section 7) before the module's closing `</script>`, if the study has modes.

Exemplars to read before writing: `well_study.html` (object + character loop), `horse_study.html` (creature gaits), `windmill_study.html` (machine), `balloon_study.html` (prop + toddler). Match their density and comment voice — comments say WHAT THE MOTION IS, not what the code does.

## 5. The per-asset loop

1. **BUILD.**
   - Parse Doug's description into the OBJECT (form, scale vs the Vita) and the ANIMATIONS (a watchable behavior loop, idles included; selectable from the chip when there is more than one).
   - Write `<slug>_study.html` per section 4. Seeded rand. dt-scaled.
2. **VERIFY — both halves, every time.** (The old brief said `node --check` did not apply; it does, on the extracted script.)
   - (a) Extract the `<script type="module">` body to a scratch file, strip the `import` lines, run `node --check` on it — a free typo catch.
   - (b) Serve your port, load the study in headless Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe` via playwright-core), screenshot it, and **look at the screenshot**. Zero console errors. A blank frame is a broken study.
   - If the pane is hidden, drive the frame with the `_STEP` stepper — rAF is suspended in background tabs.
3. **REGISTER.**
   - Check for `BLOCK--*` files in the aipotu folder first; if blocked, stop and tell Doug.
   - Add ONE `<option value="<slug>_study.html">Short name — what it shows</option>` to `stage.html` in the right `<optgroup>`: Creatures & characters · The armature pipeline · Transport · Objects & builds · Flora & growth · World & atmosphere · The machine · The game.
   - If the study has modes, add its rows to the `MODES` map in `stage.html`: `'<file>': [['set=<id>:<value>', 'Label'], ['click=<data-m>', 'Label'], ...]` (section 7).
   - Nothing goes to Dropbox `models/` any more (decision #6).
4. **COMMIT — one study per commit, on your branch.**
   - Stage only your files by name: `git add docs/prototypes/aipotu/<slug>_study.html docs/prototypes/aipotu/stage.html` — never `-A` or `.`.
   - No double quotes anywhere in the message (Windows arg parsing breaks); write it as a single-quoted here-string (`@'` … `'@`, closing `'@` at column 0). The message names the asset and its animation list.
   - `git push -u origin <branch>`. (The old brief said do not push; under the worktree model you push your branch so the builder can merge it.)
5. **REDEPLOY the public stage in the same step** (decision #35b).
   - Mirror your study, `stage.html` (saved there as both `stage.html` and `index.html`) and anything new under `vendor/` into `C:\Users\dougs\dramaton-stage-deploy`.
   - `netlify deploy --prod --dir C:\Users\dougs\dramaton-stage-deploy` — the CLI is installed and logged in (team Phroggers); pass `--site` if it asks which site.
   - Confirm `https://dramaton-stage.netlify.app` shows the new entry before you report.
6. **REPORT.**
   - One short message to Doug (**bold**, never italics): what was built, the animation list, the stage entry name, the public URL.
   - Append one line to `Projects/AIPOTU/MAILBOX.md` signed `[from GW STUDIES]` with the commit hash and branch (append bytes, UTF-8 no BOM — never rewrite the file).
   - The builder merges your branch into main; you do not merge.

## 6. The stage remote-control contract

The stage's second menu drives a study by URL hash on load:

    #set=<selectId>:<value>[,<selectId2>:<value2>]   — sets a <select> and fires its change event
    #click=<data-m>                                   — clicks the element with [data-m="..."]

The stage reloads the iframe as `<file>?n=<counter>#<hash>` — the `?n=` cache-buster forces a real reload — so a study reads the hash **once at startup**; no message-passing. Paste this reader verbatim before the module's closing `</script>` (twelve studies carry it; grep `stage remote-control`):

    // stage remote-control: #set=<selectId>:<value>[,...] · #click=<data-m>
    {
      const _h = new URLSearchParams(location.hash.slice(1));
      const _s = _h.get('set');
      if(_s) for(const pair of _s.split(',')){
        const [id, val] = pair.split(':');
        const el = document.getElementById(id);
        if(el){ el.value = val; el.dispatchEvent(new Event('change')); }
      }
      const _c = _h.get('click');
      if(_c){ const b = document.querySelector('[data-m="' + _c + '"]'); if(b) b.click(); }
    }

Rules: `<select>` values and `data-m` names must not contain `:`; the study must be fully wired (selects created, listeners attached) before the snippet runs; MODES rows (hash + label) go into `stage.html` with your option, or into MAILBOX.md if you cannot commit. Three gotchas from the handover: (1) changing only an iframe's `#hash` does NOT reload it — that is why the `?n=` buster exists; (2) an empty `<optgroup>` renders nothing on iOS Safari — give it a disabled placeholder option; (3) `[System.IO.File]` ignores PowerShell's `cd` — absolute paths or your writes land in the repo root.

## 7. Drop-in contracts available

All built to the house convention: **head faces +Z, origin at ground level.** Source is in the study named; read it from git.
- **`window.DRAGONFIRE`** (`dragon_study.html`) — an aimable flame/smoke emitter that knows nothing about dragons:
  `DRAGONFIRE.create(scene, {scale}) -> { aim(originVec3, dirVec3), breathe(seconds, power), update(dt), burning }`
  Feed it a world point + direction each frame (the dragon uses a mouth-anchor Object3D's world transform). Flame and smoke are separate pools; smoke outlives flame and dying flame heads seed more of it, so it rolls instead of jets. Use for volcano vents, the eruption ritual, torches.
- **`window.FLORA`** (`flora_study.html`) — 16 species, ~11k triangles total, one merged vertex-colored geometry per species, ALL SHARING ONE MATERIAL:
  `{ SPECIES, geometryFor(key, lod), buildField, scatterAll, tick(t), setWind(w) }`
  Each species carries `fit(env)` (h / slope / sand / wet / shade / trodden / exposure) and a `rar` rarity weight. Wind is injected at `<begin_vertex>` reading WORLD position so a hillside leans together.
- **`window.HONU` / `window.CRAB` / `window.DRAGON`** (`turtle_study`, `crab_study`, `dragon_study`) — creature builders.
  `HONU.build({lambert:true})` swaps PBR for the game's flat Lambert. The honu is a direct swap for the placeholder turtle in `georgeworld.html`. Each exports a `<NAME>_STEP` manual stepper.
  Dragon: only idle, fly, rage and the fire were visually verified; walk, crouch, launch and land still need eyes. Wings read kite-like — worth a pass before integration.

## 8. Skins

- Doug drops `.glb` / `.gltf` / `.vrm` / `.fbx` character files into Dropbox `Projects/AIPOTU/skins_inbox/` from any device and says **"skins"**.
- GW BUILDER installs everything there into the Skin Gallery: copies into `vendor/models/`, adds each to `vendor/models/manifest.json` (which `skin_test_study` reads), commits, and empties the inbox.
- FBX (Mixamo exports) is now supported via the vendored FBXLoader (#35a) — no more asking before a download.
- Dramaton only imports finished skins (VRoid / Blender / Mixamo or commissioned) — no modeling or rigging UI is ever built.

## 9. Gotchas (merged; one line each)

- `mergeGeometries` returns NULL silently if you mix indexed and non-indexed geometry (Icosahedron/Polyhedron are non-indexed) — `toNonIndexed()` everything first.
- A fully-metallic PBR material with no environment map renders BLACK — give the scene a `PMREMGenerator` envmap or keep metalness moderate.
- Limb segments must be CLOSED with a condyle sphere at each joint — pinch the radius to zero over the last ~9% of each segment, or the knees gape.
- Limb mirroring (`scale.x = -1`) goes on a ROOT group ABOVE the animated joints, with `side: DoubleSide` — mirroring the joint itself swings the limb across the body.
- A hidden or backgrounded browser pane suspends `requestAnimationFrame` — "nothing moves" looks like a broken study; use the `_STEP` stepper for captures.
- Vertex colors read back off a geometry are LINEAR, not sRGB — never debug a palette against the raw attribute.
- A `launch.json` entry with a `"url"` re-seeds its preview tab and fights `navigate` — open a fresh tab to drive a specific study.
- Species and variant mixes need PROPORTIONAL ROULETTE, not winner-takes-all, or the commonest one wins every roll.
- Bulk-editing an object literal: anchor on the property you are inserting before, never on a quote offset.
- Seeded LCG rand for all placement; `Math.random` only for fire-and-forget particles.
- `dt = Math.min(0.05, clock.getDelta())` everywhere or a tab switch teleports your animations.
- `node --check` the extracted module script before serving; strip the `import` lines first.
- PowerShell 5.1 `Get-Content` / `Set-Content` default to ANSI and CORRUPT UTF-8 (em-dashes, emoji) — use the Read/Write/Edit tools, or `[System.IO.File]::ReadAllText/WriteAllText` with `UTF8Encoding($false)` and absolute paths.
- No `&&` in PowerShell 5.1; no `cd` chains — absolute paths, batched independent commands, few permission prompts.
- MAILBOX.md: append only; whole-file rewrites have eaten others' entries and mangled UTF-8 twice.
- Com is pull-based — nobody has read your message until they next touch the channel.

## 10. Never touch

- `georgeworld.html` and `george_world_dialogue.js` — the builder's, in the builder's main checkout.
- `vendor/**` — the builder's; propose additions via MAILBOX.md (the FBX loader went in this way).
- The `:8201` server.
- Any file another session has uncommitted, and the six other-session studies — `terrain_study.html`, `georgeland2_study.html`, `turtle_study.html`, `crab_study.html`, `dragon_study.html`, `flora_study.html` — until their owners commit them (the GW STUDIES seat inherits them once committed on `gw-studies`, decision #34; the seat holds ownership, not a session).
- Nothing outside `docs/prototypes/aipotu/` (and `docs/george-world/` docs) without Doug's say-so.

## 11. Com

Canonical protocol: `C:\Users\dougs\Dropbox\Droog Claude Projects\HvB Comm\COM_PROTOCOL.md` — read it once, follow it always; plain `com` from Doug = check the HvB Comm folder, report, print back any relayed string verbatim, declare files changed since last com. Sign as **GW STUDIES** (decision #12).
BLOCK-file rule: before EVERY edit to a shared surface (`stage.html`, the Dropbox AIPOTU folder, the staging folder) check for `BLOCK--*` files in the owning folder; if blocked, do not touch, tell Doug. Locks require a BLOCK file; nothing else counts.
