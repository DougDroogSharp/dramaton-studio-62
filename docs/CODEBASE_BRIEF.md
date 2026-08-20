# Dramaton Studio — Codebase Brief for an Outside Reviewer

*Written to hand to another AI (or a human engineer) so it can be useful in one read, without spelunking.*
*Repo: `dramaton-studio-62`. ~27k lines of TypeScript across 147 files in `src/`, plus `scripts/` generators.*

---

## 1. What this is

**Dramaton** is a 2D narrative game engine + editor: a React/TypeScript/Vite single-page app. Authors write scenes in a line-based scripting language (**DramScript**); a runner executes them over a stage of sprites and backdrops.

**Humans vs Billionaires (HvB)** is the game built on it — a Georgist economy game after Henry George's *Progress and Poverty*. Six playable games ship as JSON data files in `public/`:

| file | what | scenes |
|---|---|---|
| `hvb-william.json` | William the Conqueror, 1066–1087 | 240 |
| `hvb-leopold.json` | King Leopold's Congo | 220 |
| `hvb-capone.json` | King of Chicago, 1920–31 | 218 |
| `hvb-elon.json` | Musk, the 2020s | 216 |
| `hvb-machine.json` | the economic model personified | 17 |
| `hvb-campaign.json` | nine-century campaign prototype | 107 |

The author is Doug Sharp, who designed *The King of Chicago* (Cinemaware, 1986); DramScript is a deliberate descendant of that game's scene-selection engine.

## 2. Run it

```bash
npm install
npm run dev          # editor + theater at localhost:8080
npx vitest run       # 202 tests, 23 files
npx tsc --noEmit     # typecheck
npm run docs:dram    # regenerate docs/DRAM_SCRIPT.md from the command registry
npm run docs:dram:html   # regenerate docs/dramscript-reference.html
```

Play a game directly: `localhost:8080/theater?game=/hvb-william.json`

Production builds are **theater-only** — `import.meta.env.DEV` gates the editor routes in `src/App.tsx`; `/` serves `GameLanding` in prod, `Index` (the editor) in dev.

## 3. Architecture in five files

Read these in order and you have 90% of the system:

1. **`src/utils/scriptParser.ts`** (1496 lines) — the DramScript grammar. One `parseLine()` regex cascade per command, plus block parsers for `CHOICE`, `TICK`, `RANDOM`. Exports the `ScriptCommand` discriminated union and `commandToString()` (the serializer — parser and serializer must round-trip).
2. **`src/hooks/useScriptRunner.ts`** (1284 lines) — execution. Owns all runtime state (`ScriptRunnerState`), the world-state ref, and one `executeCommand()` switch.
3. **`src/utils/expression.ts`** — tokenizer / Pratt parser / evaluator for arithmetic in `SET`/`IF`/`BIND` (`+ - * / ( )`, `clamp min max abs floor rand`).
4. **`src/components/Stage.tsx`** — renders a scene: backdrop, sprites (position/scale/rotation/opacity), instruments, buttons. Reads `elementOverrides` merged over authored elements.
5. **`src/utils/scriptDocs.ts`** — the command registry. **Single source of truth for the language**: both docs files are generated from it, and editor autocomplete derives from it.

Supporting: `src/pages/Theater.tsx` (player shell, balloons, quote cards), `src/components/theater/StageDialogueLayer.tsx` (talk/thought balloons), `src/utils/narraton.ts` (scene selector), `src/types.ts` (all data shapes).

## 4. The five core mechanisms

**World state.** One flat bag of variables (`Record<string, string|number|boolean>`) seeded from `game.info.worldState`. Lives in a **ref** (`worldStateRef`), not React state, so that `[SET a = 1]` followed by `[IF a == 1]` in the same synchronous pass sees its own write. `state.worldState` mirrors it for rendering. **This is load-bearing** — an earlier state-only version had a stale-closure bug where IF read pre-SET values.

**Flattened execution.** `flattenCommands()` compiles the command tree into a flat array of `FlatNode`s with jump targets. `IF/ELSEIF/ELSE` becomes test-nodes + unconditional jumps; `RANDOM` becomes a picker node + branch starts; `LABEL` becomes an index in a map. This exists so that a command *inside* a block can **yield** (dialogue waiting for a click, `WAIT`, `MOVE`) exactly like a top-level one — the original recursive executor fired a whole IF body in one pass and nested dialogue overwrote itself instantly.

**Yielding.** `executeCommand()` returns `false` to yield. Timed yields (`WAIT`, `MOVE`) store a continuation in `resumeAfterWaitRef` and resume themselves; user-driven yields (dialogue, choice) wait for `advance()`/`selectChoice()`. Scene changes (`SCENE`, `NARRATON`) yield *without* writing the command index, because they already reset state to index 0.

**TICK.** A per-scene `setInterval`, keyed on scene id + interval, running the tick body against the live world ref — deliberately off the `advance()` path so the simulation evolves while the player reads. Blocking commands are refused inside tick bodies.

**Narraton.** `src/utils/narraton.ts` — the 1986 scene selector, reborn. Every scene may carry metadata: a pool name, hard requirements, and target key/value pairs. On `[NARRATON pool=x]` the selector filters by pool + requirements + play history + subplot rotation, then scores survivors by normalized least squares against current world state — `sum(((current - target)/scale)^2) / weight`, lowest wins. Every decision is console-logged.

## 5. Invariants a reviewer should hold us to

- **Fail soft, always.** A bad expression evaluates to 0 and warns (`warnOnce`, deduped so a 500ms TICK can't flood). Unknown label → fall through. Missing graphic → keep current look. Unknown backdrop/anchor → warn, keep current. Scripts degrade; the theater must never crash.
- **Backward compatibility is sacred.** ~1000 authored scenes exist across six games. Any language change must leave existing scripts parsing and serializing byte-identically. New syntax is additive.
- **Parser/serializer round-trip.** `parseScript(commandsToScript(parseScript(x)))` must equal `parseScript(x)`. Tested per feature.
- **`scriptDocs.ts` is the source of truth.** Never hand-edit `docs/DRAM_SCRIPT.md` or `docs/dramscript-reference.html`; regenerate.
- **All simulation coefficients are world variables** (`c_*`), tunable from an in-game cockpit, never hardcoded constants.

## 6. Known weak spots — good places to look

Honest list; these are where an outside reviewer is most likely to find something real.

1. **Asset weight.** Games embed art as base64 data URLs inside the JSON: `hvb-william.json` is **70 MB**. This is the single worst thing in the repo. It bloats git, slows web loads, and duplicates identical sprites across scenes. Externalizing assets to files + references is the known next big refactor.
2. **`useScriptRunner.ts` is 1284 lines** with one large `executeCommand` switch and a growing set of timer refs (typewriter, wait, auto-advance, walk interval, move-start, choice timeout). Cleanup is centralized in `clearTimeouts()` — verify nothing leaks on scene change or unmount.
3. **Timing hacks.** Two places defer a state write by ~30ms to force two renders (MOVE's start-position paint, TWEEN's transition-duration-before-value). They work and are tested, but they are the kind of thing that breaks under React concurrent features.
4. **`parseLine` is a long regex cascade.** Order matters (e.g. `MOVE ... to x,y` must be tried before `MOVE ... to NAME`). Easy to break subtly.
5. **No save system.** World state, current scene, and Narraton history are runtime-only. A player closing the tab loses everything.
6. **No audio content.** BGM/AMBIENCE/SFX are implemented in the engine; no game uses them.
7. **Test coverage is uneven.** The language and runner are well covered (202 tests); the editor UI components are barely tested at all.
8. **`scripts/` generators are the real authoring surface.** The games in `public/` are build outputs of `scripts/chapters/build-*.mjs` and friends — never hand-edit the JSON. Some generators are long and repetitive.

## 7. What a review would be most useful on

In rough priority: (a) correctness of the flattened execution + yielding model, especially interactions between `GOTO`, `RANDOM`, `TICK` and choice timeouts; (b) memory/leak review of the timer refs; (c) the asset-externalization plan; (d) React re-render cost with 70 MB of data URLs in state; (e) anything in `expression.ts` that could produce NaN/Infinity and leak into rendering.

---

*Generated as an orientation doc. If anything here contradicts the code, the code wins — say so.*
