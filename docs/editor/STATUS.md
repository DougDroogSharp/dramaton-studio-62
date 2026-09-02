# DRAMATON EDITOR (EDITOR lane) — STATUS

**Rewritten 2026-09-02 14:21 PDT by EDITOR (branch `narraton-unify`)**: Narraton shapes unified on the branch (editor DECIDE #1 / George World DECIDE #5 resolved); nothing merged. **Created 2026-09-02 08:45 PDT by DISPATCH**, folding `THREAD_SUMMARIES_2026-09-01.md` §1, `DECISIONS_2026-09-01.md` and `IDEAS_DIGEST_2026-08-31_to_09-01.md` (all in Dropbox `Consolidated/Projects/AIPOTU/`, the dated sources of record). Same rule as the George World STATUS: the EDITOR seat rewrites this at every commit that changes the editor, before its mailbox note. Repo copy is master; Dropbox holds a MIRROR.

## NOW
- **Branch state:** `main` = `857a881`. **`narraton-unify`** (worktree `C:\Users\dougs\narraton-unify`, 3 commits on `857a881`, **409 tests green**, typecheck clean, **not pushed, not merged** — awaits Doug's go): the Narraton metadata unification, see PARKED / RESOLVED. Earlier: `narraton-editor` was merged into `main` at `968bd9c` on 2026-09-01 (decision 37). Other EDITOR-seat branches in flight: `georgeland-editor` (Georgeland Editor v0.2, port 8218) and `facing-alligators` (Chris's drawings); neither touches Narraton.
- **Where the editor runs:** `npm run dev` on 8080 from any checkout; the EDITOR lane serves its worktree on **8087**; launch config `studio-editor` uses 8090.
- **Public copies** (EDITOR redeploys the game copy; the stage is redeployed by whoever registers a study): `https://george-world-aipotu.netlify.app` (staging `C:\Users\dougs\georgeworld-deploy`) · `https://dramaton-stage.netlify.app` (staging `C:\Users\dougs\dramaton-stage-deploy`). Netlify CLI logged in, team Phroggers.
- **What the editor now has** (all on main): Narraton tab (KoC least-squares selector; keys/phase/subplot on scenes; director with no-repeat bags, phase gating, subplot rotation; what-if sliders; test mode with Narraton Drive) · Dramscript `[SET x += n]`/`-=`, inline `[SET]` on choice options, scene-local variables · Skin library (SK tab: GLB/VRM/glTF import, every clip harvested, armature harvest, authored `AnimationClip` JSON, per-world skin-type lockdown, actors wear skins, `[POSE]` autocomplete from the skin) · Vita instrumentation (gauges level/red line/goal + knobs as world variables, presets Happy Voracious / Starving Lazy) · DRAM bridge (`GET`/`PUT /bridge/game`, localhost only, size-capped) · booleans first-class · Opus review fixes (`89bc3cf`).
- **On `narraton-unify` (not yet on main):** one flat Narraton shape on Scene (`pool`, `key`, `keyScale`, `requires`, `repeatable`, `weight`, `act`, `phase`, `subplotId`), one selector (`src/utils/narratonDirector.ts`) for the board, test mode and play-time `[NARRATON]`; the scene editor's Narraton panel edits every field; the Narraton tab gained a pool filter and pool/scale/repeatable/weight on scene detail; loader lifts legacy `scene.narraton`; builders emit the flat shape; the seven shipped games lifted in place.

## DECIDE (open, Doug)
1. ~~**Two Narraton metadata shapes coexist on Scene**~~ — **ruled 2026-09-02: unify onto the flat shape, audit first.** Done on `narraton-unify`; see PARKED / RESOLVED. Remaining call: **merge `narraton-unify` to main** (Doug's go; DISPATCH or GW BUILDER merges).
2. **MCP wrapper over the bridge** (typed tools `get_scene`, `set_variable`, `apply_preset`, `write_script`…) so any Claude surface can co-edit: proposed 2026-08-31, not started. Build now or after the Georgeland work?
3. **Editor's public copy**: publish the Dramaton editor itself on Netlify (offered 2026-08-31, not decided).

## PARKED / RESOLVED
- **Narraton shapes unified (editor DECIDE #1 / George World DECIDE #5), 2026-09-02 14:21 PDT, branch `narraton-unify`.** Audit first (Doug's safeguard): the legacy nested `scene.narraton` object carried SIX things the flat `key/phase/subplotId` shape did not — `pool`, per-key `scale`, `requires`, `repeatable`, `weight`, `act` — and the flat shape was extended with all six BEFORE any data moved (`keyScale` holds the scale; `act` stays distinct from `phase`, which is the position inside a subplot's bag). Then: loader lift in `migrateGameData` (flat wins, legacy fills gaps, garbage tolerated, idempotent); `src/utils/narraton.ts` deleted; `narratonDirector.ts` the one reader; UI on both panels; builders converted; **755 legacy scenes in the seven shipped `public/*.json` games lifted in place and verified field-by-field against HEAD — lossless**. Full record with the audit table: `docs/editor/DESIGN.md` LOG 2026-09-02 14:17. Contract docs updated: `docs/MACHINE_BRIEF.md` §2.5, `docs/CODEBASE_BRIEF.md`, `docs/DRAM_SCRIPT.md` (regenerated).
- **narraton-editor → main merge:** the fold instruction of 2026-09-02 asked to flag this as parked and not perform it. It had already been performed on 2026-09-01 (decision 37, merge commit `968bd9c`, pushed). Nothing further was done on 2026-09-02; recorded here so the two records agree.
- **asset-foundry 16 studies → main:** likewise already landed 2026-09-01 (decision 7a, merge commit `995583e`); see the George World STATUS.

## NEXT
1. **Merge `narraton-unify`** when Doug says go (fast-forward onto `857a881`, or merge if main has moved). Note the main checkout carries UNCOMMITTED DISPATCH edits to `docs/george-world/STATUS.md` and `docs/editor/DESIGN.md` (the 12:13 ride-notes fold); the branch touched both files in different places (DECIDE #5 line; CANON/DIRECTIONS lines + an appended LOG entry), so expect a small, mechanical reconcile of those two docs, not code.
2. **Bridge version guard** (etag on `PUT /bridge/game`): the open review item; concurrent human + AI edits can silently lose the slower writer today.
3. **Runtime notes for GW BUILDER** were posted in the mailbox (18:55 PDT 2026-08-31): play authored clips with `AnimationClip.parse`; persistence (save/load worlds as Dramaton files + load-from-URL). Nothing for EDITOR until GW BUILDER picks them up.
4. **George World Builder** (decision 31): EDITOR lane's project after the map loader lands; phase one = place Vitas, resources, switches on an existing terrain and write a Georgeland file; phase two = terraforming.
5. Library import: stop dangling `skinId`/`subplotId`/`key` references; visual script editor should display `+=` and choice twiddles (data round-trips already).

## RISKS
- **Play-time behavior changed with the unification (flagged, intended):** big misses now exclude at play time (a scene more than half a key's scale off is out; the old runtime only ranked it lower), so a pool written as "always pick something" can yield nothing more often — `[NARRATON]` falls through with a warning as before. The legacy `subplot` string's strict list-order rotation is replaced by phase gating + rotation penalty (no shipped data used it). Score units are ×10000 the old normalized units; ranking unchanged. Watch the era games' witness pools on the first real playthrough after the merge.
- Legacy `scene.narraton` still exists in the wild (old local saves, hand-edited `.dram` files, bridge clients written against the old shape); the loader lifts it on every load path and never writes it back. Bridge clients should write the flat fields.
- `npm run lint:hooks` reports two pre-existing errors in the vendored `docs/prototypes/aipotu/vendor/three/three.module.js` (rule `compat/compat` not found); present on main since `f2687b7`, unrelated to the editor.
- Bridge PUT has no version guard (see NEXT 2).
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
| **`narraton-unify`** | |
| `d0fddf6` | Narraton: one flat metadata shape on Scene, one selector (schema + loader lift, `narratonDirector.ts` the one reader, `narraton.ts` deleted, runtime + both panels, tests rewritten and added) |
| `f6538d5` | Narraton: builders emit the flat shape; shipped games lifted (755 scenes, lossless) |
| (docs) | this STATUS, George World STATUS DECIDE #5, `docs/editor/DESIGN.md` LOG, `MACHINE_BRIEF.md` §2.5, `CODEBASE_BRIEF.md` — 409 tests green |

## POINTERS
- Design: `docs/editor/DESIGN.md` (this lane's design record, created with this file). Contracts: `docs/DRAM_BRIDGE.md`, `docs/DRAM_SCRIPT.md` (generated from `src/utils/scriptDocs.ts`), `docs/MACHINE_BRIEF.md`.
- Narraton shape: `src/types.ts` (`Scene` fields, `liftLegacyNarraton`), `src/utils/narratonDirector.ts` (the selector), `scripts/narraton-fields.mjs` (builders), `scripts/migrate-narraton.mjs` (one-shot file lift).
- Lane brief: `docs/EDITOR_LANE_BRIEF.md`. History: `docs/NARRATON_BRIEF.md` (do not follow its first-act steps).
- Sources of record for this fold: Dropbox `Consolidated/Projects/AIPOTU/THREAD_SUMMARIES_2026-09-01.md`, `DECISIONS_2026-09-01.md`, `IDEAS_DIGEST_2026-08-31_to_09-01.md`.
- George World side: `docs/george-world/STATUS.md`, `docs/george-world/DESIGN.md`. Standing rules: root `CLAUDE.md`.
