# THE MACHINE on DRAMATON — Handoff Brief
## For the Claude Code thread working in dramaton-studio-62
**Prepared with Doug Sharp · August 2026**

---

## 0. CONTEXT — READ FIRST

Doug is building **The Machine**: a standalone Georgist economy toy/game for the **USA vs MAGA** project (launching Presidents' Day 2027 window; manifesto: "Who Wins? Billionaires or Humans?"). It visualizes Henry George's *Progress and Poverty* as a 2D animated contraption — billionaires at top, humans at bottom, rent siphons, a speculation brake, flare-ups, and a Single Tax lever. It must run as a Dramaton Studio title.

Before coding, read alongside this brief:
- `docs/DRAM_SCRIPT.md` (the 20-command language, auto-generated — edit `src/utils/scriptDocs.ts`, never the doc)
- The salvage doc: https://droogworks.netlify.app/dramaton-2-salvage.md (2.0 ideas worth re-importing: AGENCY/WITNESS scenes, item grammar, SFX taxonomy, dieselpunk palette)
- Trunk wins over salvage where they disagree.

**Design lineage matters.** Doug's 1986 King of Chicago used a storyteller agent selecting episodes by least-squares matching of episode keys against world variables. Dramaton Studio currently lacks this — flow is hard-branched. Part of this work is restoring the 1986 selector as a first-class engine feature. Doug hates pick-a-path plotting; the engine should surprise its own author.

---

## 1. VERIFIED CURRENT ENGINE STATE (from DRAM_SCRIPT.md @ 4d3a264)

The engine has 20 implemented commands. Relevant capabilities:

```
worldState:   [SET var = literal]  — persists across scenes; string|number|boolean
conditionals: [IF var op value] ... [ENDIF]  — ops: == != > < >= <=
flow:         [SCENE id] hard jump; [CHOICE] with "text" -> target_scene options
stage:        [ENTER id at x,y] [EXIT id] [MOVE id to x,y over dur] [POSE id pose= expression=]
effects:      [EFFECT sfx_id on target] [CLEAR_EFFECT sfx_id from target]
buttons:      [BUTTON id] [HIDE_BUTTON id]  — buttons can navigate scenes, play sounds, OPEN URLS
audio:        [BGM] [AMBIENCE] [SFX]
timing:       [WAIT duration]
```

Already-usable for The Machine with zero engine work: flare-ups via EFFECT (electric/glow/pulse per salvage SFX taxonomy), Single Tax lever as a BUTTON, activism links via BUTTON-opens-URL, choice moments via CHOICE, poses for human states (add customPoses: `Overworked`, `FlareUp`).

**First investigation task:** locate and read (a) the worldState store implementation, (b) `src/utils/scriptParser.ts`, (c) the script runner, (d) stage element type definitions and renderer. Confirm whether salvage-doc features (requiredWorldState scene gating, item system, pose×expression×angle matrix) survived into the trunk. Report findings before building.

---

## 2. ENGINE ADDITIONS — FIVE FEATURES, PRIORITY ORDER

Each is general-purpose (benefits all future Dramaton titles), not Machine-specific hackery.

### 2.1 EXPRESSIONS in SET  *(prerequisite for everything)*
Extend `[SET]` to evaluate arithmetic with variable references:
```
[SET product = laborForce * productivity]
[SET wages = product - rent - interest]
[SET rent = clamp(product * rentShare, 0, product)]
```
Grammar: `+ - * / ( )`, numeric literals, variable names, and a tiny function set: `clamp(x,min,max)`, `min`, `max`, `abs`, `floor`, `rand()` (0–1). Type errors resolve to 0 with a console warning, never a crash. Extend IF to allow expressions on both sides while keeping the current simple form working.

### 2.2 TICK — the simulation heartbeat
A per-scene (or per-game) repeating block:
```
[TICK 500ms]
  ...any commands, typically SETs and IFs...
[/TICK]
```
Runs its body every interval while the scene is active, concurrent with (not blocking) normal script/dialogue flow. One TICK block active per scene is sufficient. This is the economy's pulse.

### 2.3 BIND — variable-driven stage
Live-bind a stage element property to an expression; re-evaluated whenever referenced variables change (or each tick):
```
[BIND siphon_arm.rotation to rent * 0.9]
[BIND reservoir.scale to 0.5 + hoard/200]
[BIND margin_floor.y to 80 - marginHeight]
[BIND human_3.x to 20 + wages/4]
```
Bindable properties: x, y, scale, rotation, opacity (whatever the StageElement type already carries — check renderer first). `[UNBIND element.property]` releases. This is the Spine-style "attached parts" ask translated into Dramaton: the machine rig is StageElements whose transforms are driven by worldState.

### 2.4 SLIDER + GAUGE — the instrument panel
Two new interactive/display stage elements, scriptable like buttons:
```
[SLIDER greed at 85,20 min=0 max=100 label="GREED"]
[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]
[HIDE_SLIDER greed]  [HIDE_GAUGE wages]
```
SLIDER writes its worldState variable continuously as the player drags. GAUGE displays one read-only. Style both per the dieselpunk cockpit (see §6) — brass dials on diesel-black panels, not HTML range inputs floating in space.

### 2.5 NARRATON — the 1986 selector, reborn
Scene metadata gains optional selection keys, and a new command yields flow control to the selector:
```
[NARRATON pool=main]
```
Scene metadata (per scene, in the editor) — flat fields on the Scene, the one shape since 2026-09-02 (the older nested `narraton: {…}` object is lifted by the loader and never written):
```
pool: "main",                                       // which [NARRATON pool=x] draws this scene
key: { wages: 20, education: 30, flareUps: 4 },     // target values, least-squares matched
keyScale: { flareUps: 6 },                          // a key's range when it is not 0-100 (default 100)
requires: [ { variable: "era", operator: "==", value: 2 } ],  // hard gates
repeatable: false,                                  // default: plays once
weight: 1.0,                                        // score divides by this (bias)
act: "MIDDLE",                                      // story-act gate against the `act` world variable (soft)
phase: "BEGINNING",                                 // position in the subplot's bag
subplotId: "resistance_rises"                       // the Subplot (owned bag) it belongs to
```
Selection algorithm (King of Chicago, verbatim spirit; `src/utils/narratonDirector.ts`): filter the pool by `requires`, by repeatable/already-played, by subplot phase order (MIDDLE waits for BEGINNING) and the soft act gate; among survivors compute Σ((currentVar − keyTarget) × 100 / scale)² over each scene's keys (a miss of more than half a key's scale excludes the scene); divide by weight, add a rotation penalty if the scene's subplot just played; pick the lowest score, ties random; transition to it. 4–20 candidates is the expected healthy pool size. Log every selection decision to console — Doug wants narrative breakpoints and story-space visibility (his '95 paper's debugging wishlist).

---

## 3. THE MACHINE — worldState SCHEMA

```
# Player-set (SLIDERs)
greed         0-100   billionaire extraction aggressiveness
education     0-100   humans' awareness; propaganda resistance
repression    0-100   suppression spending
regulation    0-100   friction on siphons and speculation
govStrength   0-100   enforcement of regulation; corroded by prestige
hierarchy     0-100   master dial: 100=full hierarchy, 0=free-and-equal
speculation   0-100   land withheld from use (billionaire-set in auto mode)

# Simulation-computed (GAUGEs, BINDs)
marginHeight  0-100   the margin of production (the floor)
product       calc    laborForce * productivity * (marginHeight/100)
rent          calc    grows as marginHeight falls; captures progress
wages         calc    product - rent - interest, floored at survival
interest      calc    moves WITH wages (George's law), never against
hoard         0-∞     billionaire reservoir
prestige      0-100   insulation shell thickness
flareUps      count   humans past poverty/overwork threshold
crisis        bool    speculation-triggered depression state
era           1|2|3   campaign era (conquest/extraction/simulation)
singleTax     bool    the lever
```

## 4. GEORGIST TICK RULES (pseudocode → DramScript)

Faithful to the theory. Core causal chain per tick:

```
# Progress raises productivity slowly
productivity += 0.1 * (1 + education/200)

# Speculation and greed LOWER the margin (the Georgist engine)
marginHeight = 100 - (speculation * 0.5) - (greed * 0.3) + (regulation * 0.2) + (singleTax ? 30 : 0)
marginHeight = clamp(marginHeight, 5, 100)

# Product of labor (wages' true source — anti-wage-fund)
product = laborForce * productivity * (marginHeight/100)

# Rent captures the gap between best and margin; single tax redirects it
rent = product * (1 - marginHeight/100) * (greed/50)
if singleTax: publicFund += rent * 0.9 ; rent *= 0.1

# Wages and interest move together, squeezed by rent
wages    = max(product - rent, survivalFloor)
interest = wages * 0.3

# Hoard and prestige
hoard += rent - repressionCost - prestigeSpend
prestige += prestigeSpend/10 ; prestige -= education * 0.05   # education corrodes the shell
govStrength -= prestige * 0.02                                 # prestige corrodes government

# Flare-ups: poverty or overwork past threshold; hierarchy raises the threshold
flareThreshold = 20 + hierarchy * 0.3 - education * 0.2
flareUps = count(humans where wages < flareThreshold or overwork > 80)

# Crisis: speculative prices outrun production
if speculation > 70 and rand() < 0.05: crisis = true   # machine shakes, product *= 0.5

# Public fund (single tax on) raises the margin and education
if singleTax: marginHeight += publicFund * 0.01 ; education += publicFund * 0.005
```

Numbers are starting guesses — the whole point of the toy architecture is tunability. Expose every coefficient as a worldState variable so Doug can tune live with hidden sliders in a debug scene.

## 5. STAGE COMPOSITION (the rig)

Elements composed on one main stage, dieselpunk-styled, transforms BINDed:

```
billionaire tier (top):    hoard reservoir (scale←hoard), prestige shell (opacity/scale←prestige),
                           generic billionaire actors, stockholder modules (attachable)
middle mechanism:          production wheel (rotation speed←product), rent siphon arm (rotation←rent),
                           speculation brake (position←speculation), wage pipe (scale.width←wages),
                           interest pipe (scale.width←interest), margin floor (y←marginHeight)
human tier (bottom):       6-10 human actors; poses Idle/Overworked/FlareUp/Dead;
                           [EFFECT electric] on flare-up, [EFFECT shake on stage] on crisis
instrument panel (right):  SLIDERs for player variables, GAUGEs for computed ones,
                           the SINGLE TAX lever (large BUTTON), era indicator
witness palette:           CHEER/BOO/SILENCE/WALK AWAY buttons during WITNESS scenes (from 2.0 salvage)
```

## 6. AESTHETIC

Dieselpunk cockpit per salvage doc — the analog instrument panel telling stories: diesel-black `#0a0908`, panel `#1e1c1a`, gold `#cba96d` (the hoard renders in this), rust `#a64d2d`, steel `#c0cfda`, paper `#dccfbb`; Courier New mono + Impact; CRT flicker + scanlines for era-3 media scenes. The Machine should look like it was riveted together in 1936 to explain 2026.

## 7. CONTENT STRUCTURE (after engine work)

Toy mode: one main scene, TICK running, full panel exposed, Narraton pool of short WITNESS commentary scenes keyed to economic states (crisis scenes, flare-up scenes, complacency scenes, victory scenes).

Campaign — "How the Billionaires Gained Power," three eras as Narraton pools:
Era 1 CONQUEST (William, 1066): violence→property→rent; loot distribution buys barons. Era 2 EXTRACTION (Jobs/Foxconn): real product + offshore extraction; nets as overflow valves. Era 3 SIMULATION (Musk): prestige gameplay; outsourced-gamer-cred scenes (link Doug's comic: PLACEHOLDER URL). Scripted scenes are Doug's — massive-scriptwriting school; engine selects, Doug writes.

Win/lose: COLLAPSE (Book X / Rome) vs RECONSTITUTION (single tax + education high → victory screen displays the manifesto's Ten Litmus Tests).

## 8. BUILD ORDER

1. Investigate & report (§1 files; confirm salvage survivals)
2. Expressions in SET/IF  →  3. TICK  →  4. BIND  →  5. SLIDER/GAUGE  →  6. Narraton
7. Machine toy scene with placeholder art (rectangles fine; BINDs proven)
8. Tuning pass with Doug (all coefficients live)
9. Regenerate DRAM_SCRIPT.md (`npm run docs:dram`) after every command addition — scriptDocs.ts is the source of truth
10. Campaign scaffolding

Each step lands as a separate commit with the doc regenerated. Keep the dev server workflow at localhost:8080; Doug tests in Theater mode.

---

*Engine lineage: the least-squares selector is 1986's Narraton. The thought balloons are Pinky's. The economics are 1879's. Only the fascism is current.*
