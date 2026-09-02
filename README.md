# Dramaton Studio

A 2D narrative game engine and editor (React + TypeScript + Vite), and the home of **Humans vs Billionaires** — a Georgist economy game built on Henry George's *Progress and Poverty*, with chapters drawn from nine centuries of billionaire power: William the Conqueror, King Leopold, Gilded Age America, the King of Chicago, Elon Musk, and **George World**, the 3-D society-builder chapter.

Engine lineage: the Narraton scene selector is the least-squares storyteller from Doug Sharp's 1986 *King of Chicago*, reborn as a first-class engine feature.

Standing rules for every Claude session in this repo are in `CLAUDE.md`. The George World entry point is `docs/george-world/STATUS.md`. (README updated 2026-09-01 17:39 -07:00 by DISPATCH.)

## What lives here

- **Dramaton Studio**, the editor: Scene, Narraton, Actor/Drop/Item/Sfx/Episode panels. Skins and Vita panels plus the **DRAM bridge** (`GET`/`PUT /bridge/game`, an AI co-editing endpoint on the dev server) are on the `narraton-editor` branch until it merges.
- **George World**, a chapter of Humans vs Billionaires: a single-file Three.js game (`georgeworld.html`) and ~90 asset studies under `docs/prototypes/aipotu/`. Start with `docs/prototypes/aipotu/README.md`. Inside George World you load a **Georgeland**; **Aipotu** is the first one.
- **The HvB theater and game files** under `public/`, played through `/theater?game=/<file>`.

## Running

```sh
npm install
npm run dev          # editor + theater at http://localhost:8080
```

- **Editor**: `http://localhost:8080/`
- **Theater**: `http://localhost:8080/theater` (loads the editor's autosaved game)
- **Play a game file directly** (does not touch the editor autosave):
  - Toy: `http://localhost:8080/theater?game=/machine-toy.json`
  - Campaign: `http://localhost:8080/theater?game=/hvb-campaign.json`
  - Art demo (4 styles): `http://localhost:8080/theater?game=/hvb-art-demo.json`
  - Era games: `/theater?game=/hvb-william.json` · `/hvb-leopold.json` · `/hvb-capone.json` · `/hvb-elon.json`
- **George World** is served separately: `python serve_nocache.py 8201` from `docs/prototypes/aipotu/` (the `georgeworld` launch config). The `studio-editor` launch config runs the editor on 8090.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (port 8080) |
| `npm test` | Vitest suite |
| `npm run docs:dram` | Regenerate `docs/DRAM_SCRIPT.md` from `src/utils/scriptDocs.ts` (the source of truth — never edit the doc directly) |
| `npm run build:machine` | Regenerate `public/machine-toy.json` from `scripts/build-machine-toy.mjs` |
| `npm run build:campaign` | Regenerate `public/hvb-campaign.json` from `scripts/build-campaign.mjs` |

## DramScript

The scripting language reference lives in [`docs/DRAM_SCRIPT.md`](docs/DRAM_SCRIPT.md). Highlights beyond the visual-novel basics:

- **Expressions** in `SET`/`IF` — arithmetic over worldState with `clamp/min/max/abs/floor/rand`
- **`TICK`** — a repeating simulation block, concurrent with dialogue
- **`BIND`** — drive stage element transforms (x, y, scale, rotation, opacity) from expressions
- **`SLIDER` / `GAUGE`** — script-declared instrument panels wired to worldState
- **`NARRATON`** — yield flow control to the storyteller: scenes carry selection keys, least-squares matched against the world state; every decision logs to the console

Fail-soft everywhere: bad expressions resolve to 0 with a console warning, never a crash.

## Branches

`main` · `gw-studies` (asset studies, FBX loader) · `gw-dialogue` (dialogue batch) · `narraton-editor` (editor lane) · `asset-foundry` (foundry studies, moving onto main). One builder edits `georgeworld.html` on `main`; every other session works in its own worktree. Details in `docs/george-world/STATUS.md`.

## Project docs

- `docs/george-world/` — George World: `STATUS.md` (entry point), `DESIGN.md`, `CHANGELOG.md`, `STUDY_PIPELINE.md`
- `docs/MACHINE_BRIEF.md` — the engine-features brief the Machine work was built from
- `docs/DRAM_SCRIPT.md` — generated DramScript reference
