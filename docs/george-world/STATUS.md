# GEORGE WORLD — STATUS

**Rewritten 2026-09-01 17:29 PDT by DISPATCH.** This is the entry point. Rule: whoever holds the builder lock rewrites this file at every version commit, BEFORE the mailbox note, and the note cites the row added here. Repo copy is master (`docs/george-world/STATUS.md`); the Dropbox copy in `Consolidated/Projects/AIPOTU/` is a read-only mirror.

## NOW
- **Game:** George World **v0.79**, commit `399de7f` (`docs/prototypes/aipotu/georgeworld.html`, `<title>`).
- **Repo:** `main` = `852ac98` (GitHub main merged in 2026-09-01; local and GitHub now equal). Backup of the pre-merge line: `backup/george-world-main-2026-09-01` = `206dba3`.
- **Branches:** `gw-studies` `a357170` (nine orphaned studies committed + FBX loader vendored) · `gw-dialogue` (new, empty, the dialogue batch) · `narraton-editor` `ad780bd` (editor lane, merge parked) · `asset-foundry` `52bdab2` local / `828d1e4` GitHub (16 foundry studies, to be moved onto main).
- **Servers:** game + stage `http://10.0.0.137:8201/` (phone) · `http://localhost:8201/` (laptop). Public: `https://george-world-aipotu.netlify.app` (game, v0.79) · `https://dramaton-stage.netlify.app` (stage, STALE: 62 entries).
- **Builder lock:** HvM Graphics (GW BUILDER) is the only session that edits `georgeworld.html`, in `C:\Users\dougs\dramaton-studio-62`. Ludo's mailbox entry declared a lock on the map/terrain layer "by HvM"; no BLOCK file exists.
- **Names (ruled 2026-09-01):** Humans vs Billionaires is the game · **George World is the chapter** · a **Georgeland** is a loadable parcel · **Aipotu** is the first Georgeland (the current island) · a **run** is one playthrough · **Georgeotron** is the one name for the machine, page, bench and parts (Georgeomat retired).

## DECIDE (open, Doug)
1. The three fixed cast names meaning ONE, TWO, THREE (is Mia one?). (#19)
2. Approve the map/Georgeland contract once HvM Graphics posts the one-page proposal. (#23)
3. Proper names for the Caldera, Ring Atoll, River Delta, Georgeland 2. (#17)
4. Where the HvB master record lives after eviction from this repo (Dropbox HvB or the HvB chat project). (#10)

## NEXT THREE MOVES
1. **HvM Graphics:** post the map-contract proposal (terrainH/terrainNormal + sea/bounds/spawn + named anchors + room for tier list, cast names, switches, resources, egg chamber, locked cast); Aipotu = module #0 byte-for-byte. Then build.
2. **DISPATCH:** step 2 of the consolidation (CHANGELOG, DESIGN restructure, README, CLAUDE.md, STUDY_PIPELINE, protocol amendments, archive sweep, deletions), then brief the HvB and EDITOR lanes.
3. **gw-dialogue session:** the dialogue-richness batch on its own worktree (`C:\Users\dougs\gw-dialogue`), brief in `DIALOGUE_BATCH_BRIEF.md`.

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
- Design record: `Consolidated/Projects/AIPOTU/DESIGN.md` (moving to `docs/george-world/DESIGN.md`) · Decisions of 2026-09-01: `DECISIONS_2026-09-01.md` · Consolidation plan: `CONSOLIDATION_PLAN.md` · Changelog: `GEORGE_WORLD_BUGS.md` (→ `CHANGELOG.md`).
- Channels: `MAILBOX.md` (append-only), `HvB Comm/COM_PROTOCOL.md` (canonical), BLOCK files.
- Pipeline: `docs/prototypes/aipotu/STYLE.md`, `ASSET_FOUNDRY_BRIEF.md` + `FOUNDRY_ANSWERS.md` (→ `STUDY_PIPELINE.md`), `stage.html`, `skins_inbox/`.
- Lane roster: DESIGN CHAT (Ludo) · DISPATCH (this file's author today) · GW BUILDER (HvM Graphics) · GW STUDIES · EDITOR · HVB · COWORK.
