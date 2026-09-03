# Dramaton Editor — Preserved Snapshot

Filed 2026-09-03 08:41 -0700 by Claude Code, at Doug's request: keep a permanently
runnable copy of the Dramaton Editor as it stood when this collaboration was
evolving it toward Phrog, so the ancestor can always be shown. Updated
2026-09-03 09:12 -0700 with the zip-vs-git finding below and a launch script.

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

## What this folder is

A dedicated git worktree, frozen on its own branch — not touched by ongoing
work in `C:\Users\dougs\dramaton-studio-62` (main) or any other worktree/branch.

- Branch: `dramaton-editor-preserved`
- Tag: `dramaton-editor-snapshot-2026-09-03` (same commit)
- Commit: `0df7b94fcc808b8e861e7c3a06f04bbf9d9f82fa`, 2026-09-02 17:04 -0700
  ("STATUS: DECIDE #5 closed...")

## Keeping it frozen

Do not `git pull` or `git merge` into this worktree/branch, and do not edit
the extracted `as-handed-off-zip\usavsmaga-main\` copy or its source zip. If
you want to compare against how the editor has evolved since, do that from
main or another worktree — leave everything here exactly as tagged and
zipped.
