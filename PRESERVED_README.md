# Dramaton Editor — Preserved Snapshot

Filed 2026-09-03 08:41 -0700 by Claude Code, at Doug's request: keep a permanently
runnable copy of the Dramaton Editor as it stood when this collaboration was
evolving it toward Phrog, so the ancestor can always be shown.

This folder is a dedicated git worktree, frozen on its own branch. It is not
touched by ongoing work in `C:\Users\dougs\dramaton-studio-62` (main) or any
other worktree/branch.

## What this is
- Branch: `dramaton-editor-preserved`
- Tag: `dramaton-editor-snapshot-2026-09-03` (same commit — the state as of this
  request)
- Commit: `0df7b94fcc808b8e861e7c3a06f04bbf9d9f82fa`, dated 2026-09-02 17:04 -0700
  ("STATUS: DECIDE #5 closed...")

A second tag, `dramaton-editor-handoff`, marks an earlier, arguably more
meaningful point: commit `921bb349...` (2026-01-19 02:13, "Code edited in
Lovable Code Editor") — the last commit made by the Lovable app-builder before
Claude's first commit on this codebase (`cb857c6`, 2026-08-17). That is the
literal hand-off from Doug's Lovable-built editor to this collaboration. Check
that state out separately if you want *that* ancestor instead of "now":

```powershell
git worktree add C:\Users\dougs\dramaton-editor-handoff dramaton-editor-handoff
cd C:\Users\dougs\dramaton-editor-handoff
npm install
npm run dev -- --port 8093
```

## How to run THIS preserved snapshot, anytime

```powershell
cd C:\Users\dougs\dramaton-editor-preserved
.\run-preserved-editor.ps1
```

Or manually:

```powershell
cd C:\Users\dougs\dramaton-editor-preserved
npm install   # only needed once, or if node_modules is missing
npm run dev -- --port 8092
```

Then open **http://localhost:8092**.

This worktree's dependencies (`node_modules`) were already installed on
2026-09-03. Re-running `npm install` is only needed if that folder is deleted.

## Keeping it frozen
Do not `git pull` or `git merge` into this worktree/branch. If you want to
compare against how the editor has evolved since, do that from `main` or
another worktree — leave this one exactly as tagged.
