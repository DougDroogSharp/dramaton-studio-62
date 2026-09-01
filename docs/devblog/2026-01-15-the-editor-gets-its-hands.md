---
date: 2026-01-15
title: The editor gets its hands
commits: 54
source: reconstructed
---

> **Reconstructed from the commit log.** Nobody was keeping notes this day, so
> this post reports what changed, not what anyone was thinking. Half the day's
> commits are Lovable's automatic "Changes" and say nothing at all; the 27 that
> carry a message are the record.

The day Dramaton Studio stopped being a layout and started being a tool.

The morning was migration — moving onto Lovable's core UI, restoring the splash
screen, wiring the Phase 2 editors into `Index.tsx` so the tabs actually opened
something. Plumbing. The kind of work that leaves no trace in a screenshot.

Then the interesting part: **the editor learned to make things.** AI image
generation arrived for drops, with an edge function behind it. An ElevenLabs
voice browser went in, with preview-on-select. Actors got reference image slots,
and then — within the same day — reference image *compression* and an upload size
check, which is the shape of someone discovering that people upload enormous
photographs.

A pattern worth noticing in the commit order: `Add AI image for drops` →
`Adjust image generation edge` → `Skip base64 in image gen edge` →
`Restore improved image generation flow`. Four commits to get one feature
working. The base64 one is a tell — the first version was probably shovelling
images through as text and choking on them. That same base64 decision comes back
to bite seven months later, when the finished games turn out to be 74 MB each.

Also landed: editable prompts, a style guide button, custom poses, framing logic
for the pose UI.

And one thing that would not survive: **"Enforce pacing rest window."** The
editor was being built with a system that made you take breaks. It gets removed
in August.

**Titles seen in passing:** the game was called *USA vs MAGA* at this point, and
someone spent a commit making the title smaller.
