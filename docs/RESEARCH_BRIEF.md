# HUMANS VS BILLIONAIRES — Research Brief

**Paste this whole document into a research-enabled Claude instance.**
The output feeds directly into a game generator, so the RETURN FORMAT
section at the bottom is mandatory — deviations make the material
harder to use.

---

## Context

*Humans vs Billionaires* is a narrative economy game built on Henry
George's *Progress and Poverty* (1879). A simulated Georgist economy
runs continuously: player-influenced variables (greed, speculation,
repression, education, regulation, hierarchy) drive computed ones
(the margin of production, rent, wages, hoard, prestige, flare-ups,
crisis). The player is the billionaire: they issue ORDERS through
dramatic scenes (not sliders), the changes propagate through the
economy, and a storyteller AI surfaces consequence scenes — atrocity
scenes when greed and repression run hot, resistance scenes when
education meets unrest. A news ticker crawls headlines keyed to the
economic state. One lever — the Single Tax — redirects rent to a
public fund.

Five chapters, each a real historical era of billionaire power:

1. **William the Conqueror** (1066–1087) — conquest becomes property, property becomes rent
2. **King Leopold II** (Congo Free State, 1885–1908) — pure extraction with the mask off
3. **Gilded Age America** (1870s–1890s) — George's own era; land speculation and panics
4. **King of Chicago / Capone** (1920–1931) — the racket as rent
5. **Elon Musk** (2020s) — the simulation era; prestige as armor

## What we need, per chapter

For EACH of the five chapters, research and deliver:

### A. Orders (6–10 per chapter)
Real decisions the historical figure (or their class) actually made or
faced. Each becomes a choice the player gives to a subordinate. For
each: what was ordered, to whom, what it did to ordinary people, and
which game variables it should move (see glossary). Include at least
one prestige-laundering order (museums, philanthropy, PR) and at least
one de-escalation the figure historically considered or refused.

### B. Incidents → outcome scenes (6–10 per chapter)
Specific documented events showing consequences of extraction or
repression — the severed hands in the rubber districts, the Harrying
of the North, Homestead, the St. Valentine's Day massacre, warehouse
injury rates. For each: what happened, when, to whom (names where
recorded), one vivid verifiable detail, and what economic state
preceded it (so we can gate the scene on that state).

### C. Resistance events (4–6 per chapter)
Documented pushback: revolts, strikes, exposés, boycotts, organizing.
Same detail level. Note especially cases where LITERACY/EDUCATION or
publication was the mechanism (Casement report, single tax clubs,
union newspapers) — education-corrodes-prestige is a core mechanic.

### D. News headlines (10–15 per chapter)
Period-appropriate headline material: real headlines where findable,
otherwise period-voiced summaries of real events. Tag each with the
economic state it fits (high rent / wages at survival / crisis /
speculation mania / reform winning).

### E. Characters (4–8 per chapter)
The billionaire figure, their key lieutenant(s)/enforcers, a notable
victim or worker whose story is documented, a notable resister, a
chronicler/witness (journalist, missionary, clerk). One line each on
who they were and their voice.

### F. Endings material
- COLLAPSE flavor: how this era's extraction system actually ended or
  crashed (or the nearest real analogue).
- RECONSTITUTION flavor: the era's real reform moment, won or lost
  (Forest Charter? Congo reform movement? Georgist campaigns? Kefauver?
  antitrust?).

### G. Quotes (5–10 per chapter)
Verbatim, sourced quotes from the era — the figure, victims,
witnesses, reformers. Exact wording, speaker, source, date. Flag any
quote whose authenticity is disputed.

### H. Imagery references (5–10 per chapter)
Descriptions of period photographs, engravings, cartoons, and documents
an artist could reference (e.g. "Nsala of Wala looking at his
daughter's hand and foot, photograph by Alice Seeley Harris, 1904").
Public-domain status noted where known. No need for links to images —
titles/descriptions/creators/dates suffice.

Also, for the frame: **the Ten Litmus Tests** — we need 10 short
questions a citizen can ask to tell whether an economy serves humans
or billionaires, each grounded in the Georgist analysis (who gets the
rent? who can reach the margin? etc.). Draft them from the research.

## Accuracy rules

- Real, verifiable events only. Cite a source (book, archive,
  newspaper, scholarly article) for every incident and quote.
- Distinguish documented fact from legend/dispute explicitly.
- Where numbers exist (quota weights, wage figures, death estimates,
  acreage), include them with their source and the range of scholarly
  estimates.
- Nothing invented. The game dramatizes; the research must not.

## Variable glossary (for mapping orders/incidents)

| Variable | Meaning |
|---|---|
| greed | extraction aggressiveness: quotas, rates, wage cuts |
| speculation | land/asset withheld from use, priced for the future |
| repression | enforcement spending: soldiers, Pinkertons, hit squads, content moderation |
| education | humans' awareness; literacy, exposés, organizing knowledge |
| regulation | legal friction on extraction; corroded by bribery |
| hierarchy | how normal domination feels; raises the flare-up threshold |
| prestige | the insulation shell: philanthropy, monuments, PR, memes |
| rent | what's captured for permission to exist somewhere |
| wages / margin | what labor keeps; the best land labor can still reach freely |
| hoard | the accumulated fortune |
| flareUps | humans past the poverty/overwork threshold |
| crisis | speculation-triggered depression |
| singleTax | the Georgist remedy: rent redirected to the public fund |

## RETURN FORMAT (mandatory)

One markdown section per chapter, with EXACTLY these headings:

```markdown
# CHAPTER N: TITLE (years)

## ORDERS
- **[short label, imperative, ≤8 words]** — to: [who]. What it was: [1–2 sentences].
  Variables: greed +15, repression +10 (use glossary names, signed deltas 5–20).
  Human cost: [1 sentence]. Source: [citation].

## INCIDENTS
- **[scene-title-worthy name]** — [date]. [2–3 sentences, one vivid verifiable detail, names where recorded.]
  Preceded by: [economic state, e.g. "quota doubled, enforcement expanded" → maps to greed≥80 & repression≥70].
  Source: [citation].

## RESISTANCE
- **[name]** — [date]. [2–3 sentences.] Mechanism: [violence / literacy / organizing / publication].
  Source: [citation].

## HEADLINES
- "[HEADLINE TEXT]" — fits: [state tag]. Basis: [real event/source].

## CHARACTERS
- **[Name]** ([role]) — [1 line who + voice]. Source: [citation].

## ENDINGS
- COLLAPSE: [paragraph + source]
- RECONSTITUTION: [paragraph + source]

## QUOTES
- "[exact quote]" — [speaker], [source, date]. [Disputed? note.]

## IMAGERY
- [description, creator, date, PD status if known]
```

Then one final section:

```markdown
# THE TEN LITMUS TESTS
1. [question]
...
10. [question]
```

Depth over breadth: fewer, better-sourced items beat long thin lists.
If a chapter is running long, prioritize ORDERS and INCIDENTS — those
drive the most gameplay.
