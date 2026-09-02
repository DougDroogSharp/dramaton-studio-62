# Dramaton Studio — Codebase Brief for an Outside Reviewer

*Written to hand to another AI (or a human engineer) so it can be useful in one read, without spelunking.*

**Provenance, and why you should care.** Every figure below was measured on
20 Aug 2026 at commit `145666f`, not remembered. An earlier version of this
brief quoted numbers that were months stale and told the reader to typecheck
with a command that checks nothing (see §2). A reviewer was handed that brief
plus a GitHub URL pointing at a tree 112 commits behind the working copy, and
correctly reported that half the engine did not exist. **Confirm you are
looking at the right code before you read anything else:**

```bash
git log --oneline -1              # expect 145666f or later
wc -l src/hooks/useScriptRunner.ts  # expect ~1474
ls src/utils/expression.ts        # must exist
```

If those disagree with this document, you have a different tree. Stop and say so.

---

## 1. What this is

**Dramaton** is a 2D narrative game engine + editor: a React/TypeScript/Vite
single-page app. Authors write scenes in a line-based scripting language
(**DramScript**); a runner executes them over a stage of sprites and backdrops.
~30,200 lines of TypeScript across 168 files in `src/`, plus `scripts/` generators.

**Humans vs Billionaires (HvB)** is the game built on it — a Georgist economy
game after Henry George's *Progress and Poverty*. The games ship as JSON data
files in `public/`:

| file | what | scenes | size |
|---|---|---|---|
| `hvb-william.json` | William the Conqueror, 1066–1087 | 322 | 75 MB |
| `hvb-leopold.json` | King Leopold's Congo | 310 | 27 MB |
| `hvb-elon.json` | Musk, the 2020s | 290 | 21 MB |
| `hvb-capone.json` | King of Chicago, 1920–31 | 284 | 17 MB |
| `hvb-campaign.json` | nine-century campaign prototype | 107 | 172 KB |
| `hvb-machine.json` | the economic model personified | 17 | 8 MB |
| `hvb-art-demo.json` | art style demo | 5 | 14 MB |

`public/` totals **160 MB**. See §6.1.

The author is Doug Sharp, who designed *The King of Chicago* (Cinemaware, 1986);
DramScript is a deliberate descendant of that game's scene-selection engine.

## 2. Run it

```bash
npm install
npm run dev          # editor + theater at localhost:8080
npm run test         # 280 tests, 30 files — all green at 145666f
npm run typecheck    # tsc -b --force  <- THE REAL TYPECHECK
npm run verify       # typecheck + tests
npm run docs:dram    # regenerate docs/DRAM_SCRIPT.md from the command registry
```

**Do not use `tsc --noEmit`.** `tsconfig.json` sets `"files": []` with project
references, so `tsc --noEmit` compiles **zero files** and always exits 0. This
repo shipped two "used but never imported" components behind that false green —
one of which blanked the entire app. `tsc -b` is the only invocation that
checks anything.

**And `tsc -b` passing means less than it sounds like.** `tsconfig.json` sets
`strictNullChecks: false` and `noImplicitAny: false`; `tsconfig.app.json` sets
`strict: false`. Turning strict mode on is unexplored territory and expected to
surface a lot at once.

Play a game directly: `localhost:8080/theater?game=/hvb-william.json`

Editor routes are gated by `isEditorBuild` in `src/App.tsx`
(`import.meta.env.DEV || import.meta.env.MODE === 'pod'`). Three build targets:
`build:pod` → `dist-pod/` (editor), `build:games` → `dist-games/` (theater only),
`build` → `dist/` (theater only).

## 3. Architecture in five files

Read these in order and you have 90% of the system:

1. **`src/utils/scriptParser.ts`** (1,597 lines) — the DramScript grammar. One
   `parseLine()` regex cascade per command, plus block parsers for `CHOICE`,
   `TICK`, `RANDOM`. Exports the `ScriptCommand` discriminated union and
   `commandToString()` (parser and serializer must round-trip).
2. **`src/hooks/useScriptRunner.ts`** (1,474 lines) — execution. Owns all runtime
   state (`ScriptRunnerState`), the world-state ref, and one `executeCommand()` switch.
3. **`src/utils/expression.ts`** (363 lines) — tokenizer / Pratt parser / evaluator
   for arithmetic in `SET`/`IF`/`BIND` (`+ - * / ( )`, `clamp min max abs floor rand`).
4. **`src/components/Stage.tsx`** — renders a scene: backdrop, sprites
   (position/scale/rotation/opacity), instruments, buttons. Reads
   `elementOverrides` merged over authored elements.
5. **`src/utils/scriptDocs.ts`** — the command registry. **Single source of truth
   for the language**: both docs files are generated from it, and editor
   autocomplete derives from it. 41 syntax entries; `docs/DRAM_SCRIPT.md` tables 39
   commands.

Supporting: `src/pages/Theater.tsx` (player shell, balloons, quote cards),
`src/components/theater/StageConsole.tsx` (the fixed cabinet: stage + gauges +
narration plate), `src/utils/narratonDirector.ts` (scene selector), `src/types.ts`.

## 4. The five core mechanisms

**World state.** One flat bag of variables (`Record<string, string|number|boolean>`)
seeded from `game.info.worldState`. Lives in a **ref** (`worldStateRef`), not React
state, so `[SET a = 1]` followed by `[IF a == 1]` in the same synchronous pass sees
its own write. `state.worldState` mirrors it for rendering. **Load-bearing** — an
earlier state-only version had a stale-closure bug where IF read pre-SET values.

**Flattened execution.** `flattenCommands()` compiles the command tree into a flat
array of `FlatNode`s with jump targets. `IF/ELSEIF/ELSE` becomes test-nodes +
unconditional jumps; `RANDOM` becomes a picker node + branch starts; `LABEL` becomes
an index in a map. This exists so a command *inside* a block can **yield** (dialogue
waiting for a click, `WAIT`, `MOVE`) exactly like a top-level one — the original
recursive executor fired a whole IF body in one pass, discarded the nested return
value, and let nested dialogue overwrite itself instantly.

**Yielding.** `executeCommand()` returns `false` to yield. Timed yields (`WAIT`,
`MOVE`) store a continuation in `resumeAfterWaitRef` and resume themselves;
user-driven yields (dialogue, choice) wait for `advance()`/`selectChoice()`. Scene
changes (`SCENE`, `NARRATON`) yield *without* writing the command index, because
they already reset state to index 0.

**TICK.** A per-scene `setInterval`, keyed on scene id + interval, running the tick
body against the live world ref — deliberately off the `advance()` path so the
simulation evolves while the player reads. Blocking commands are refused inside
tick bodies.

**Narraton.** `src/utils/narratonDirector.ts` — the 1986 scene selector, reborn, and
the ONE reader of a scene's selection metadata (flat fields on `Scene`: `pool`, `key`,
`keyScale`, `requires`, `repeatable`, `weight`, `act`, `phase`, `subplotId`; unified
2026-09-02, the older nested `scene.narraton` object is lifted by `migrateGameData`).
On `[NARRATON pool=x]` the selector filters by pool + requirements + play history +
subplot phase order + the soft act gate, then scores survivors by normalized least
squares against current world state — `sum(((current - target) * 100 / scale)^2) /
weight` plus a rotation penalty for the subplot that just played, lowest wins, a miss
of more than half a key's scale excludes. The editor's Narraton tab and test mode read
the same function. Every decision is console-logged.

## 5. Invariants a reviewer should hold us to

- **Fail soft, always.** A bad expression evaluates to 0 and warns (`warnOnce`,
  deduped so a 500 ms TICK can't flood). Unknown label → fall through. Missing
  graphic → keep current look. Scripts degrade; the theater must never crash.
- **Backward compatibility is sacred.** ~1,335 authored scenes exist across the
  games. Any language change must leave existing scripts parsing and serializing
  byte-identically. New syntax is additive.
- **Parser/serializer round-trip.** `parseScript(commandsToScript(parseScript(x)))`
  must equal `parseScript(x)`. Tested per feature.
- **`scriptDocs.ts` is the source of truth.** Never hand-edit `docs/DRAM_SCRIPT.md`
  or `docs/dramscript-reference.html`; regenerate.
- **All simulation coefficients are world variables** (`c_*`), tunable from an
  in-game cockpit, never hardcoded constants.
- **No AI at runtime.** The games never call a model while playing. AI is a
  production tool; voice and art are baked to files before shipping.

## 6. Known weak spots — good places to look

Honest list. Items 2 and 3 were found by an outside reviewer on an older tree and
are still unfixed here; item 4 was found the same day this brief was corrected.

1. **Asset weight.** Games embed art as base64 data URLs inside the JSON:
   `hvb-william.json` is **75 MB**, `public/` totals **160 MB**. Bloats git, slows
   loads, duplicates identical sprites. `imageRef` (a graphic referencing another
   graphic's image, hydrated in `migrateGameData`) cut `hvb-machine.json` from
   18.2 MB to 8.0 MB; the same treatment has not been applied elsewhere.
   Externalizing assets to files + references is the known next big refactor.
   *Not currently urgent: the low-end-phone target is a two-year goal.*
2. **Audio is fire-and-forget.** `src/pages/Theater.tsx:127` and `:193` do
   `new Audio(url); audio.play()` with no ref, no `.pause()`, and no cleanup on
   scene change, unmount, or mute-after-start. BGM from a previous scene keeps
   playing; repeated plays stack. **Unfixed.**
3. **TypeScript strictness is off** (see §2). `tsc -b` green is a weaker signal
   than it appears.
4. **Lint is installed and wired to nothing.** `eslint.config.js` enables
   `react-hooks/rules-of-hooks`, which statically catches conditional hooks. On
   20 Aug a `useMemo` below four early returns in `Theater.tsx` crashed the app
   on the START button — the rule would have caught it, but `npm run lint`
   reports 51 pre-existing errors and is not part of `npm run verify`, so nobody
   runs it. **Assume this pattern repeats: look for checks that exist but are not
   in the path.**
5. **`useScriptRunner.ts` is 1,474 lines** with one large `executeCommand` switch
   and many timer refs (typewriter, wait, auto-advance, walk interval, move-start,
   choice timeout, NARRATE expiry, a Map of ANIMATE intervals). Cleanup is
   centralized in `clearTimeouts()` — verify nothing leaks on scene change,
   unmount, or rapid navigation.
6. **Timing hacks.** Two places defer a state write by ~30 ms to force two renders
   (MOVE's start-position paint, TWEEN's transition-duration-before-value). They
   work and are tested, but are the kind of thing that breaks under React
   concurrent features or StrictMode double-invoke.
7. **`parseLine` is a long regex cascade.** Order matters (e.g. `MOVE ... to x,y`
   must be tried before `MOVE ... to NAME`). Easy to break subtly. Unclosed `IF`
   is promoted to top-level at EOF and `ENDIF` with an empty stack is a no-op —
   convenient for the editor, dangerous at runtime.
8. **No save system.** World state, current scene, and Narraton history are
   runtime-only. Closing the tab loses everything.
9. **Test coverage is uneven.** The language and runner are well covered (280
   tests, 30 files); editor UI components are barely tested at all. Judge whether
   those 280 actually constrain behaviour or assert on mocks.
10. **Accessibility is a stated structural goal, partly met.** There is an
    `sr-only aria-live` region in `Theater.tsx`. Scanning reaches **CHOICES only** —
    settings, toggles, and the end card are unreachable with one switch. The target
    is a game fully playable on ONE BIT of input and by a blind player.
11. **`scripts/` generators are the real authoring surface.** The games in `public/`
    are build outputs of `scripts/chapters/build-*.mjs` — never hand-edit the JSON.

## 7. What a review would be most useful on

In rough priority: (a) correctness of the flattened execution + yielding model,
especially interactions between `GOTO` (backward jumps), `RANDOM`, `TICK`, and
choice timeouts; (b) leak review of the timer refs and the unowned `Audio` objects;
(c) whether the 280 tests constrain anything; (d) anything in `expression.ts` that
could produce NaN/Infinity and leak into rendering (element x/y, scale, opacity,
gauge angle); (e) whether the accessibility architecture can reach one-bit input
or is structurally in the way.

---

*If anything here contradicts the code, the code wins — say so. That has already
happened once and it was the most useful thing a reviewer did.*
