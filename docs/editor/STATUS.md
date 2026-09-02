# DRAMATON EDITOR (EDITOR lane) — STATUS

**Created 2026-09-02 08:45 PDT by DISPATCH**, folding `THREAD_SUMMARIES_2026-09-01.md` §1, `DECISIONS_2026-09-01.md` and `IDEAS_DIGEST_2026-08-31_to_09-01.md` (all in Dropbox `Consolidated/Projects/AIPOTU/`, the dated sources of record). Same rule as the George World STATUS: the EDITOR seat rewrites this at every commit that changes the editor, before its mailbox note. Repo copy is master; Dropbox holds a MIRROR.

## NOW
- **Branch state:** `narraton-editor` (14 commits on `2872a41`, then main merged in at `e3408ce` with 390 tests green) **was merged into `main` at `968bd9c` on 2026-09-01** (decision 37, executed by DISPATCH). `docs/DRAM_BRIDGE.md` is on main. The EDITOR worktree `C:\Users\dougs\editor-lane` is fast-forwarded to main.
- **Where the editor runs:** `npm run dev` on 8080 from any checkout; the EDITOR lane serves its worktree on **8087**; launch config `studio-editor` uses 8090.
- **Public copies** (EDITOR redeploys the game copy; the stage is redeployed by whoever registers a study): `https://george-world-aipotu.netlify.app` (staging `C:\Users\dougs\georgeworld-deploy`) · `https://dramaton-stage.netlify.app` (staging `C:\Users\dougs\dramaton-stage-deploy`). Netlify CLI logged in, team Phroggers.
- **What the editor now has** (all on main): Narraton tab (KoC least-squares selector; keys/phase/subplot on scenes; director with no-repeat bags, phase gating, subplot rotation; what-if sliders; test mode with Narraton Drive) · Dramscript `[SET x += n]`/`-=`, inline `[SET]` on choice options, scene-local variables · Skin library (SK tab: GLB/VRM/glTF import, every clip harvested, armature harvest, authored `AnimationClip` JSON, per-world skin-type lockdown, actors wear skins, `[POSE]` autocomplete from the skin) · Vita instrumentation (gauges level/red line/goal + knobs as world variables, presets Happy Voracious / Starving Lazy) · DRAM bridge (`GET`/`PUT /bridge/game`, localhost only, size-capped) · booleans first-class · Opus review fixes (`89bc3cf`).

## FACING ALLIGATORS LANE (added 2026-09-02 14:18 PDT by EDITOR (Facing Alligators); additive, nothing above changed)
- **Branch `facing-alligators`, commit `0870820`** (from main `857a881`), worktree `C:\Users\dougs\facing-alligators`, dev server `npm run dev -- --port 8088` there. Not merged; Doug ruled "commit on the branch, keep iterating" (2026-09-02).
- **DRAWINGS v0.1** (DW tab, version beside the title): the shared store of finished 2-D art. `drawings[]` on GameData; `Drop.drawingId` / `ActorGraphic.drawingId` point at one stored copy; file save dehydrates, `migrateGameData` hydrates (`src/utils/drawings.ts`, 17 tests). Import files or scan/import an art folder through `vite-plugin-drawings.ts` (dev only, loopback, home-dir only, read-only; path saved as `info.artFolder`). Trim borders, make a backdrop (fit=contain), add as actor pose, save to the Asset Library (LB now lists drawings; `.dramlib` carries them). `Drop.fit` cover|contain + `backdropColor` honored by `Stage.tsx`; "From Drawings" pickers in the Drop and Actor editors. No AI generation on this path (Facing Alligators art is hand-drawn by Chris Unruh).
- **Project seed** `public/facing-alligators.json` (Oberon, Ayo, Bop; episodes The Book, The Game; artFolder preset; no art bytes) opens from a "Facing Alligators" section on the splash. The art itself stays in Dropbox `Consolidated/Facing_Alligators_Art/` (5 files) and out of the repo.
- **Ruled 2026-09-02 14:22 PDT (Doug):** the book is scenes-as-pages inside the one document (episode The Book), the game's episode beside it. **Open:** Chris's surname (Unrue/Unruh) and pronouns conflict across records; merge order against the Georgeland Editor branch (both touch this file).

## DECIDE (open, Doug)
1. **Two Narraton metadata shapes coexist on Scene** after the merge: `key/phase/subplotId` (the editor's director) and `narraton` (the theater runtime from GitHub's line). Unify, or keep both? (EDITOR flagged 2026-09-01; also George World STATUS DECIDE #5.)
2. **MCP wrapper over the bridge** (typed tools `get_scene`, `set_variable`, `apply_preset`, `write_script`…) so any Claude surface can co-edit: proposed 2026-08-31, not started. Build now or after the Georgeland work?
3. **Editor's public copy**: publish the Dramaton editor itself on Netlify (offered 2026-08-31, not decided).

## PARKED / RESOLVED (flag only; recorded per the 2026-09-02 fold instruction)
- **narraton-editor → main merge:** the fold instruction of 2026-09-02 asked to flag this as parked and not perform it. It had already been performed on 2026-09-01 (decision 37, merge commit `968bd9c`, pushed). Nothing further was done on 2026-09-02; recorded here so the two records agree.
- **asset-foundry 16 studies → main:** likewise already landed 2026-09-01 (decision 7a, merge commit `995583e`); see the George World STATUS.

## NEXT
1. **Bridge version guard** (etag on `PUT /bridge/game`): the open review item; concurrent human + AI edits can silently lose the slower writer today.
2. **Runtime notes for GW BUILDER** were posted in the mailbox (18:55 PDT 2026-08-31): play authored clips with `AnimationClip.parse`; persistence (save/load worlds as Dramaton files + load-from-URL). Nothing for EDITOR until GW BUILDER picks them up.
3. **George World Builder** (decision 31): EDITOR lane's project after the map loader lands; phase one = place Vitas, resources, switches on an existing terrain and write a Georgeland file; phase two = terraforming.
4. Library import: stop dangling `skinId`/`subplotId`/`key` references; visual script editor should display `+=` and choice twiddles (data round-trips already).

## RISKS
- Bridge PUT has no version guard (see NEXT 1).
- `docs/NARRATON_BRIEF.md` L102–119 ("FIRST ACT": copy five base files) is obsolete and would clobber real work if followed; a banner is due (consolidation step).
- The stash `stash@{0}` in the main checkout (pre-merge edits to `SceneEditor.tsx`, `DRAM_SCRIPT.md`) is superseded by the merge and can be dropped when Doug approves a `git stash drop`.

## COMMIT LOG (branch, then main)
| Commit | What |
|---|---|
| `2b4a90d` | base: five copied files, 19 sceneText tests |
| (schema, selector) | `Scene.key/phase/subplotId/localVars`, `Subplot`; `utils/narraton.ts` least-squares + tests |
| (dramscript) | `+=`/`-=`, inline choice `[SET]`, scene-local vars; stale `[IF]`-after-`[SET]` bug fixed |
| `5913efa` | episode picker on New Scene |
| `e235c02` | skin library, SK tab, lockdown, `[POSE]` autocomplete from skins |
| `c28c663` | Vita gauges/knobs/presets |
| `1211e7e` | armature harvest, authored clips, DRAM bridge, `docs/DRAM_BRIDGE.md` |
| `8b1113d` | Narraton directs: bags, phase gating, rotation, what-if sliders, Drive |
| `8c79730` | booleans first-class |
| `89bc3cf` | Opus review fixes (UTF-8 bridge corruption, shape gate, StrictMode double `+=`, `[SCENE]` over-run, localhost-only bridge, orphaned gauge vars, NaN keys, GLB edge cases) |
| `ad780bd` | two-way com skill adopted |
| `e3408ce` | main merged into the branch, 390 tests green |
| `968bd9c` | **merged into main** (DISPATCH, 2026-09-01) |

## POINTERS
- Design: `docs/editor/DESIGN.md` (this lane's design record, created with this file). Contracts: `docs/DRAM_BRIDGE.md`, `docs/DRAM_SCRIPT.md` (generated from `src/utils/scriptDocs.ts`), `docs/MACHINE_BRIEF.md`.
- Lane brief: `docs/EDITOR_LANE_BRIEF.md`. History: `docs/NARRATON_BRIEF.md` (do not follow its first-act steps).
- Sources of record for this fold: Dropbox `Consolidated/Projects/AIPOTU/THREAD_SUMMARIES_2026-09-01.md`, `DECISIONS_2026-09-01.md`, `IDEAS_DIGEST_2026-08-31_to_09-01.md`.
- George World side: `docs/george-world/STATUS.md`, `docs/george-world/DESIGN.md`. Standing rules: root `CLAUDE.md`.
