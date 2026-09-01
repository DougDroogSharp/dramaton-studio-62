---
date: 2026-08-17
title: Clearing the bench
commits: 8
source: reconstructed
---

> **Reconstructed from the commit log.** Eight commits, all with real messages.

Seven months of silence, and the work resumes the way returning to a project
always does: by removing things.

**The rest-period system is deleted.** Two commits — one for the engine, one for
the editor and the PDF capture that had grown around it. Built in January with
care (a calm blue overlay, an auto-save at the start of each rest, a fix for
gears on mobile), it turned out to be a tool telling its user when to stop
working. It went.

Then repair: `Repair Index.tsx encoding`, and finishing the job of disabling the
autosave skip the rest system had left behind. Removals leave holes.

**And salvage.** Three commits pull ideas back out of *Dramaton Editor 2.0*, an
earlier version of this tool:

- **Scene types** — the AGENCY/WITNESS pair. Does the player act, or watch and
  react? A distinction the whole scene taxonomy still rests on.
- **A migration path** for 2.0 saves, renaming `screens` to `drops`.
- **The item taxonomy** — costume, prop, knowledge, gear. Four categories instead
  of a generic bag.

That is three good ideas recovered from a dead version, which is a better return
than most days of new work.

**Also:** a cost meter now sits in the editor header, always visible. Token spend
made ambient rather than discovered later.

**And the name changed.** One commit, two words: `Title: Phrog Able`. The project
had started thinking of itself as something larger than a game.
