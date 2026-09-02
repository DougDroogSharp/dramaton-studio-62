# NARRATON EDITOR BRIEF — 2026-08-31 18:20
Handoff from the george-world-build session (B-CODE) to a fresh editor session.
Doug's requirements verbatim-in-substance, the King-of-Chicago subplot
mechanism the design should build on, and a completed code survey (bottom) —
verify surprising claims against the code, but don't re-survey from scratch.

## Doug's feature batch (his words, lightly cleaned)
1. In the Narraton editor: create a NEW SCENE, TAG it with target world-state
   variables, and CREATE those variables in the same flow.
2. A new CLASS of variables: IN-SCENE variables — scene-local, NOT exposed to
   Narraton (the scene selector never sees them).
3. Inside scenes: DECISION POINTS that TEST and CHANGE both in-scene and
   world-state variables.
4. PLAY these minimal scenes from within the editor — bare-bones dialogue
   choices are fine, but each choice must be CLEARLY MARKED with the variables
   it twiddles — and SEE WHAT SCENE THIS COULD LEAD TO (i.e., after playing,
   show which scenes' tags now best match the resulting world state).
5. Scenes are NAMEABLE.
6. Mark scenes as BEGINNING / MIDDLE / END scenes.
7. SUBPLOTS creatable (see the KoC mechanism below — Doug asked for this to
   follow how the original game did it).
8. Click a scene → straight into the Scene Editor. A scene created in the
   Narraton editor is immediately PLAYABLE WITHIN THE EPISODE.
9. TEST MODE for the stage (the editor's play stage): a little panel showing
   the live WORLD-VARIABLE STATE + the CURRENT SCENE's stats (its tags/keys,
   match score, what it changed).

## How the original game did subplots (KoC, from Doug's 1989 CGDC paper —
## Dropbox: Consolidated/Dramaton_Papers/03_Story_vs_Game_CGDC_1989.md)
- EPISODES (≈scenes) live in SEQUENCES — bags each holding one mid-sized hunk
  of story (a problem → a move → a solution), with twist-variant episodes per
  phase (e.g. the Lola/Tony ambush: recruit Lola → Lola baits Tony → the
  ambush, where variants include Lola's double-cross).
- SEQUENCES are grouped by OWNER (Pinky's sequences, Tony's sequences).
  NARRATON is the routine that picks the next episode when one ends, rotating
  unpredictably between owners' bags — that rotation IS how subplots braid.
- EPISODE SELECTION = least-squares key match: each episode carries a KEY
  (target values for one or more game variables, 0–100: Lola_happiness 15,
  Boss_rep 30). Selector picks the available episode whose key most closely
  matches the live game variables (sum of squared differences; big misses
  exclude themselves). 4–20 candidates at any moment. NO flowcharting between
  episodes; hard if/then branching only INSIDE an episode.
- Choices inside episodes increment/decrement game variables, which steers
  future selection. Some branches invisible to the player (state-driven).
- Design cautions from the paper: sequences must not create cross-subplot
  contradictions (Tony can't be both plotting with Lola and sending a hitman);
  a pacing variable (gang morale decay) cued a special ending sequence so
  games couldn't drag on.
- Mapping to Doug's asks: scene TAGS = KoC keys · BEGINNING/MIDDLE/END = phase
  markers within a sequence · SUBPLOT = an owned sequence · "what scene could
  this lead to" = show the selector's current ranking after a test play.

## Code survey (completed 2026-08-31 by B-CODE's Explore agent)
- STACK: Vite + React 18 + TS, Tailwind/shadcn, react-router. `/` = the editor
  (pages/Index.tsx), `/theater` + `/play` = runtime (pages/Theater.tsx).
  Tests: vitest (src/test).
- STATE: ONE useState<GameData> in pages/Index.tsx:71, passed as game +
  onChange to every editor. No store lib. Persistence: idb-keyval autosave
  (utils/db.ts, key dramaton_save_v2) + .dram file = JSON.stringify(game)
  (utils/filePicker.ts). migrateGameData (types.ts:232) is THE place for
  additive schema evolution — all new fields must be optional.
- SCENE (types.ts:76): { id, name, sceneType?: 'AGENCY'|'WITNESS', dropId?,
  stage?: StageElement[], script?, audioTracks?, note?, status? }. Episode
  (types.ts:176): { id, name, sceneIds } — explicitly UNORDERED, many-to-many.
- "NARRATON" appears NOWHERE in src/ — this batch INTRODUCES the Narraton
  editor surface. (The only mention repo-wide is the architecture note in
  georgeworld.html:2496 calling this app "the Narraton Editor".)
- VARIABLES: GameInfo.worldState: Record<string, string|number|boolean>
  (types.ts:17). Only editor: SettingsEditor.tsx:188-236 (bare key/value
  add/remove, values stored as raw strings, no types/rename/usage-index).
  useScriptRunner.ts:55 SNAPSHOTS worldState per run; [SET] writes the
  snapshot (:263), [IF] reads it (:271) — runtime changes are NEVER written
  back to game.info.worldState. Items have effects[]/unlockCondition types
  (types.ts:111) that NOTHING evaluates.
- DRAMSCRIPT: utils/scriptParser.ts (20 commands, docs/DRAM_SCRIPT.md is
  GENERATED from utils/scriptDocs.ts via vite-plugin-dram-docs). [SET v = x],
  [IF v op x]...[ENDIF] (nesting via IF stack), [CHOICE] options ALWAYS jump
  to a scene id (- "text" -> scene_id) — no inline choice branches.
- PLAYBACK: useScriptRunner.ts is the engine; ScenePreview.tsx = in-editor
  full-screen modal (Preview button, SceneEditor.tsx:741); Theater.tsx = full
  runtime, start scene = info.titleSceneId || scenes[0] — titleSceneId HAS NO
  UI anywhere.
- ORDERING/LINKS: no beginning/middle/end, no subplots, no tags, no graph.
  Scene→scene links exist ONLY implicitly: [SCENE id], [CHOICE]->id,
  Button.targetSceneId. Nothing computes inbound/outbound links.
- UNCOMMITTED prior work (understand, don't break): utils/sceneText.ts +
  editors/SceneTextPanel.tsx + test/sceneText.test.ts — the "All Text" panel;
  edits scripts SURGICALLY by character span, deliberately bypassing
  parse/serialize round-trips to preserve formatting. New panels should follow
  its contract: (scene, game, onSceneChange(Partial<Scene>), onClose).
- CHEAP LEVERAGE (agent's read): (1) a sceneLinks.ts regex pass gives the
  scene graph with zero schema change; (2) new optional Scene fields + a
  migrateGameData line = classification/tags; (3) a variable usage-index is
  the same regex pass; (4) titleSceneId UI is a one-liner gap.
- STANDING RULE: George World saves serialize as Dramaton files (the GameData
  shape). Keep new variable/tag/subplot fields inside this shape. Dramscript
  written docs: docs/DRAM_SCRIPT.md (generated — edit scriptDocs.ts instead);
  Dropbox Consolidated/Dramaton_Papers/Dramaton_Slots_and_Script.md names
  Narraton as the DIRECTOR slot of the five-slot Dramaton architecture.

## Coordination — STRICTLY SEPARATE CODEBASES (Doug's rule)
- YOU (the editor session) work in the dedicated worktree:
  **C:\Users\dougs\dramaton-editor** on branch **narraton-editor**
  (created 2026-08-31 from main @ 2872a41). It is a physically separate
  checkout — nothing you do here can touch the build session's files.
- The george-world-build session (B-CODE) stays in
  C:\Users\dougs\dramaton-studio-62 on main, owning
  docs/prototypes/aipotu/** and the :8201 server. Never work in that folder;
  never touch :8201.
- FIRST ACT in your worktree: the prior session's uncommitted editor work
  exists ONLY in the main checkout. Copy these five files from
  C:\Users\dougs\dramaton-studio-62 into the same paths in your worktree,
  then commit them as your base:
    src/utils/sceneText.ts
    src/components/editors/SceneTextPanel.tsx
    src/test/sceneText.test.ts
    src/components/editors/SceneEditor.tsx   (modified — carries the All Text button)
    docs/DRAM_SCRIPT.md                       (modified — regenerated docs)
  Run `npx vitest run src/test/sceneText.test.ts` before committing.
  (Copy = read-only toward the main checkout; you change nothing there.)
- Path ownership on your branch: src/**, public/**, docs/DRAM_SCRIPT.md,
  docs/NARRATON_BRIEF.md (yours now), package.json/lock if needed.
  NEVER commit docs/prototypes/** or docs/HVB_MASTER_DESIGN_RECORD*.
- Commit small and often on narraton-editor; don't push; don't merge.

## THE FOLD-TOGETHER PLAN (when both sessions finish)
1. Editor session announces done (tell Doug; Doug tells B-CODE, or note it in
   the Dropbox AIPOTU MAILBOX.md as [from EDITOR]).
2. B-CODE (or Doug) merges, from the main checkout:
     git merge narraton-editor
   Because path ownership is disjoint by construction (narraton-editor touches
   only src/public/editor-docs; main's new commits touch only aipotu + docs),
   the merge cannot conflict. Exception to watch: the five copied base files —
   if the main checkout's uncommitted copies changed meanwhile, reconcile by
   taking the editor branch's version (it is the continuation).
3. After merge: run the app + vitest once on main; B-CODE keeps serving :8201.
4. Cleanup: git worktree remove ../dramaton-editor (keep the branch for
   history).

## Questions worth asking Doug before building (from B-CODE's read)
  a) Where does the Narraton editor LIVE — a new top-level editor beside the
     Scene Editor, or a mode of the episode view?
  b) Are scene tags exact-target keys (KoC least-squares) from day one, or
     simple checklists first?
  c) Is the test-mode panel editor-only, or should it also ship in play mode?

## PERMISSION-PROMPT & HARNESS LESSONS (learned the hard way by B-CODE)
- `.claude\settings.local.json` in this worktree already sets
  defaultMode acceptEdits + an allowlist (git read/add/commit, npm/npx/node,
  vitest, Copy-Item) � routine work should not prompt. Add new patterns there
  when a prompt repeats (or run /fewer-permission-prompts).
- Use the DEDICATED tools (Read/Edit/Write/Grep/Glob) � never shell
  cat/sed/find/echo. They do not prompt and integrate with the UI.
- Avoid `cd` chains; use absolute paths. Bash and PowerShell SHARE one
  persisted working directory in this harness � a Bash `cd` once broke a
  later PowerShell git commit in the build session.
- NEVER put double quotes inside `git commit -m` arguments on Windows �
  native arg parsing splits them and the commit half-fails. Use a
  single-quoted here-string (@'...'@, closing '@ at column 0) and skip the
  " character entirely.
- PowerShell 5.1 ENCODING TRAP: Get-Content/Set-Content default to ANSI and
  will corrupt UTF-8 files containing emoji/em-dashes (it mangled
  georgeworld.html once; recovery was lucky). Use
  [System.IO.File]::ReadAllText/WriteAllText with
  (New-Object System.Text.UTF8Encoding $false), or the Edit/Write tools.
- Batch independent commands into ONE shell call; independent tool calls into
  one message. Syntax-check JS with node --check before committing.
