# GEORGE WORLD — STATUS

**Rewritten 2026-09-01 17:51 PDT by DISPATCH** (consolidation step 2 landed: DESIGN, CHANGELOG, STUDY_PIPELINE, READMEs, CLAUDE.md all in the repo). This is the entry point. Rule: whoever holds the builder lock rewrites this file at every version commit, BEFORE the mailbox note, and the note cites the row added here. Repo copy is master (`docs/george-world/STATUS.md`); the Dropbox copy in `Consolidated/Projects/AIPOTU/` is a read-only mirror.

## NOW
- **Game:** George World **v0.79**, commit `399de7f` (`docs/prototypes/aipotu/georgeworld.html`, `<title>`).
- **Repo:** `main` = `968bd9c` (GitHub main merged in at `852ac98`; consolidation docs; `asset-foundry` merged at `995583e`; `gw-studies` merged at `2a70e58`; **`narraton-editor` merged at `968bd9c`**, 390 tests green on the branch; local and GitHub equal). Backup of the pre-merge line: `backup/george-world-main-2026-09-01` = `206dba3`. The HvB material now lives in its own repo `DougDroogSharp/hvb-design`.
- **Branches:** `gw-studies` (merged; the GW STUDIES seat keeps working there) · `gw-dialogue` (the dialogue batch, in progress) · `narraton-editor` `ad780bd` (EDITOR lane merging main in now; DISPATCH fast-forwards main after) · `asset-foundry` (merged; foundry worktree now carries main).
- **HvB Asset Stage** (renamed 2026-09-01; `stage.html`, v3): 91 entries; ◀ ▶ buttons and ← → keys step through every item whatever has focus; a NOTES box per item saves Doug's critiques to `docs/prototypes/aipotu/STAGE_NOTES.md` (+ `stage_notes.json`) through `serve_nocache.py`'s `POST /stage-notes`. **Sessions: read STAGE_NOTES.md for Doug's verdict on each asset.** Public copy redeployed with v3. Terrain Walk's blank-page crash (TDZ) fixed.
- **Servers:** game + stage `http://10.0.0.137:8201/` (phone) · `http://localhost:8201/` (laptop). Public: `https://george-world-aipotu.netlify.app` (game, v0.79) · `https://dramaton-stage.netlify.app` (stage, STALE: 62 entries).
- **Builder lock:** HvM Graphics (GW BUILDER) is the only session that edits `georgeworld.html`, in `C:\Users\dougs\dramaton-studio-62`. Ludo's mailbox entry declared a lock on the map/terrain layer "by HvM"; no BLOCK file exists.
- **Names (ruled 2026-09-01):** Humans vs Billionaires is the game · **George World is the chapter** · a **Georgeland** is a loadable parcel · **Aipotu** is the first Georgeland (the current island) · a **run** is one playthrough · **Georgeotron** is the one name for the machine, page, bench and parts (Georgeomat retired).

## DECIDE (open, Doug)
1. The three fixed cast names meaning ONE, TWO, THREE (is Mia one?). (#19)
2. Approve the map/Georgeland contract once HvM Graphics posts the one-page proposal. (#23)
3. Proper names for the Caldera, Ring Atoll, River Delta, Georgeland 2. (#17)
4. ~~Where the HvB master record lives~~ — ruled 10b: repo `DougDroogSharp/hvb-design`, mirror Dropbox `HvB Design/`.
5. **Two Narraton metadata shapes now coexist on Scene** after the editor merge: `key/phase/subplotId` (the editor's director) and `narraton` (the theater runtime from GitHub's line). Unify, or keep both? (EDITOR flagged it 2026-09-01.)

## LANES RUNNING (2026-09-01 evening)
| Seat | Folder / branch | Doing |
|---|---|---|
| GW DIALOGUE | `C:\Users\dougs\gw-dialogue` · `gw-dialogue` · port 8216 | the dialogue-richness batch (brief: Dropbox `DIALOGUE_BATCH_BRIEF.md`) |
| EDITOR | `C:\Users\dougs\editor-lane` · `narraton-editor` · port 8087 | merging main into the branch, tests, push; DISPATCH fast-forwards main (brief: `docs/EDITOR_LANE_BRIEF.md`) |
| HVB | `C:\Users\dougs\hvb-design` (its own repo, GitHub `DougDroogSharp/hvb-design`, mirror Dropbox `HvB Design/`) | folding the 2026-09-01 rulings into the master record (brief: `LANE_BRIEF.md` there) |
| GW BUILDER | main checkout · `main` · :8201 | HvM Graphics; map-contract proposal pending; merge `gw-studies` |
| GW STUDIES / foundry | `C:\Users\dougs\dramaton-editor` · `asset-foundry` | 16 studies waiting to move onto main; queue of 16 more |

## NEXT THREE MOVES
1. **GW BUILDER (HvM Graphics):** post the map-contract proposal (terrainH/terrainNormal + sea/bounds/spawn + named anchors + room for tier list, cast names, switches, resources, egg chamber, locked cast); Aipotu = module #0 byte-for-byte. Then build. Also: merge `gw-studies` (nine studies + FBX loader) and wire the FBX loader into the skin gallery.
2. **DISPATCH:** fast-forward `main` when EDITOR reports the merge green; drop `stash@{0}`; set the lane permission allow-list (7b); move the foundry's 16 studies onto main (7a).
3. **Doug:** the four DECIDE items above; create nothing else, the lanes are running.

## BUILDER QUEUE (ruled order)
map loader → Georgeotron round trip (long-press entry; any-layer default; king-only as a switch) → industry/steam engine → births/weddings/child-labour. In parallel: dialogue batch (own worktree). Editor lane: Populous builder after the loader. Studies seat: foundry queue (16 pending), beaver/pig/dolphins, coal/iron art.

## IN FLIGHT
- Uncommitted copies of the nine studies still sit untracked in the main checkout (identical to `gw-studies`); owning sessions should move to the `gw-studies` worktree.
- A stash `stash@{0}` in the main checkout holds the editor session's pre-merge edits to `SceneEditor.tsx` and `DRAM_SCRIPT.md`; superseded by `narraton-editor`.
- Two app-launched sessions (narraton-editor, Asset Foundry) died when the phone's device registration vanished; transcripts intact, summaries in `THREAD_SUMMARIES_2026-09-01.md`.

## RISKS
- The 600 KB single-file game has no tests; module-level ordering has broken boot three times (watchdog mitigates). Hot-editing the served file hands players broken builds.
- No persistence; the Dramaton-format save is a comment block (~line 2496), not code.
- Integration debt: ~90 studies exist, six are in the game; the armature Vita is study-only.
- Public stage is stale until the redeploy-on-register rule (#35b) is followed.

## VERSION LOG
| Version | Commit | Date (PDT) | One line |
|---|---|---|---|
| v0.79 | `399de7f` | 08-31 17:16 | WX TEST menu on the real island |
| v0.78 | `dacc2a5` | 08-31 16:32 | berries 8 near / 20 far in clumps |
| v0.77 | `c73a8c0` | 08-31 14:25 | steady palm shadows |
| v0.76 | `2562640` | 08-31 14:23 | real sleep poses |
| v0.75 | `f2b0283` | 08-31 14:22 | landing bewilderment + backstories |
| v0.74 | `8fb1af2` | 08-31 14:11 | obit card + graveyard rows (last CHANGELOG entry) |
| v0.73 | `4105372` | 08-31 14:08 | one bottom panel |
| v0.72 | `df3dc35` | 08-31 14:06 | grounded feet, honest gait, Poppy on the contour |
| v0.71 | `0ca621a` | 08-31 14:03 | figs/dates → berries dialogue sweep |
| v0.70 | `4a8d62a` | 08-31 14:02 | hair + shirt colors |
| v0.69 | `ebe6341` | 08-31 14:01 | Poppy's play urge |
| v0.68 | `0380c70` | 08-31 13:59 | status panel + GEORGEOTRON rename |
| v0.67 | `5e9f7a4` | 08-31 13:56 | the making before the card |
| v0.66 | `d0e961c` | 08-31 13:55 | placement spec verified |
| v0.65 | `b053e6f` | 08-31 13:51 | the communal RAISING |
| v0.64 | `8ba6121` | 08-31 13:46 | six dialogue categories wired |
| v0.63 | `797908f` | 08-31 13:38 | timber = fir felling |
| v0.62 | `345c1a0` | 08-31 13:28 | storage = the first basket |
| v0.61 | `92dfd99` | 08-31 12:42 | no beards, black top hat, twin hills, scarce bushes |
| v0.60 | `9bb2839` | 08-31 09:19 | stuck-in-night fix, gull raids, THE CATCH (batch v0.52–v0.60) |
| v0.51 | `f2687b7` | 08-30 20:27 | batch v0.19–v0.51: mine, saucer, tiers, court, dragon, coup, disasters, berries, dial |
| v0.18 | `e1ae6df` | 08-30 02:19 | first commit: society sim, chronicle, day/night, Opus fixes, values fix |

## POINTERS
- **Repo master, `docs/george-world/`:** `STATUS.md` (this) · `DESIGN.md` (canon + directions + the verbatim log) · `CHANGELOG.md` (per-version verification notes, v0.8–v0.79) · `STUDY_PIPELINE.md` (how studies are built, registered, redeployed). Also `docs/prototypes/aipotu/README.md` (what/run/data contract), `STYLE.md` (style contract), root `CLAUDE.md` (standing rules). Dropbox `Consolidated/Projects/AIPOTU/` mirrors these (files headed MIRROR) and holds `DECISIONS_2026-09-01.md`, `CONSOLIDATION_PLAN.md`, the briefs, the provenance notes (WALK/EVENING/RIDE notes, POPPY spec, IDEAS_DIGEST), `IDEAS.md`, `GEORGES_EXAMPLES.md`, `skins_inbox/`, and `archive/` (superseded docs).
- Channels: `MAILBOX.md` (append-only), `HvB Comm/COM_PROTOCOL.md` (the only canonical copy), BLOCK files.
- Retired/deleted 2026-09-01: HANDOVER, the playbook, BUGS (now CHANGELOG), the two foundry docs (now STUDY_PIPELINE), VISION/RELATIONSHIPS/NOTES/TASKS (archived), DESIGN_backup, MAILBOX_prev, handover/, aipotu.zip, the Aug-30 briefing (deleted). Dropbox `models/` is retired (redeploy the public stage instead).
- Lane roster: DESIGN CHAT (Ludo) · DISPATCH (this file's author today) · GW BUILDER (HvM Graphics) · GW STUDIES · EDITOR · HVB · COWORK.
