# DESIGN ADDENDUM 01 — Personified Machine, Ledger, and Quote System
## For Claude Code · Humans vs Billionaires · supplements docs/MACHINE_BRIEF.md
**Status: APPROVED design. Implement after the five engine features land. Where this conflicts with MACHINE_BRIEF.md's stage composition (§5), THIS document wins — the abstract cog-machine is superseded by personified actors.**

---

## 1. THE CAST — five actors replace the abstract machine parts

All actors use the existing pose × expression × angle matrix. Placeholder art: labeled colored rectangles with a simple face (two dots + mouth line) are fine until real sprites arrive.

| Actor ID | Role | Core stat (worldState) | Range |
|---|---|---|---|
| `worker` | produces all value; cranks the production wheel | `heat` (hunger+exhaustion+anger fused) | 0–100 |
| `capitalist` | holds the siphon; accumulates | `squeeze` (extraction aggressiveness) | 0–100 |
| `government` | referee | `spine` (independence from capitalist) | 0–100 |
| `military` | armed puppet | `aim` (0 = outward/defense, 100 = inward/at workers) | 0–100 |
| `consumer` | **SAME actor as `worker`, different hat** — see §2 | uses `heat`, plus `trust` | — |

Player-facing controls (SLIDERs): `education` (0–100), `squeeze` (settable in sandbox mode), `spine` (settable in sandbox mode). The **SINGLE TAX lever** is a BUTTON toggling `singleTax` (bool).

## 2. THE HAT-SWAP MECHANIC (core visual thesis)

Worker and Consumer are one human shown in two roles. Implementation: one actor with two costume states (poses or a `hat` attachment layer): `hat=work` and `hat=consume`. During each economic cycle the actor physically walks from the production side of the stage to the shop side and swaps hats, then buys back the product at the capitalist's price.

- `trust` (0–100) = how firmly the consumer hat stays on. Propaganda spending (capitalist action) raises trust; `education` lowers it.
- **Recognition event:** when `education > 60 AND heat > 70`, play the actor's `recognition` beat: stops mid-stage, holds both hats, looks at each. This is the flare-up trigger. Fire `[EFFECT glow on worker]` and make the recognition state available to Narraton as `recognition = true`.

## 3. THE LEDGER — numbered gauges with visible formulas

Seven GAUGEs across the top of stage, dieselpunk-styled, each showing its live numeric value. All are worldState variables updated in the TICK. Starting formulas (all coefficients exposed as worldState vars per brief rules):

```
health     = clamp(health + 0.1*(50 - squeeze) * 0.02, 0, 100)        # lags squeeze; drifts
crime      = clamp(heat * (1 - education/100), 0, 100)
hoard      = hoard + squeeze * productionOutput * 0.01 - repressionCost - propagandaCost
shared     = clamp(100 - squeeze - rentBurden, 0, 100)
climate    = clamp(climate - squeeze*0.01 + regulation*0.005, 0, 100) # also tints backdrop, §5
population = derived from worker actor count, §5
innovation = clamp((health/100) * (education/100) * 100, 0, 100)
trust      = clamp(trust + propagandaCost*0.05 - education*0.03, 0, 100)
```

WEALTH renders as ONE gauge with TWO needles (`hoard` scaled to 0–100, and `shared`) — the visible gap between needles is the point. If dual-needle gauges exceed current GAUGE capability, render as two adjacent gauges labeled HOARD / SHARED and flag the dual-needle version as a follow-up.

**Truth-window:** a toggleable debug overlay (BUTTON `truth`) listing each gauge's formula as text with live values substituted, e.g. `CRIME 42 = HEAT 70 × (1 − EDUCATION 40/100)`. Plain monospace panel; no styling effort needed v1.

## 4. HEAT / SPINE / AIM CAUSAL CHAIN (TICK rules)

```
heat  = clamp(heat + squeeze*0.05 - shared*0.03 - (singleTax ? 2 : 0), 0, 100)
spine = clamp(spine - hoard*0.005 + education*0.02, 0, 100)      # money corrodes, awareness restores
aim   = clamp(100 - spine, 0, 100)                                # low-spine gov turns the rifle inward
crisisCheck: if squeeze > 80 and rand() < 0.05 → crisis = true; production halved for N ticks; [EFFECT shake on stage]
```

Government collusion visual: when `spine < 30`, play `government` costume change (jersey recolors toward capitalist's palette) and run the coin-pass beat: capitalist → government → military (three-actor scripted sequence, repeatable WITNESS scene).

## 5. EXPRESSION & POSE GRAMMAR (asset/state list)

Add via customPoses/customExpressions. Map states to worldState thresholds in TICK (or scene logic):

- `worker`: expressions weary (heat>40) → angry (heat>70); poses: cranking (default), signHoisting (recognition + heat>70 + education>50), shackled (wage floor at zero — slavery band per brief §VI), standingTall (singleTax on + shared>60). Walking offstage: when heat>85 for sustained ticks, one worker actor EXITs (emigration) — this drives `population`.
- `capitalist`: gleeful (hoard rising), worried (education rising — NOT heat rising; he fears teachers, not mobs), panicked (prestige shell cracking: education>70 while propagandaCost high).
- `government`: upright+whistle (spine>60), jerseyChange (spine<30).
- `military`: rifle rotation BINDs directly to `aim` (this is the flagship BIND: `[BIND military_rifle.rotation to aim * 1.8]`).
- Prestige shell: translucent scalable element attached to capitalist; `[BIND shell.opacity to prestige/100]`.

## 6. QUOTE POP-UP SYSTEM

A quote library ships as JSON (data file, e.g. `src/data/quotes.json`); a research pass is producing it separately. Schema per quote:

```json
{ "text": "...", "speaker": "Henry George", "source": "Progress and Poverty", "year": 1879,
  "length": "SHORT|MEDIUM|LONG", "sourcing": "VERIFIED|DISPUTED",
  "voice": "CRITIC|VILLAIN|FICTION|DROOG", "themes": ["WAGES","RENT/LAND", "..."] }
```

Trigger engine (part of TICK or a lightweight watcher): theme→condition map, e.g. WAGES fires when `squeeze` crosses 70 rising; RESISTANCE/HOPE when `education` crosses 60 rising; GOVERNMENT-CAPTURE when `spine` crosses 30 falling; MILITARY/FORCE when `aim` crosses 60 rising; SLAVERY/COERCION when wage floor hits zero. On trigger: display a quote card (paper texture per dieselpunk palette; attribution line; DISPUTED quotes show a small "attribution contested" tag). Rules: SHORT quotes during live play; MEDIUM/LONG reserved for scene transitions and chapter ends. Cooldown ≥ 30s between pop-ups; no repeats within a session; VILLAIN quotes weight higher when the matching villainy is onscreen.

## 7. SIM ↔ NARRATIVE INTEGRATION (Narraton contract)

The sim layer (TICK) owns the numbers; Narraton (engine feature 5) deals scenes keyed to them. Content will use the 2.0 AGENCY/WITNESS taxonomy:

- WITNESS cutscenes: keyed to states (health crash → funeral scene; crime spike → racket scene; aim>60 → soldiers-face-strikers scene; recognition → hat-realization scene). Audience palette CHEER/BOO/SILENCE/WALK-AWAY active.
- AGENCY decision scenes: pause TICK (`[TICK]` suspends during AGENCY scenes — implement a `pauseSim` flag), present thought-balloon CHOICEs. **Choices write numbers back** via [SET] (e.g., "fund the school" → education +15; "break the strike" → heat +20, hoard +10). No plot branching — consequences flow through the sim.
- Narraton keys per scene use the standard key schema from MACHINE_BRIEF.md §2.5 against these variables: heat, squeeze, spine, aim, education, trust, crisis, recognition, singleTax, era.

## 8. BUILD ORDER FOR THIS ADDENDUM (after the five engine features)

1. Cast + hat-swap actor with placeholder art; heat/squeeze/spine/aim TICK rules
2. Ledger gauges + truth-window
3. Expression/pose state mapping + rifle BIND + prestige shell
4. Quote JSON loader + trigger engine (use a 10-quote placeholder file until the research library lands)
5. Recognition event + coin-pass beat + emigration
6. First WITNESS scene + first AGENCY scene wired through Narraton

One commit per numbered item. After each: tell Doug what to poke in Theater mode, one thing at a time.