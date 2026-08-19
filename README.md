# Dramaton Studio

A 2D narrative game engine and editor (React + TypeScript + Vite), and the home of **Humans vs Billionaires** — a Georgist economy game built on Henry George's *Progress and Poverty*, with chapters drawn from nine centuries of billionaire power: William the Conqueror, King Leopold, Gilded Age America, the King of Chicago, and Elon Musk.

Engine lineage: the Narraton scene selector is the least-squares storyteller from Doug Sharp's 1986 *King of Chicago*, reborn as a first-class engine feature.

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

## Project docs

- `docs/MACHINE_BRIEF.md` — the engine-features brief the Machine work was built from
