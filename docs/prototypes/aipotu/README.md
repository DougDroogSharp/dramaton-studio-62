# George World — the Aipotu prototype folder

Filed 2026-09-01 17:39 (-07:00) by DISPATCH (decision 2.4 of the doc consolidation). Facts here mirror `docs/george-world/STATUS.md`; when they disagree, STATUS.md wins and this file gets fixed.

## What this is
- **Humans vs Billionaires** is the game. **George World** is one of its chapters (alongside William the Conqueror, Leopold, Capone). Inside George World you load a **Georgeland** (a parcel with its own terrain, switches, resources, tier list and optional locked cast). **Aipotu** is the first Georgeland, the current island, and this folder is named after it. A **run** is one playthrough on a Georgeland.
- `georgeworld.html` is the whole game: one ~600 KB single-file Three.js page, no build step, no tests, no persistence yet.
- Every other `*_study.html` is a standalone asset study (one creature, vehicle, building or effect per file). About 90 exist; six are integrated into the game.
- `george_world_dialogue.js` is the dialogue pool; `island.html` is the older island slice; `anim_viewer.html` and `skin_test_study.html` belong to the armature pipeline.

## Version rule
- The version lives in the `<title>` of `georgeworld.html` (`George World v0.79` today). One version per commit; commit subject `George World vX.YY - one line`.
- The page's stale-page guard re-fetches the served `<title>` whenever the tab becomes visible and reloads on a mismatch, so **never hot-edit the served file without bumping the title** or players get half-written builds.
- `docs/george-world/STATUS.md` is rewritten at every version commit by the builder-lock holder, before the mailbox note; the note cites the STATUS row.

## Run
- From this folder: `python serve_nocache.py 8201` (a no-store `http.server`; a plain refresh always fetches the latest build). Launch config `georgeworld` in `.claude/launch.json` does the same.
- Laptop `http://localhost:8201/georgeworld.html` · phone on the LAN `http://10.0.0.137:8201/georgeworld.html`.
- World config is the URL: `?scenario=terror` (the Nine-Vita Terror preset) · `?cast=` (1–9 letters from `rghefdt`, one Vita each) · advanced switches `?slavery=1` `?life=1` `?disasters=1` `?godzilla=1`. `REBELLION_ENABLED` and `GOLD_ENABLED` are constants in the file, both `false` (rebellion becomes a Georgeland switch under decision 27).
- Other sessions serve their own studies on their own ports (8209–8212); 8201 belongs to the game and the stage.

## The Stage
- `stage.html`, served on the same port, is the registry of every study: a cascading item menu, then an animation/scene/skin menu per item. The second menu drives the study through the `#set=` / `#click=` hash (the stage remote-control snippet every study carries).
- Every new study gets an `<option>` in the right optgroup. **Whoever registers a study redeploys the public stage in the same step** (decision 35b): staging folder `C:\Users\dougs\dramaton-stage-deploy`, public copy `https://dramaton-stage.netlify.app`. The Dropbox `models/` folder is retired (decision 6).

## Studies
- One file per asset. `STYLE.md` is the law: Lambert + flatShading, the Vita as meter-stick, one rendering rig, dt clamped to 0.05, one wind signal, one water method, the Georgeotron palette.
- Three r160 is vendored under `vendor/three/` and loaded through the game's importmap (`three`, `three/addons/`). No CDN.
- `anim_viewer.html` audits clips in a dropped `.glb`; `skin_test_study.html` is the skin gallery (skins × clips + imports). Skins are listed in `vendor/models/manifest.json` (Xbot.glb is the standing reference). Doug drops downloaded skins into Dropbox `Consolidated/Projects/AIPOTU/skins_inbox/` and says "skins"; GW BUILDER (who owns `vendor/`) installs them into `vendor/models`, adds the manifest line, commits, and empties the inbox.
- The FBX loader (`FBXLoader.js` + fflate) is vendored on the `gw-studies` branch (decision 35a) so Mixamo FBX drops into the gallery; `main` has only `GLTFLoader.js` until that branch merges.
- Vitas are armature-driven glTF going forward; the procedural pose rigs (`vita_study`, `vita_anim_study`) are behavior and timing prototypes, not the shipping system.

## Data contract
- **Saves are Dramaton files** (standing requirement, Doug 2026-08-30; the ARCHITECTURE comment near line 2496 of `georgeworld.html`). The shape is `public/hvb-william.json`'s: `info.worldState` is a flat numeric map, then `actors`, `scenes`, `drops`, `items`, `sfx`, `buttons`, `episodes`. Mapping: every global sim number (dayPhase, simT, techMask, totalHarvests, landTax, commonsHoard) plus per-Vita keys (`mia_hunger`, `mia_hoard`) and link keys (`spring_lomi_mia:1`) go into `worldState`; Vitas become `actors`; `SCENE_DEFS` become `scenes` written as Dramscript with their world-state firing keys (discovery and milestone ados are cutscene-type scenes); the island and backdrops are `drops`; the scenario roster is `episodes`; history is a sequence of `worldState` frames. Consequence: keep `snap()` and state flat, numeric and name-addressable. No bespoke save format, ever. The persistence layer itself is not built yet.
- **Dialogue master** is the repo copy of `george_world_dialogue.js`; the copy in Dropbox `Consolidated/Projects/AIPOTU/` is a mirror.
- **DRAM bridge** (`docs/DRAM_BRIDGE.md`, on the `narraton-editor` branch until it merges): while the editor dev server runs, `GET /bridge/game` returns the live GameData and `PUT /bridge/game` replaces it (read-modify-write, never from scratch); the open editor applies it at once over Vite's HMR socket. Skins carry an `armature` and `authoredAnimations` (`AnimationClip.toJSON()` objects); the runtime plays authored clips with `AnimationClip.parse` on the loaded skin. Localhost only, not in production builds.

## Coordination
- Read `docs/george-world/STATUS.md` first; it is the entry point.
- `MAILBOX.md` (Dropbox AIPOTU folder) is append-only; `HvB Comm/COM_PROTOCOL.md` is the canonical protocol (the AIPOTU copy is a stub); `BLOCK--<scope>--by-<who>.md` files make a shared surface hands-off. Check for BLOCK files before touching any shared surface.
- **One builder:** GW BUILDER (the HvM Graphics session) is the only session that edits `georgeworld.html`, in the main checkout `C:\Users\dougs\dramaton-studio-62`. Every other session works in its own worktree on its own branch and hands work back as a branch; merges go through the builder.
- Branches: `main` · `gw-studies` (worktree `C:\Users\dougs\gw-studies`) · `gw-dialogue` (worktree `C:\Users\dougs\gw-dialogue`) · `narraton-editor` (editor lane) · `asset-foundry` (moving onto main).
- Lane roster: DESIGN CHAT · DISPATCH · GW BUILDER · GW STUDIES · EDITOR · HVB · COWORK. Sessions sign with the seat name.

## Public copies
- Game: `https://george-world-aipotu.netlify.app` (staging folder `C:\Users\dougs\georgeworld-deploy`).
- Stage: `https://dramaton-stage.netlify.app` (staging folder `C:\Users\dougs\dramaton-stage-deploy`); stale until the redeploy-on-register rule is followed.

## Do-nots
- No fishing mechanic, in any Georgeland; fish are decorative (Doug is vegetarian).
- No 3-D skin editor; skins are imported finished (VRoid, Blender, Mixamo, or commissioned).
- Speech balloons are DOM overlays, never sprites.
- No bespoke save format; Dramaton files only.
- Never hot-edit the served `georgeworld.html` without bumping the title.
- Georgeotron is the one name for the machine, page, bench and parts; Georgeomat is retired (old entries stay as written).

## Launch configs (`.claude/launch.json`)
`georgeworld` 8201 · `georgeland2` 8209 · `atoll` 8210 · `crab` 8211 · `delta` 8212 · `honu` 8213 · `caldera` 8214, all `python serve_nocache.py <port>` from this folder (the duplicate ports were fixed 2026-09-01). Session ports by convention: foundry 8215, dialogue 8216, others 8217+. The editor is `studio-editor` on 8090 (`npm run dev -- --port 8090`).

## Docs
- Repo master: `docs/george-world/` holds `STATUS.md` now; `DESIGN.md`, `CHANGELOG.md` (the renamed `GEORGE_WORLD_BUGS.md`) and `STUDY_PIPELINE.md` move there in the consolidation.
- Dropbox `Consolidated/Projects/AIPOTU/` is the read-only mirror for chat sessions, and still holds `DECISIONS_2026-09-01.md`, `CONSOLIDATION_PLAN.md`, `MAILBOX.md`, the briefs and `skins_inbox/`.
- `STYLE.md` (this folder) is the study style contract.
