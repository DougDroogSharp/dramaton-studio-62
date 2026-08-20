# RECOVERY — start here if the session died

**For: a fresh Claude Code instance, after a crash, shutdown, or lost session.**
**Written: August 20, 2026 by Dev-Session Claude.**

Doug: paste this whole file as your first message to the new instance, or just
say *"read RECOVERY in PhrogDrop"*.

---

## Instructions for the new instance — do these in order

**1. Read the memory index first.**
`C:\Users\dougs\.claude\projects\C--Users-dougs-Dropbox-----2025-Projects--USA-VS-MAGA-App-Source-Dramaton-2-0-Git-dramaton-studio-62\memory\MEMORY.md`
It links ~17 short files holding every standing rule and decision. **Read
`working-habits.md`, `dev-queue.md`, and `phrog-mission.md` in full.** Everything
else, read when relevant. This memory survives crashes — it is the real
continuity, not the conversation.

**2. Check the mailbox.**
`C:\Users\dougs\Dropbox\Apps\PhrogDrop\To HvB AI Dev\`
Other sessions leave specs and research there. Read the first line of any file —
it states what to do with it. Anything marked **NOT FOR BUILD** is background
only.

**3. Read the last session log.**
`C:\Users\dougs\Dropbox\Apps\PhrogDrop\From HvB AI Dev\SESSION LOG — *.md`
That is the arc: what was done, why, what broke, and what is still open.

**4. Check the working tree is sane.**
```
cd "C:\Users\dougs\Dropbox\____2025 Projects\_USA VS MAGA\App Source\Dramaton 2.0 Git\dramaton-studio-62"
git status
git log --oneline -10
npx vitest run
```
Expect a clean tree and all tests passing. If the tree is dirty, the crash
interrupted work — read the diff before doing anything; do not discard it.

**5. Start the dev server.**
```
npm run dev
```
Then `http://localhost:8080` is the editor, and
`http://localhost:8080/theater?game=/hvb-william.json` plays a game.

---

## The two rules that matter most

**Ask ONLY yes/no or numbered questions.** Doug answers by voice with a hand
tremor. Composing a reply is expensive; one word is cheap. If a question cannot
be reduced to a pick, give your recommendation first and ask him to confirm it.

**One step at a time.** Do a thing, verify it, then stop and wait. Do not stack
five instructions.

---

## What this project is

**Humans vs Billionaires** — a Georgist economy game (after Henry George's
*Progress and Poverty*) built on **Dramaton**, Doug's own React/TypeScript
narrative engine. Doug Sharp designed *The King of Chicago* (Cinemaware, 1986);
this engine is its descendant, and the scene selector is literally that game's
algorithm reborn.

Both sit inside **Phrog**: a plugin system for making art, whose mission is
*"make a AAA game from a $50 cellphone; free tier fully capable, just slower."*

Six playable games, ~1,240 scenes. DramScript has 43 commands. 273 tests.

## Where everything lives

| What | Where |
|---|---|
| The code | `...\Dramaton 2.0 Git\dramaton-studio-62` (git repo) |
| Games (build OUTPUT — never hand-edit) | `public\hvb-*.json` |
| Game sources (edit THESE) | `scripts\chapters\build-*.mjs` |
| Art generators | `scripts\chapters\gen-*.mjs` → `art-demo\` |
| Language reference | `docs\DRAM_SCRIPT.md` (generated — never edit by hand) |
| Architecture + weak spots | `docs\CODEBASE_BRIEF.md` |
| Doug's writing voice | `PhrogDrop\Droog voice\Doug_Sharp_Style_Guide.txt` |
| Comm with other sessions | `PhrogDrop\To HvB AI Dev\` and `From HvB AI Dev\` |
| Secrets (gitignored, never commit) | `.env.local` — Flux + ElevenLabs keys |

## Standing rules you must not violate

- **No AI at play time.** AI generates art and voice during development; games
  ship the FILES. A player needs no key, no network, no account.
- **No likes, reactions, or follower counts.** Anywhere. Ever.
- A missing ability is an **alligator** — something a person faces, never
  something they are. Abilities and the tools granting them are **familiars**.
  Places: **pond** > **pad** > **pod**.
- **Never describe a person by a deficit** in code, copy, or docs.
- A unit of play is a **scene**. "Episode" is a separate data type that groups
  scenes into a release. Do not rename either.
- **Sourcing discipline:** verbatim quotes stay verbatim; disputed attributions
  are labelled disputed. Say "reported", "argued", "unproven" where true.
- **All game prose in Doug's voice** — read the Dialoguicon first.
- **Docs Doug asks for** go in `docs/` AND get copied to
  `PhrogDrop\From HvB AI Dev\`, signed.
- **The pond is NOT deployed** until Doug says so, after "much thought and
  testing".

## Useful commands

```
npm run dev            editor + theater on :8080
npx vitest run         273 tests
npx tsc --noEmit       typecheck
npm run docs:all       regenerate docs AND sync them to Dropbox
npm run build:pod      the editor build   -> dist-pod/
npm run build:games    theater only       -> dist-games/
node scripts/chapters/build-william.mjs   rebuild one game
```

## What was in flight when this was written

See `dev-queue.md` in memory for the live list. At time of writing, top of
queue: **dual-needle WEALTH gauge**, then **wiring the era gauge art into the
meter panel**, then **making scanning reach every capability (the 1-bit
floor)**, then **phrogable.com with a dev blog**.

Awaiting one word from Doug: the "Droog" ElevenLabs voice — the API key lacks
`voices_read`, so custom voices cannot be listed. Either widen the key or get
the voice ID.

## Known weak spots — do not be surprised by these

- **Game files are huge** (William is 74 MB) because art is base64 inside the
  JSON. The Phrog mission makes fixing this a blocker, not a nicety.
- **No save system.** World state and Narraton history are runtime-only.
- **Generation calls are synchronous** — fine on a desktop, fatal on a cheap
  phone.
- **The 1-bit floor is not met.** Scanning reaches choices, not the whole
  interface.
- **`useScriptRunner.ts` is ~1,400 lines** with many timer refs; cleanup is
  centralised in `clearTimeouts()`.
- Two places deliberately defer a state write ~30ms to force two renders. They
  are load-bearing and tested. Do not "simplify" them.

## If the tree is broken

Everything is committed frequently. `git log --oneline` shows the last good
state; `git stash` preserves uncommitted work rather than discarding it. Never
force-push, never discard Doug's uncommitted changes without asking.
