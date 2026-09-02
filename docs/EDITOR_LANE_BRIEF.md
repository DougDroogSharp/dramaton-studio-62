# EDITOR LANE — standing brief

**Filed 2026-09-01 17:56 PDT by DISPATCH.** You are the **EDITOR** seat: the Dramaton editor lane (React + TypeScript + Vite, `src/`). Decisions of 2026-09-01 that shape this lane: #33 (one session per folder, merges through the builder for the game file), #37 (merge `narraton-editor` now), #31 (the George World Builder is yours, after the map loader), #2 (STATUS.md is the entry point).

## Where you work
- Worktree: `C:\Users\dougs\editor-lane`, branch `narraton-editor` (14 commits on `2872a41`: Narraton director, skin library with armature harvest, Vita gauges/knobs/presets, the DRAM bridge, review fixes, booleans). Start `claude` there. The old worktree `C:\Users\dougs\dramaton-editor` now belongs to the foundry (branch `asset-foundry`); leave it alone.
- Never edit `docs/prototypes/aipotu/**` or touch `:8201`; that is GW BUILDER's lane. Serve the editor on 8087 from your worktree.
- Read first: root `CLAUDE.md` (standing rules), `docs/george-world/STATUS.md`, this file, then `docs/NARRATON_BRIEF.md` for history only — **do not follow its "FIRST ACT" instructions (lines ~102–119); they predate your branch and would clobber it.**

## First act: the merge (decision 37)
1. In your worktree: `git fetch`, then `git merge main` into `narraton-editor`. Expected conflicts: only the five copied base files (`src/utils/sceneText.ts`, `src/components/editors/SceneTextPanel.tsx`, `src/test/sceneText.test.ts`, `src/components/editors/SceneEditor.tsx`, `docs/DRAM_SCRIPT.md`); take the branch's versions. Note: main now carries GitHub's HvB theater line (merged 2026-09-01), so expect many incoming files that do not conflict.
2. `npm install` if needed, `npm test` (96 tests were green on the branch), `npm run build`. Fix anything the merge broke.
3. Push `narraton-editor`. Post one MAILBOX.md entry `[from EDITOR]` saying the branch is merge-ready at `<hash>` with tests green. DISPATCH (or GW BUILDER) fast-forwards `main`; you do not touch `main` yourself (it is checked out in the builder's folder).
4. A stash `stash@{0}` in the main checkout holds pre-merge edits to `SceneEditor.tsx` and `DRAM_SCRIPT.md` that your branch supersedes; after the merge lands, tell DISPATCH so it can be dropped.

## Then, the queue
- **Redeploy the editor's public copy** if Doug asks (Netlify, staging folders `C:\Users\dougs\georgeworld-deploy` and `C:\Users\dougs\dramaton-stage-deploy`; the CLI is logged in, team Phroggers; the stage redeploy is now the study registrar's job per #35b, the game redeploy stays yours).
- **Bridge version guard** (etag on `PUT /bridge/game`), the open review item.
- **Runtime notes for GW BUILDER** at merge time: play authored `AnimationClip` JSON with `AnimationClip.parse`; persistence (save/load worlds as Dramaton files + load-from-URL). Post them in the mailbox; do not implement in the game file.
- **The George World Builder** (decision 31): after the map loader lands, phase one = place Vitas, resources and switches on an existing terrain and write a Georgeland file; phase two = terraforming. Wait for DISPATCH's go.
- Doug's editor ideas from 2026-08-31 are all built except the MCP wrapper over the bridge (proposed, not started) and the voice-authored animation loop (which is a Claude session on the bridge, not code).

## House rules
- Bold, never italics. One instruction at a time; short. Real date+time stamps from Get-Date.
- Sign as **EDITOR**. Protocol: `Dropbox/Droog Claude Projects/HvB Comm/COM_PROTOCOL.md`. `com` from Doug = the two-way check.
- Stage files by name; one thing per commit; no double quotes inside commit messages; never push --force. No 3-D skin editor, ever (import finished skins only).

— DISPATCH
