# Dramaton Editor — Preserved Snapshot

Filed 2026-09-03 08:41 -0700 by Claude Code, at Doug's request: keep a permanently
runnable copy of the Dramaton Editor as it stood when this collaboration was
evolving it toward Phrog, so the ancestor can always be shown. Updated
2026-09-03 09:12 -0700 with the zip-vs-git finding and a launch script, and
again 2026-09-03 09:31 -0700 to add the older Dramaton Editor 2.0 ancestor
(the prototype this codebase's own comments say its taxonomy was "salvaged
from").

## Quickest path: relaunch the as-handed-off editor

Double-click **`LAUNCH-as-handed-off-editor.bat`** in this folder. First run
installs dependencies (~30s); after that it just starts. It prints the URL —
**http://localhost:8094** — once ready.

That launches the artifact described in "The most important part" below, not
the current git snapshot. See "Other ways to run this" further down for the
git-snapshot and true-handoff-commit options.

**Supabase sign-in wall — this is expected, not a break.** This build talks
to a Supabase backend for auth (`PlayerNameDialog`, `SecurityDialog`, etc. —
features added after the git-tracked handoff point). Without live Supabase
credentials configured, the app correctly renders its splash and sign-in
screen and stops there. That is the editor working as designed against no
backend, not a bug in the preserved copy.

## The most important part: the zip is ahead of git

Doug kept ZIP exports of the editor from its Lovable-only era. One of them —
`usavsmaga-main (3).zip`, downloaded 2026-01-26, **contents dated
2026-01-22 23:14 -0800** — turns out to be four days newer than the last
commit this repo's git history actually has for that era
(`dramaton-editor-handoff`, commit `921bb34`, 2026-01-18 18:13 -0800). Something
from those four days never made it into git before the ~7-month gap to
Claude's first commit here (2026-08-17).

Diffing that zip against the next-oldest one shows real, substantive work
that exists nowhere in this repo's git history:

- Undo/redo (`useUndoRedo.ts`)
- Keyboard shortcuts (`useKeyboardShortcuts.ts`, `KeyboardShortcutsHelp.tsx`)
- An AI-usage tracker (`aiUsageTracker.ts`, `AIUsageDisplay.tsx`)
- A Collections editor and panel (`CollectionEditor.tsx`, `CollectionPanel.tsx`)
- Dialogue history and a search overlay (`DialogueHistory.tsx`, `SearchOverlay.tsx`)
- Two Supabase migrations dated 2026-01-19

So for "what did the editor actually look like when Doug handed it off,"
**this zip is the truer artifact — truer than any git commit we could tag.**
It's preserved at:

`C:\Users\dougs\dramaton-editor-preserved\as-handed-off-zip\usavsmaga-main_2026-01-22_as-handed-off.zip`
(the original zip, untouched) with a working extracted-and-installed copy
alongside it at `as-handed-off-zip\usavsmaga-main\`, which is what the launch
script above runs.

## Other ways to run this

**The current git snapshot** (commit `0df7b94`, 2026-09-02 17:04 -0700 —
this repo's state as of the original preservation request, not the handoff
era):

```powershell
cd C:\Users\dougs\dramaton-editor-preserved
.\run-preserved-editor.ps1
```

or manually:

```powershell
cd C:\Users\dougs\dramaton-editor-preserved
npm install   # only needed once, or if node_modules is missing
npm run dev -- --port 8092
```

Then open **http://localhost:8092**. Dependencies were already installed on
2026-09-03; re-running `npm install` is only needed if that folder is deleted.

**The true handoff commit in git** (`dramaton-editor-handoff` tag, commit
`921bb34`, 2026-01-18 18:13 -0800, "Code edited in Lovable Code Editor" — the
last commit the Lovable app-builder made before Claude's first commit here).
This is the git-history equivalent of the zip above, but four days older and
missing the features listed up top:

```powershell
git worktree add C:\Users\dougs\dramaton-editor-handoff dramaton-editor-handoff
cd C:\Users\dougs\dramaton-editor-handoff
npm install
npm run dev -- --port 8093
```

## The older ancestor: Dramaton Editor 2.0

This codebase (`vite_react_shadcn_ts` / "usavsmaga" / `dramaton-studio-62`) is
not the start of the line. `src/constants.ts` in the main repo says outright:
"Taxonomy salvaged from Dramaton Editor 2.0" — a separate, earlier prototype
(`package.json` name `dramaton-editor-2.0`: flat file layout, no `src/`, React
19 + Vite 6 + `@google/genai`, not the Supabase/shadcn stack above). Doug had
it Lovable/AI-Studio-exported as a long string of zips through December 2025;
none of that history lives in any git repo.

**Chosen as authoritative: `dramaton-old (3).zip`**, downloaded
2025-12-18 13:09:58 -0800, content dated 2025-12-18 21:09, 271,616 bytes
uncompressed, 30 files. It's the newest of the whole set (content-identical
to `dramaton-old (2).zip`, downloaded 36 minutes earlier — same work,
re-exported twice) and more complete than the unzipped copy already sitting
in Dropbox at `App Source\Dramaton 2.0 Git\Dramaton-2.0` (that one's dated
2025-12-11, and its `App.tsx` is 22,890 bytes against this zip's 28,449 —
genuinely less code).

Full catalog, all in `C:\Users\dougs\Downloads` unless noted, oldest first:

| File | Size | Modified |
|---|---|---|
| `dramaton-game-editor-v2.0.zip` | 112,536 B | 2025-12-01 20:00 |
| `dramaton-game-editor-v2.0 (1).zip` | 129,948 B | 2025-12-03 14:28 |
| `dramaton-editor-fixed.zip` | 41,137 B | 2025-12-03 14:35 |
| `dramaton-game-editor-v2.0 (2).zip` | 127,538 B | 2025-12-06 15:15 |
| `dramaton-game-editor-v2.0 (3).zip` | 127,538 B | 2025-12-06 18:44 |
| `dramaton-game-editor-v2.0 (4).zip` | 127,538 B | 2025-12-11 13:32 |
| `dramaton-game-editor-v2.0 (5).zip` | 136,042 B | 2025-12-11 18:31 |
| (unzipped) `Dramaton 2.0 Git\Dramaton-2.0` | — | 2025-12-11 (folder) |
| `dramaton-game-editor-v2.0 (6).zip` | 174,246 B | 2025-12-12 15:54 |
| `dramaton-game-editor-v2.0 (7).zip` | 176,683 B | 2025-12-12 18:34 |
| `dramaton-game-editor-v2.0 (8).zip` | 253,870 B | 2025-12-14 20:58 |
| `dramaton-game-editor-v2.0 (9).zip` | 266,853 B | 2025-12-15 13:46 |
| `dramaton-game-editor-v2.0 (10).zip` | 267,938 B | 2025-12-16 17:45 |
| `dramaton-old.zip` | 267,912 B | 2025-12-16 18:06 |
| `dramaton-old (1).zip` | 267,916 B | 2025-12-16 20:00 |
| `dramaton-old (2).zip` | 271,616 B | 2025-12-18 12:33 |
| **`dramaton-old (3).zip`** | **271,616 B** | **2025-12-18 13:09 ← chosen** |

Preserved at `C:\Users\dougs\dramaton-editor-preserved\dramaton-2.0-ancestor\`:

- `dramaton-old_2025-12-18_ancestor.zip` — the chosen zip, byte-for-byte as
  found in Downloads. Untouched, authoritative.
- `extracted\` — that zip extracted and `npm install`'d, otherwise
  unmodified. **This copy does not build.** It has a genuine bug baked into
  the original source: `components/editors/SceneEditor.tsx` line 929 has a
  literal `>>` inside JSX text (`>> GOTO: Scene Name`), which is invalid JSX
  (bare `>` must be escaped or wrapped) and fails under the esbuild version
  Vite 6 now pulls in. This is authentic to the snapshot, not something
  preservation introduced — left as-is on purpose so the artifact stays exact.
- `preview-patched\` — a separate copy with exactly that one line changed
  (wrapped in `{'...'}` instead of raw JSX text) so the app can actually be
  looked at. This is the copy the launch script below runs. Everything else
  in it is identical to `extracted\`.

**To relaunch:** double-click
`dramaton-2.0-ancestor\LAUNCH-dramaton-2.0-ancestor.bat`. First run installs
dependencies; then it opens **http://localhost:8096**, landing on a "DRAMATON
2.0 — DIESELPUNK NARRATIVE ARCHITECT v2.5" splash with new-game/load-game —
confirmed working 2026-09-03. It uses a placeholder Gemini API key
(`.env.local`), so anything that calls out to Gemini won't work; the editor
UI itself is otherwise intact.

## What this folder is

A dedicated git worktree, frozen on its own branch — not touched by ongoing
work in `C:\Users\dougs\dramaton-studio-62` (main) or any other worktree/branch.

- Branch: `dramaton-editor-preserved`
- Tag: `dramaton-editor-snapshot-2026-09-03` (same commit)
- Commit: `0df7b94fcc808b8e861e7c3a06f04bbf9d9f82fa`, 2026-09-02 17:04 -0700
  ("STATUS: DECIDE #5 closed...")

## Keeping it frozen

Do not `git pull` or `git merge` into this worktree/branch, and do not edit
the extracted `as-handed-off-zip\usavsmaga-main\` copy, either `dramaton-2.0-ancestor`
copy, or any of the source zips. If you want to compare against how the
editor has evolved since, do that from main or another worktree — leave
everything here exactly as tagged and zipped. The one intentional exception
is `dramaton-2.0-ancestor\preview-patched\`, which carries a single
documented line-fix so it can run; `extracted\` next to it is the true,
unpatched original.
