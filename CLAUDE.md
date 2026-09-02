# Standing rules for every Claude session in this repo

Filed 2026-09-01 17:39 (-07:00) by DISPATCH (decision 11). Terse on purpose: this loads into every session. Facts about versions, branches and servers live in `docs/george-world/STATUS.md`, not here.

## Doug's protocol
- **One instruction at a time.** When Doug must do something himself, give exactly one step, wait for his confirmation, then the next. Keep replies short; he is often on his phone or dictating.
- **Decisions as numbered choices.** One decision per message: one line of context, numbered options, each option with its own inline snippet of discussion directly under it, then `Recommend: N` with one line of why (or say why no recommendation is possible). He answers with a digit.
- **Bold, never italics.** His client renders italics as tiny script.
- **Real timestamps.** Every doc, message, mailbox entry and "Filed" line carries date AND time from `Get-Date` (`Get-Date -Format "yyyy-MM-dd HH:mm zzz"`). Never guess a time.
- Every dev tool and prototype shows its version number beside its on-screen title.

## Repo rules
- **One builder.** GW BUILDER (the HvM Graphics session) is the only session that edits `docs/prototypes/aipotu/georgeworld.html`, in the main checkout `C:\Users\dougs\dramaton-studio-62`.
- **Every other session works in its own worktree** (`git worktree add`) on its own branch and hands work back as a branch; merges go through the builder. One session per folder.
- **One thing per commit.** Stage files by name; never `git add -A`. No double quotes inside commit messages on Windows (use a single-quoted here-string or plain text). Never `push --force`. Commit and push only when Doug asks.
- **Version by title.** The George World version is the `<title>` of `georgeworld.html`; one version per commit, subject `George World vX.YY - one line`. Never hot-edit the served file without bumping the title (the page reloads on a title mismatch).
- **STATUS.md at every version commit.** The builder-lock holder rewrites `docs/george-world/STATUS.md` before the mailbox note; the note cites the STATUS row.
- Check for `BLOCK--<scope>--by-<who>.md` files before touching any shared surface (mailbox, shared repo files, merges). Only the blocker or Doug releases a block.

## Project rules
- **No fishing mechanic** anywhere in George World; fish are decorative. Doug is vegetarian. Check new dialogue for fishing references too.
- **No 3-D skin editor.** Dramaton imports finished skins only (VRoid, Blender, Mixamo, or commissioned); never build modeling, rigging or viewport UI. AI-authored `AnimationClip` JSON through the bridge is fine (data, not a UI).
- **Dramaton save format.** George World data serializes to the Dramaton file shape (`public/hvb-william.json`): flat numeric `info.worldState`, `actors`, `scenes` as Dramscript, `drops`, `episodes`, history as `worldState` frames. Never a bespoke format. Mapping comment near line 2496 of `georgeworld.html`.
- **Georgeotron** is the one name for the machine, page, bench and parts kit. Georgeomat is retired; old mailbox and changelog entries stay as written.
- **Georgeland rev stamp.** On every save of `georgeland2_study.html` (and any map study that carries one) bump `REV` by 1 and set `REV_BUILT` from the real clock; the stamp renders on-page and in captures.
- **Vitas are armature-driven glTF** going forward, animated with `AnimationMixer` clips. The procedural pose rigs are prototypes; do not start new long hand-animation work on them.
- **Stage registration + redeploy.** Every new `*_study.html` gets an `<option>` in `docs/prototypes/aipotu/stage.html`, and whoever registers it redeploys `https://dramaton-stage.netlify.app` from `C:\Users\dougs\dramaton-stage-deploy` in the same step. Dropbox `models/` is retired.
- Speech balloons in George World are DOM overlays, never sprites.
- Name hierarchy: Humans vs Billionaires (game) > George World (chapter) > Georgeland (parcel; Aipotu is the first) > run (one playthrough).
- This repo is George World + the Dramaton editor. HvB design material lives in its own home, not here.

## Pointers
- Read `docs/george-world/STATUS.md` first, then `docs/prototypes/aipotu/README.md`, `docs/george-world/DESIGN.md` and `docs/george-world/STUDY_PIPELINE.md` (the last two are moving in from Dropbox `Consolidated/Projects/AIPOTU/`; until they land, read the Dropbox copies).
- Study style contract: `docs/prototypes/aipotu/STYLE.md`. Editor scripting: `docs/DRAM_SCRIPT.md` (generated; edit `src/utils/scriptDocs.ts`). Bridge: `docs/DRAM_BRIDGE.md` on the `narraton-editor` branch.
- Canonical com protocol: `C:\Users\dougs\Dropbox\Droog Claude Projects\HvB Comm\COM_PROTOCOL.md`. "com" is handled by the project skill `.claude/skills/com/SKILL.md`; the append-only mailbox is Dropbox `Consolidated/Projects/AIPOTU/MAILBOX.md`.
- Lane roster: DESIGN CHAT · DISPATCH · GW BUILDER · GW STUDIES · EDITOR · HVB · COWORK. Sign with the seat name.
- Every response that changes an asset or the stage ends with the stage URL (`http://10.0.0.137:8201/stage.html` phone · `http://localhost:8201/stage.html` laptop).
