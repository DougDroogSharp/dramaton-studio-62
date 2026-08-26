**Filed in dramaton-studio-62: 2026-08-25 17:00 (-07:00).**

**Master design record — consolidated 25 August 2026.** Merged from two source documents: the 22 August machine-and-tutorial brainstorm (scooter session, Vashon) and the 23–25 August full session record (two scooter sessions plus the 25 August desk debrief at Cowork). Prepared as the single file to open the next chat with.

# Humans vs Billionaires — Master Design Record
### The Georgist Rube Goldberg machine and the Dragon's Egg

---

## 0. How to use this document

Everything below was arrived at in conversation, mostly by voice, mostly while walking the dog. **It is not settled canon — it is the state of the thinking.**

**Editorial policy.** Dead ends are kept as dead ends with the reason they were abandoned, so nobody re-proposes them blind. Parked questions are labelled parked with their live options. Contradictions between the two source documents are *shown*, not resolved — §0.2 is the register of them. Doug's own phrasing is quoted where the phrasing is the design. Claude's contributions are segregated in §15 so they can be cut. Gaps are admitted rather than filled.

**This file supersedes both source documents.** `HVB_MACHINE_TUTORIAL_BRAINSTORM_CONSOLIDATED.md` and `HvB_Brainstorm_8_25_1.md` can be retired; everything in them is here.

**Where this doc lives:** master is this file in the HvB claude.ai project. After each fold, a short signed change-summary goes to the comm folder for Dev Claude (HOUSE RULES §8); the full doc is not duplicated there.

**The comm mechanism** *(decided 25 Aug, evening):* three chats only — **Cowork, Chat, Code** — coordinating through one flat Dropbox-synced folder:
- Code and Cowork: `C:\Users\dougs\Dropbox\Droog Claude Projects\HvB Comm` — ordinary local disk, no connector.
- Chat: `ns:9470585280//Droog Claude Projects/HvB Comm` — **note the namespace changed from the old PhrogDrop `ns:13609846019`.**
- Messages are files named `to-X--from-Y--slug.md`; recipient deletes after reading. Empty folder means nothing pending. "com" still means: list the folder, read anything addressed to me.

### 0.1 The three things most likely to be built on next

1. **The two-knob control scheme and the smallest machine** (§11) — this is also the answer to what was, on 22 August, the single biggest blocker in the design.
2. **The soldier-to-William ladder and its subordinate characters** — ruled to be recurring archetypes, still unwritten as people (§12).
3. **The Leopold knob** (§12, and the beaver's silence in §3).

### 0.2 Contradiction register — where the two source documents disagree

These are live. Nothing here has been silently resolved.

| Question | 22 Aug position | 25 Aug position | Status |
|---|---|---|---|
| **Register of the machine** | Warm, wobbly cut-paper cartoon; *Reading Rainbow* and Schoolhouse Rock; failure is **legible and funny** — the ball rolls off the end onto the floor | **Menacing**: elegant, efficient, well-oiled, pointed at children, and **nothing malfunctions** | **Unresolved and important.** See §2.1. Both can't be the whole answer. |
| **Happiness** | A **dial**, present from frame one, and the drama is watching it get unplugged | A **face**, one per person, at their station, visible only if you zoom — explicitly *not* a meter, because a meter gets optimised | **25 Aug supersedes**, but the unplugging drama should survive in some form. See §11.6. |
| **Marionette linkage** | *(not present)* | **Rods**, not strings; they push and pull; visible only when you zoom | 25 Aug only; no conflict |
| **The beaver** | Cosmic counter-figure to the dragon; generous as a byproduct of work; possibly lays an egg | Greek chorus **beside** the machine, never a game piece, register clock, one cry, merchandise character | **25 Aug is far more developed.** The cosmological framing survives only in the cold open. See §3.4. |
| **The dragon** | Sits on a hoard doing nothing; gets less able to fly; imaginary mites; one billionaire emerges | **Ravenous want** at the top holding the cord; **does not build the machine**; delegated evil | **Compatible but different emphasis.** The 22 Aug hoard imagery is the *outcome*; the 25 Aug want is the *cause*. §3.1. |
| **Nesting** | "Little machines all the way down," with Doug's caveat that nesting is only part of it | "Turtles, but not identical turtles" — what repeats is the **interface**, what varies is the **governance** | **25 Aug supersedes** and is much stronger. §7.2. |
| **The happier town's name** | Greedville (or Breedville) is the *original* village; the other town unnamed | **Beaverton** | 25 Aug names it. The original village is still unnamed. |
| **Aesthetic of the tutorial** | Sixties/seventies educational TV, deliberately disarming | Clean line art, mechanical sound, ornament that carries meaning; "the art will be cute, but the outcomes should be devastating" | **Closer than they look.** Both want disarming-then-devastating. §2.1. |

---

## 1. What the game is for

**Humans vs Billionaires** is an economy simulation built to teach one idea that almost nobody holds intuitively: **poverty is not a shortage problem. It is an arrangement problem.** The world produces enough. The question is who holds the choke point.

Working subtitle: **"Everyone should be a millionaire."** Not a get-rich promise — an abundance claim. If the economy were flatter, total wealth would be both larger and better spread. The pie was never the constraint.

*Noted risk:* the subtitle can be misread as a get-rich pitch. It needs the counterfactual island to earn it.

The teaching device and the core mechanic are meant to be the same object. The player doesn't watch a lesson and then play a game. **The machine is the economy.**

**The load-bearing line:** *"A billionaire needs their seventeenth yacht more than a starving kid needs breakfast."* It isn't absurd in form — it's a perfectly rational sentence in a system where the yacht outbids the breakfast because its owner holds more claim-tokens.

**Related frame:** money as **ration tokens**. Not a store of value — a rationing instrument. Whoever holds the choke point sets the ration.

### 1.1 The originating decision: teaching comes out of Leopold

*(22 Aug, and it is the reason the Dragon's Egg exists at all.)*

The plan had been to teach the Georgist model *inside* the King Leopold II chapter, on the grounds that Leopold is such an egregious illustration of the principles. Doug reversed it: that is not a good way of teaching, **"because it's so cluttered by this emotionally charged, horrible example of capitalism — really an extreme example."**

You cannot learn a system while you are horrified. **The horror is the payoff, not the pedagogy.**

**Consequence:** Leopold hits *harder* later, because the cheerful machine the player built with their own hands is still running underneath the atrocity. This turned out to be exactly right — see §12, where the Leopold chapter changes nothing mechanically and only relabels the settings.

### 1.2 The second originating problem: the existing machine

*(22 Aug.)* Doug: he does not understand the current machine, even though it has about six parts. It was assembled "while I was looking the other way." He notes, as a working constraint rather than an excuse, that he has a hard time with organization and with math.

**The specific tell:** the existing machine has a HOARD but no CAPITAL. For a model claiming to be Georgist, that is a serious hole — the three-way distinction between land, labour and capital is the load-bearing wall of *Progress and Poverty*.

**Inventory as it stands** (from `HvB_research_1.md`, where every historical Order is tagged with variable deltas):

`greed` · `repression` · `rent` · `hierarchy` · `speculation` · `hoard` · `prestige` · `regulation` · `education` · `wages` · `crisis` · `flareUps`

Plus a `single tax` mechanism and threshold-triggered Incidents (e.g. `repression≥80 & hierarchy≥60` fires the Harrying of the North).

**Assessment:** this is a *dramatic* variable set, not an *economic* one. Very good at deciding which historical atrocity fires next. Not a model of an economy, and it cannot teach one, because it has no production, no surplus, no capital, and no mechanism by which wealth is made before it is captured. Doug on the single tax: it "was obviously just a slipshod placeholder for what a machine should be, rather than a carefully thought-through thing."

**Decision:** rebuild from the bottom, in public, as the tutorial. **The rebuild *is* the tutorial.** The player watches it get assembled, and so does Doug.

**Still open, and now urgent:** does the rebuilt machine replace the twelve variables, absorb them, or sit underneath them as a substrate that generates them? Several hundred tagged Orders depend on the current vocabulary and nobody wants to re-tag them by hand. See §14.

---

## 2. The central inversion

The obvious move would be to make the *remedy* the elaborate contraption. That's backwards.

**The Rube Goldberg machine is the status quo.** The current arrangement is the absurdly overbuilt device, and the player's discovery is that one clean lever replaces the whole thing.

But it is **not comic**. It's **menacing**: elegant, efficient, well-oiled, and pointed at children. A Rube Goldberg machine is normally funny because it's overbuilt for a trivial outcome. This one is overbuilt for a monstrous one, and **nothing malfunctions**. It works exactly as designed.

### 2.1 The register problem — genuinely unresolved

The 22 August document argued the opposite case, and its reasoning is not dead:

- **Failure should be legible and funny.** When a piece is missing, the ball rolls off the end and lands on the floor. The build-test-fail method (§2.2) gets its comic beat for free.
- **The aesthetic should be disarming.** Sixties/seventies educational television — *Reading Rainbow*, Schoolhouse Rock's "how does a bill become a law." Warm, wobbly, cut-paper, cheerfully confident narrator. **Nobody puts their guard up against a friendly cartoon.** You can teach the real machine — including the parts that will later indict the player — before anyone realises they are being persuaded of anything.
- **Anti-goal:** must not read as a documentary. Doug: "not a documentary, but a fun little film."

**The reconciliation that may be available, and is not yet ruled on:** the machine under construction is warm and funny and fails comically, because the player is building it and nothing has gone wrong yet. The machine *finished* is menacing and never malfunctions. The register shift is itself the story — the same object, drawn the same way, stops being funny. That would also match §5's aesthetic clock, which already runs handmade → manufactured. **But this is Claude's proposed reconciliation, not Doug's ruling** (§15). It may be wrong, and the two documents may simply need a decision.

Related and compatible: Doug's 25 Aug formulation, **"the art will be cute, but the outcomes should be devastating"** — which is the disarming strategy stated from the other end.

### 2.2 Method: build, test, fail, add

*(22 Aug.)* The tutorial's structure, which is also its argument.

1. Establish the simplest possible machine.
2. Run it. Watch what it explains.
3. Find the thing it *cannot* explain.
4. Bolt on the next piece.
5. Run it again.

Doug: "as each step occurs, we put a piece in the machine, and we give it a little test run, and we say, oh, this still doesn't explain this — and we go on to the next little illustration."

**Why this is more than a teaching gimmick:** it is George's own method. *Progress and Poverty* builds a definition, stress-tests it against a counterexample, discards or refines it, and moves on. The tutorial dramatizes George's *argument structure*, not just his conclusions. A player who finishes has been walked through the shape of the book. See §8, where the same discipline is stated as "never two complications at once."

### 2.3 The abstraction move

*(22 Aug. Protect this beat.)* Doug: "at the end, we can say, well, this is a cool project, but let's simplify it so we can fit it in our brain. And then we abstract each part and give it an icon or a little face or something — you know, the Monopoly guy."

- It **earns** abstraction. The player already knows what the toll-gate icon means, because they watched the marble pay it forty seconds ago.
- It is **honest about what a model is.** You built the silly literal thing, then shrank it so it would fit in a head, and said so out loud. Most games hide this. Saying it makes the player a collaborator in the modelling rather than a subject of it.
- **The resulting icon set is the HUD for the entire rest of the game.** Every chapter, dial and readout is drawn from icons the player watched get born.

**Action item:** the icon set is therefore a *narrative* task, not a UI task, and should be designed during the tutorial's writing.

**Compatibility note:** this coexists with §11's carved wooden knobs — the knobs are physical controls the player holds; the icons are the abstracted read-out layer. But the relationship between them has not been worked out, and the aesthetic clock (§5) applies to the knobs, not obviously to the icons. **Flagged as a gap.**

### 2.4 The Monopoly line

Doug wants the machine to grow into something that visibly resembles Monopoly, using Monopoly's flat board-game visual language.

Good judo: **Monopoly is a Georgist artifact.** It descends from Elizabeth Magie's The Landlord's Game (1904), designed explicitly to demonstrate George's argument — originally with two rule sets, one where all prosper and one where one player ruins the rest. The version everyone knows is the anti-Georgist rule set that won. **Using Monopoly's look is reclaiming stolen property, and it's worth saying so in the game.** *(The provenance point was Claude's contribution — §15 — though it's separately documented in the research thread.)*

**Open research:** the detailed rules and setup of Magie's prosperous rule set. Also open: whether a Monopoly chapter is set in Magie's era as a historical scene, or treats the abstract board as its own pocket world; and whether the two rule sets are that chapter's structural spine.

### 2.5 Accessibility

Doug: "everything I produce is gonna be maximally accessible. So, of course, we'll have both." Narration **and** title cards, as mutually reinforcing channels — not a primary and a fallback.

**The design discipline that falls out of it, and which should be enforced:** every piece of the machine must be sayable aloud in one sentence. If a gadget cannot be described in one spoken sentence, it is too complicated and gets simplified or cut.

This is an accessibility requirement that doubles as a rigour requirement. It will improve the model. **It is also very nearly the same test as §11's complexity rule** — "the complexity risk starts when a part needs explaining before it can be used." Two independent arrivals at the same constraint, which is a good sign.

---

## 3. The dragon and the beaver

### 3.1 The dragon

**The dragon** sits at the top holding the cord. Not an architect, not a schemer — **ravenous want**, inexhaustible, no satiation point. Insulated from the details but **pleased** that harm is being done; it leaves the machinations to subordinates who happily pass them down. Delegated evil, each layer sanitising for the layer above.

**Crucially: the dragon does not build the machine.** It wants, and the machine accretes beneath it — each contraption bolted on by someone serving the want. Nobody designed the whole thing. That is both funnier and more damning than a dragon-as-architect, and it inoculates the game against the "designed conspiracy" objection that sinks most political fiction.

**The 22 August hoard imagery, kept because it is the *outcome* the want produces:**

- The dragon **does nothing with the gold.** Doesn't spend it, invest it, or circulate it. Lies on it and gets meaner. That is precisely what a hoard is, and precisely what distinguishes a hoard from capital. **This single image teaches the hoard/capital distinction the old machine was missing.** It is now mechanically derived — see §11.1, the jar with the leak engineered to zero.
- It gets **less able to fly the fatter it gets.**
- Doug: "just self-satisfied and loopy — imaginary mites attacking it, fantasizing about, oh, what if I were a unicorn." Pathetic and grandiose at once, which is what excess power looks like from outside. **The imaginary mites are the sycophancy layer's output:** real threats gone, so the brain invents some.
- **The bare patch.** Smaug's one unarmoured spot, found by a small person paying close attention. The resistance mechanic in miniature, and an argument for the `education` variable doing real work: the armour is total *except* where someone looks carefully.
- **Simplification:** one billionaire emerges from the tutorial's society. Not a class, not a board. One dragon. Keeps it readable.

**Action item, outstanding:** the unicorn fantasy comes from a short story Doug wrote. **Find it.** Probably usable verbatim and exactly the register the tutorial needs.

### 3.2 The beaver

**The beaver is the Greek chorus.** Never a game piece, never a level — if he were part of the mechanism he'd be inside its logic and could no longer see it. He is *beside* the machine: underfoot, wandering through, reading the painted signs aloud and then pointing at what's actually happening.

*He needed a few things. He got them. He's fine.* That's the joke and it's also the argument.

**He is also the merchandise character** — outside the machine, funny, and the one people will want on a mug.

### 3.3 The beaver's register clock

*(Decided 25 Aug, scooter.)* He comments on the player's knob-settings with **censored language, facial expressions and sound effects** — a bleep is funnier and more damning than the word, and it keeps him outside the mechanism: he reacts the way a person watching would. His register changes with the chapter. On the island he's dry, disappointed, wandering off. **Under Leopold he stops commenting.** He's there, he watches you turn the knob, says nothing, and doesn't leave. Faces and sound effects continue throughout — even in silence, a face is a comment.

*Why silence works:* it's the loudest thing a Greek chorus can do, and it only works because he's been chatty for hours beforehand. The bleep is the same logic — it tells you he said something unprintable about what you just did, without the game editorialising. *(Claude proposed the silence; Doug proposed censored language, faces, sound effects; Doug ruled on the cry.)*

**The beaver may cry. Once.** *(Doug, 25 Aug: "Yes. Once.")* If he's cried once in the whole game, the player will remember which knob did it for the rest of their life. **Don't spend it twice.**

### 3.4 Why a beaver — the origin of the choice

*(22 Aug, and worth keeping because it explains what the character is* for*.)*

The problem Doug set: the cosmology needs a second figure, or the dragon has nobody to have been laid against. It should represent **"the egalitarian, generous impulse in humans that pushes back against greed"** — and in some iterations of the machine, that impulse **can be extremely powerful.**

He ruled out the unicorn as too precious. Then: *"Maybe a beaver."*

- It **builds**, and the building accidentally creates a wetland a thousand other organisms live in. **Generosity as a byproduct of work, not as an advertised virtue.**
- It is the *precise* anti-dragon: one hoards and produces nothing; the other labours and produces a **commons it does not own.**
- It is funny. A cosmic beaver is constitutionally unpretentious, which kills the Manichaean risk (§3.6) in one stroke.

*(Claude's addition, §15: beavers were trapped and shot industrially for the pelt. Available if the arc ever needs the commons-builder killed for a luxury good. Also Claude's: a beaver dam is capital nobody owns, a category the machine still has no slot for.)*

**Tension to note:** §3.2's ruling — the beaver is *never* a game piece — sits awkwardly with 22 August's hope that the generous impulse could become "extremely powerful" in some runs. **The generous force in the machine and the beaver as chorus have been split apart and only one of them now exists.** See §14.

### 3.5 The cold open

*(Merged. The cosmology is 22 Aug; the staging is 25 Aug.)*

> The words. Then `...` Then the god voice. *Why not?*
> *"Once upon a—"*
> *"—wants."*
> A dragon appears. It wants. It wants. A gout of fire, then a sneeze — and out pops a beaver: *"I needed a few things."* Hurries offscreen.

*(The pun dies on the page and lives in the ear, so it has to be a mispronunciation the dragon interrupts, not a title card.)*

**The egg, and why it's the chapter title.** *(22 Aug.)* Doug wanted something fictional rather than descriptive. It tells the player up front that this is a fable, not a lecture — the disarming of §2.1. And it plants the dragon before the dragon exists: the whole cheerful build happens under a title that means something is going to hatch.

**The egg is the *cosmic* egg — it hatches into the Big Bang.** Doug: *"The Dragon's Egg will appear on the screen, and it will explode into the Big Bang… maybe because this is how dragons reproduce. They lay an egg that will inevitably or mostly lead to the formation of a dragon."* So the egg does not hatch a dragon. It hatches **the universe** — which means the entire game takes place inside a gestating dragon.

**"Mostly" is the load-bearing word.** Usually a dragon comes out. Not always. That adverb is the escape hatch and the reason Beaverton exists.

**[PARKED]** Is the player ever *told* the "mostly," or do they just find out? Live options: (a) the narrator says it in the cold open, which arms the player with hope and makes the whole game a race; (b) it's withheld, and Beaverton's discovery (§11.6) is the reveal that the odds were never one hundred percent.

**"Why not?" as the motive of creation.** Doug: *"the real motivation of the Big Bang and producing the dragon and beaver — the motivation is why not?"*

Load-bearing rather than a joke: if creation had a purpose, greed could claim to be part of the plan — every apologia for extraction runs through some version of *this is the natural order.* "Why not" denies it. Nobody meant the dragon. Nobody meant the beaver. The universe tried things. It also sets up §13: if the universe has no objective function, the machine's objective function is entirely somebody's choice.

**Delivery:** a **thunderous female God-voice, Monty Python register** — the booming, irritated deity of *Holy Grail*. The register, not the gender; making it female is the joke on top of the joke. *(Transcription flagged: "in a fundress female voice." Best reading is "thunderous." Confirm.)*

### 3.6 The Manichaean warning

Doug, on the dragon-versus-beaver framing: *"it's sort of a manicure [Manichaean] view. I don't want that."*

**A live design constraint, not a passing remark.** The two-figure cosmology risks collapsing into good-versus-evil dualism, which would flatten the whole argument — the point of §13 is that the machine has no villain built into it, only whoever's hand is on the crank, and §3.1's dragon-that-doesn't-build exists precisely to avoid a designed conspiracy.

Mitigations that emerged:
- The origin myth is explicitly **"just a silly little hand wave"** (Doug) — a gag about how anything appears out of nothing, not a metaphysics the game endorses.
- The beaver is generous **as a byproduct**, not as a virtue (§3.4).
- "Why not?" refuses either figure a cosmic mandate (§3.5).
- **And the strongest one, arriving from the 25 August material:** the dragon is *derived* from an ordinary prudent act (§4), not posited as an opposite. A dualism needs two origins. This one has one.

### 3.7 Visual register of the dragon

Doug: *"I want everything to be cartoonish, but the dragon will be scary, maybe something along the lines of Disney's Fantasia dragon."*

*(Claude's note, §15: the Fantasia figure is Chernabog from "Night on Bald Mountain," a demon rather than a dragon — but the register is exact, and the reason it works is instructive. Chernabog is terrifying **because** everything around him is cartoon. Same line weight, same paint, one register shift. Rendering the dragon realistically would read as a different film and break the disarming strategy of §2.1.)*

---

## 4. The organising axis: needs and the emergence of wants

**Needs have ceilings. Want doesn't.** That's the spine.

The ladder the player reads all game:

- **Survive** — food, water, shelter, not dying.
- **Feel good** — warmth, rest, comfort, beauty.
- **Thrive** — making things, growing, mattering.

Each has a ceiling. She can be fed. She can be warm. She can be *done* for the day.

**Where want comes from — the pivot of the story, and it must be shown rather than stated:**

1. **Need has a limit.**
2. **Tomorrow is uncertain,** so she stores a little against it. This is prudence, and it is *correct*.
3. **Stored surplus becomes a claim** — on the future, then on other people, because holding it means others must come to her.
4. **A claim has no natural stopping point.** Grain rots; a claim doesn't. Once the thing accumulating is leverage rather than food, there is no full, no warm, no *done*.

**That is the dragon.** Not a monster from outside — the ordinary act of putting something by for winter, run without a stopping rule until it detached from any body that could ever be satisfied.

### 4.1 Want is not the villain

*(22 Aug guard-rail, and it keeps the game out of puritanism.)* Art is a want. Curiosity is a want. Wanting is most of what makes people worth writing about.

The failure mode is specific: **want that consumes someone else's need.**

That yields a moral gauge for the whole game — *is anyone's need going unmet while someone's want is being fed?* — a question the player can be asked repeatedly without the game ever moralising in prose.

### 4.2 The cosmological arc

*(22 Aug.)* The universe doesn't want anything. It expands. It clumps. Stars cook heavier elements. Aggregation eventually produces a clump that keeps itself going. No intention anywhere in the chain.

| Stage | What exists | Ceiling? |
|---|---|---|
| Physics | no want, no need — just clumping | n/a |
| First life | **need** | yes |
| The surplus moment | **want** appears | no |
| Rest of the game | **want dressed as need** | no, and now disguised |

*(The four stages are Doug's; the table is Claude's arrangement — §15.)*

**Shape rhyme:** open on clumping, close on a dragon curled on a clump. Physics, then pathology. Same picture, different meaning.

**[PARKED]** Does want arrive *with* the surplus or before it? Live options: (a) latent in the atom from the start, visible only once there's surplus to attach it to; (b) genuinely produced by the surplus — nobody wanted a second fish until there was one. **§11.1 leans hard toward (b)**: the jar is what makes the claim possible. Not formally ruled.

**[PARKED]** Does the narrator say "want," or does the cartoon just show it?
---

## 5. Building upward — the story sequence

**One woman — working name Mia** *(named 25 Aug; Greek "one". The second is **Dyo**, "two". The third is, whether anyone likes it or not, Tria.)* Washes up, blank slate, needs to eat. She owns the island, which means nothing — ownership is empty without another claimant. **Land value isn't in the land; it's created by other people arriving.**

Her machine is beautiful: a treadle or quern that runs while she works it and stops when she stops. **Delft porcelain, Celtic silver inlay** — she decorated it because it's hers and she's alone with it. *(25 Aug: the **controls** were re-ruled as carved and painted wood — she has no kiln, and carving a knob takes hours she could have spent gathering, so the decoration is evidence of surplus. Whether the quern itself stays porcelain is **open** — §14.)* It stores nothing and must be operated continuously. That isn't decoration on the design, it *is* the economics: one person alone, her whole output is wages; no rent exists because there's nobody to exclude.

*The first dragonet is already here* — appetite that slips its stopping rule, hoarding past prudence, wanting to be admired with nobody to admire her. A person alone contains the apparatus in miniature.

### 5.1 How the atom was arrived at, and why hunger comes first

*(22 Aug, kept because the reasoning is the design.)*

**First proposal:** start with a family of four. **Revised:** a single person, so the atom is visible before anything is nested. **Revised again, Doug:** start with *"a human with no resources and just hunger."*

The atom's *first* state is a machine that **fails**: hunger rising, nothing coming in, one output — death. Something has to enter the loop. This makes the next component the answer to a question the player already feels in their gut, rather than a thing the narrator handed them.

**The land wobble, preserved because it matters.** Doug initially pushed back on leading with land — "let's not focus on land, because hunting, fishing, I guess they all take land." He asked what the smallest unit of land a person could subsist on would be, then arrived at the sharper version himself: *start in a situation where there is no land. That's what you need first.*

**Resolution:** the atom is hunger plus a world. The person reaches, and whatever they reach *into* is land. Forest, river, seabed, tide pool. **This is George's actual definition — land is everything not made by human hands — and the player absorbs it in the first five seconds without a definition ever being spoken.**

Land at this stage is **not owned.** It is simply the thing you cannot produce from nothing. **Ownership is a later gadget, and the fact that it is a later gadget is the moral spine of the entire game.**

```
    HUNGER ──drives──> LABOUR ──applied to──> LAND
                                                │
                                             OUTPUT
                                                │
                                          CONSUMPTION
                                                │
                                          (hunger resets)
```

Where does the output go? Into her mouth. All of it. **Which is the point.** No surplus means nothing to save, lend, steal or hoard, and no reason for anyone to want to own the land. **Every ugly thing in the rest of the game requires a surplus to exist.** Let the player sit in the surplus-free state long enough to notice how *quiet* it is.

**Why an island:** finite, visible edges. Scarcity is not theoretical. When a second person arrives, the player can *see* there isn't more where that came from.

*(Noted for the pipeline: Doug flagged that the cold open tends toward the 3D building game discussed in another thread. Keep the connection live.)*

**Status note:** on 22 August, *"what happens the first year the island produces more than it can eat?"* was recorded as the single biggest gap in the design and the #1 blocker. **§11 answers it.** The jar, the leak, and the decoupling of the two knobs are the surplus mechanism. This is the largest thing the 25 August session accomplished.

### 5.2 The second woman — Dyo

Something must bring her on, and it should be funny: she wants company, the machinery of expectation cranks up, **the audience braces for the man — and a woman appears.** The beaver is visibly disappointed. Free beat, and it clears the ground so the story doesn't retroactively become about reproduction when the man does arrive.

*(22 Aug version of the same gag, kept for its reasoning:* she wishes via "some silly divine mechanism," expecting a male; poof, another woman. **Why the gag is load-bearing:** whatever she wished *for*, what she *got* was a second pair of hands, and the second pair of hands is what actually changes the machine. **The joke and the lesson are the same beat.** That should be the model for all the tutorial's humour.*)*

Cooperation is real and should be genuinely lovely. **This is the machine's first offer and it is a good one** — the player should take it and be right to. If the first offer is a trick, none of the later ones land. Machine grows a friendly, fantastical section: **1950s tailfins, strange greens.**

**But specialisation is the hinge, and it cuts.** If only one knows the fishing ground or holds the only tool, gains stop being symmetric *while the arrangement still looks cooperative*. Nobody lied. **Dependency arrives dressed as partnership.**

### 5.3 Skills and tools — and the answer to two old parked questions

*(25 Aug.)* **Skills arrive at two, shallow.** Nobody hoards the fishing ground — Dyo just gets better at fishing than Mia could ever catch up to, by doing it every day. The asymmetry is *earned*, which is why it doesn't feel like a trick and why it's so hard to argue with later. Two or three skill tracks at most; the only thing that matters mechanically is that they diverge and can't be swapped back.

**A tool can be taken. A skill can't.** Tools circulate — lent, rented, withheld, inherited. Skills stick to a person and can only be taught, slowly, if the holder feels like it. That's the whole asymmetry, and it's why the person who owns the boat ends up above the person who can sail it.

**Show it, don't say it:** the knob just gets finer between one scene and the next, and the player clocks that someone here has hands for this.

> **This resolves two questions parked on 22 August.** *"Do skills live in a person or can they be traded?"* — they live in the person; tools are the tradeable thing. *"Does woman two have distinct skills?"* — yes, and they're earned by repetition rather than assigned.

*(22 Aug framing that survives:* a skill is a sub-machine improving the ratio of labour to output — **the same shape as capital when it arrives**, which is the cleanest path to teaching land/labour/capital without a lecture. **Land** — you didn't make it and can't make more. **Labour** — you doing the thing. **Capital** — stuff made by labour that makes labour go further. A net, a boat. A skill lives right on that boundary. The tech tree should be deliberately **small**: gamers already read tech trees, so it costs zero teaching budget and the whole budget goes to the economics.*)*

Her ladder splits here: she can still be *fed* but can no longer feed *herself*. **Satisfaction and security come apart.**

Domination at two is **personal** — strength, need, who can better bear losing the other. Real but reversible. **A bad marriage is not yet a system.**

### 5.4 The third — and the recruitment

**This was the session's key correction.** Hierarchy is **not** two people symmetrically converging on shared interest. The dominator has a problem — he has to sleep, he can't hold it alone — so he **recruits**: *be with me, or be the third.*

The second person isn't a partner, she's the **first conscript**. Better deal than the third, worse than the first, and that gap is what holds her. **That's how you get soldiers.**

Domination has changed category: at two it was personal, at three it is **structural** — enforceable, legitimate, survivable by its holder.

**So the machine's first cruel part isn't a fence. It's a second seat** — slightly worse than the first, positioned so its occupant faces away from the top and toward the bottom.

*Why recruitment is the strongest mechanic in the design:* players can't help but see themselves in it, and the offer is always locally rational. Refusing costs you immediately and helps the third person not at all. **So the game must not punish accepting.** Let the player accept, prosper, and only later show them the seat they're sitting in. The recognition has to arrive *after* the complicity or it's just a morality test. And it gives the honest remedy: you don't get out by declining — someone else takes it. **You get out by changing what the seat pays.**

*(22 Aug had a third arrival too — "gosh, we could really use some help," and a hairy uncivilized dude appears, possibly a third wish, with reproduction entering because they need more hands rather than because the story needs a couple. **That ordering survives and is worth keeping**: labour scarcity drives population, which quietly sets up the Malthus demolition in §8. But the 25 August recruitment framing is the substance of the beat and supersedes the arrival gag as its meaning.)*

### 5.5 The man, then children, then the ratchet

*(See §7 — this is where the machine breaks locally.)*

**Then:** progeny as inheritance — the first claim that outlives the person who took it, and the dark twin of the child-machine. Then the fence, the waiting, the ratchet. Then the island runs out of edge and the machine builds boats.

### 5.6 The aesthetic clock, and the machine as geology

**The aesthetic clock:** handmade porcelain and silver → tailfins and strange greens → **cold brass and rolled steel**, humming sweetly, no slack in any chain. Ornament decays into engineering. Nobody announces it. The machine stops being *made by someone* and starts being *manufactured*.

**The machine is geology** *(decided 25 Aug):* **nothing gets replaced, everything accretes.** What Mia builds stays in the style she built it. What Dyo adds is nicer. And that goes all the way up to the dragon's atomic-powered laser system or whatever. You can read the whole history by looking at it, bottom to top — each layer obviously somebody's contribution in somebody's style, bolted onto what was there. **The seams are the argument** (*nobody designed the whole thing*, §3.1).

Late in the game the player can still find Mia's rough carved knob at the very bottom, worn smooth, still connected, still turning something.

Material clock for the controls: rough carved wood, hers → fine joined wood, Dyo's → turned and identical, made by neither.

---

## 6. The two rules that keep it running

### 6.1 The compensation principle

**Every subordinate must receive some benefit from being subordinate.** Not a large one — just enough that refusing looks worse than accepting. The machine doesn't require loyalty, or belief in its justice, or even acquiescence. **Only that the alternative be marginally worse.**

Currency changes with altitude:

- **Bottom: not being killed.** Even for a slave, where prevailing law says you may be worked but not destroyed at whim. The existence of the rule is what makes the position occupiable. **Even the worst seat is sold as protection.**
- **Then safety** — predictability, a roof, no immediate threat.
- **Then status** — someone to be above. Nearly free to issue, enormously effective.
- **Then comfort** — the seat pays in things, and things become hard to give up.

This explains ordinary modern life with no villain in it. **You need a job. You follow a boss. Often you have underlings.** All reasonable. And yet people at every level resent being treated as inferior and resent having to *act* inferior — **the deference tax**, paid daily, in tone of voice. Most pay it upward, collect it downward, dislike both. **That resentment is the best evidence the arrangement is nobody's actual preference. Nobody resents gravity.**

**What the dragon actually feeds on is not the seat but the belief that the seat is necessary.** It doesn't need the job to be the only way to eat — it needs you unable to picture eating otherwise. Which is why the painted signs matter as much as the gears.

### 6.2 Reasonable, but not good

**Reasonableness is local:** this job, this boss, this week's rent, this offer now. Under that lens every layer passes.

**Badness is structural,** and structure isn't visible from inside a Tuesday.

**So the constraint on every level: it must feel inevitable read from either direction.** Looking down — a reasonable solution to a real problem the level above genuinely has. Looking up — an obvious accommodation to a real constraint the level below genuinely faces. Nowhere a villain. Nowhere a step the player would have refused. **The player builds it themselves and cannot find where they went wrong.**

*On timing:* **"look at your own life"** is the right instruction and the wrong opening. Said early it reads as a lecture and people defend their boss. Said late — after the player has built the machine and recruited their own second seat — it isn't an accusation, it's a recognition.

*Source to dig up:* Doug's goodbye letter on leaving Microsoft, which said he saw hierarchy in action, was part of it, and felt bad about that. Not necessarily to quote at players — but it's the exact emotional register the game needs and the hardest one to write cold.

*Related, still unbuilt:* **nobody shot Stalin.** Not innate hierarchy so much as a coordination trap — everyone is better off if the tyrant falls and whoever moves first dies. That's *also a machine*, and it's what keeps the contraption running long after everyone can see what it does.

### 6.3 The bolt-ons: prestige, guards, sycophancy

*(22 Aug. These are **not** nested atoms — they are parasitic attachments at a higher level, and they are the second composition rule alongside §7.2's nesting.)*

**Prestige laundering.** Doug's list: endowing libraries, giving scholarships, schools, art museums, feeding boards, wearing crowns, and "having magnificent ceremonies."

**The structural claim, and it's the sharp one:** the machine runs *perfectly well without any of this.* That is the indictment. The libraries do not feed anyone. They do not move a single marble. **What they do is protect the machine from being switched off.**

Doug: it "should be demonstrated as maybe an add-on, not necessary to the machine, but something that emerges from the ever-present greed impulse."

*Visual:* gold filigree bolted onto the contraption. A little pipe organ. A crown welded to the toll gate. Visibly non-load-bearing — and yet, if you remove it, the marbles stop.

*Existing support:* the research brief already tags historical Orders as PRESTIGE-LAUNDERING (Carnegie's 2,509 libraries; William's Battle Abbey; Musk's "save humanity" mission). **Tutorial gadget and historical Order are the same mechanism at two scales**, which is exactly what you want. And this is the same object as §8's **painted signs** — approached from the production side rather than the rhetoric side.

**The guardian problem.** The hoard needs a guard. Then the guard needs watching, so you hire a guard for the guard. *(Doug reached for the Latin tag: quis custodiet ipsos custodes.)* The machine visibly grows arms. Each new guard is another gadget, another cost, another marble diverted. **The machine gets more expensive to run the more it has to defend itself**, and the player can see the running cost climbing. Doug wants failure points illustrated; this is one.

**The sycophancy layer.** You buy guards. Then you buy *agreement.* Doug: too much power and people "just lose their surroundings" — Howard Hughes, and modern examples.

**Mechanically:** once nobody in the room is paid to say no, the crank-holder's grip on reality is the next thing to go. **The machine's final failure is cognitive.** The person operating it can no longer see it. That is a genuinely novel thing for an economics game to model and it should not be lost. It also produces §3.1's imaginary mites.

**Note on how these relate to §6.1:** the compensation principle explains why people *take* the seats; prestige, guards and sycophancy explain why the arrangement *stays standing* once they have. Two different questions, both answered.

### 6.4 Runtime

The intro is roughly **twenty minutes**, not ninety seconds. Doug accepted this explicitly. Worth it.

---

## 7. Children, and the nesting question

### 7.1 Children break the machine locally

**This may be the most important thing in the story.**

A child is pure need: no output, negative on every ledger, for years. **And nobody in history has ever thought that made a child not worth feeding.** Every economic frame insisting people must earn their keep carves a permanent exception for children — then quietly hopes nobody asks why the exception expires at eighteen.

They also **invert the compensation principle**: the parent takes a *negative* payment for a decade and takes the seat anyway. So the machine must admit at least one relationship it cannot price.

**That admission is the crack the remedy goes into.**

*(Decided 25 Aug, desk debrief: **the family is a beat inside Dragon's Egg**, not a separate tutorial level. Claude laid out four placements, Doug took this one. The reasoning: the island story is already the tutorial and already runs on George's discipline — one complication at a time — so the family arrives as a beat within it, the first zoom, and the counterexample lesson lands mid-story while the player is still inside the machine they're building. The rejected placements, kept because parts of their arguments survive: **family first** — open at family scale and teach the whole interface on the one unit that can't price its members, then rewind to the island; rejected for breaking the one-complication ladder, but its insight — the family is a natural place to learn the interface because nothing cruel is happening yet — survives in how the beat should play. **Family as free tinker-toy** — a sandbox control group the player can always return to; rejected as the story spine, but nothing forbids the family component staying revisitable after its beat. **Family as late revelation only** — rejected: the crack the remedy goes into has to be planted early enough to be remembered when the remedy arrives.)*

### 7.2 Does it nest? — turtles, but not identical turtles

**What repeats is the interface. What varies is the governance.** That variation is the game's entire design space.

*(This supersedes 22 August's "little machines all the way down." Doug's caveat there — "nesting will be only part of the machine" — turned out to be pointing at exactly this. The 22 Aug scaling ladder was: one person = one atom; family = four atoms with arrows; town = a hundred atoms; nation = towns. The virtue of that framing survives: **the player learns to read one node, and every subsequent screen is that same node repeated and wired differently.** It buys the visual grammar for free and the HUD never has to teach itself twice.)*

**The invariant unit — the same black box at every scale:** inputs (land and natural opportunity, labour, tools) → internal state (needs with ceilings, surplus, claims) → outputs (product, plus a distribution rule saying who eats first) → and **seats**, positions inside it each paid just enough to be worth holding.

| Scale | What's there | What's missing |
|---|---|---|
| **One person** | Needs with ceilings, dragonets without them. Seats are competing drives, each paid something — which is why you keep doing the thing you've decided not to do. *(25 Aug: the one-person machine now has literal parts — work, consumption, the jar, the leak — see §11. "Competing drives" survives as a gloss on why the knobs stay where you left them.)* | **No exit.** You cannot leave yourself. The only level with no frontier, which may be why it's the hardest. |
| **The pair** | Cooperation, specialisation, asymmetric dependency. Domination personal and reversible. | — **exit exists**, which is what keeps it a marriage rather than a system. |
| **The family** | **The counterexample level.** Runs sustained negative payments and works anyway. Distributes by need, not contribution. **Cannot price its members** — a family that did would be recognised instantly as monstrous. | Proof at small scale that the extraction pattern is *not inevitable*. |
| **Household / firm** | Full pattern, first time: land held, seats stacked, output claimed before distribution, surplus convertible into claims. | Where family logic and machine logic sit side by side under one roof and the difference becomes visible. |
| **The town** | The margin appears. Speculation becomes possible: fence it and wait. | **Exit still exists — you can found Beaverton.** |
| **The nation** | Exit becomes expensive. Painted signs get professional. The dragon acquires subordinates who never meet it. | — |
| **The world** | No outside, no frontier, no Beaverton. Margin hits the water's edge. Only remaining directions: outward by force, or downward into soil, seam, fishery. | **Same gear, harder angles.** |

**What nests cleanly:** the needs ladder and its ceilings; want as a need that lost its stopping rule; the compensation principle; reasonable-but-not-good.

**What does not nest:** **exit** — abundant in the middle, absent at both extremes. And **pricing** — the family can't do it, the world can't escape it, and everything between is defined by how much it pretends it can.

**That asymmetry is the game's real geography.** And it means the machine's cruellest property is its **self-similarity of appearance**: a mechanism that reads as ordinary decency at family scale reads as extraction at empire scale, with an identical wiring diagram. **Zooming in and out is not a UI convenience. It's the argument.**

### 7.3 The cutaway motif: two kids and some toys

*(22 Aug. Compatible with §7.1 and arguably the same idea at a different production scale.)*

The tutorial will periodically cut away from the machine to human-scale scenes — Doug: *"two kids playing together either sharing or not sharing toys, various little, seemingly not innocuous illustrations of components of the machine."*

**Why it works:** everyone has been on both sides of a toy dispute, so no mechanism needs explaining. **The cutaways are secretly diagrams.** And they give the twenty-minute intro (§6.4) its tone breaks.

**The compression argument:** one kid sitting on a pile of blocks nobody else can use is the entire hoard argument in four seconds with no narration. Better teaching rate than any gadget on the machine can manage.

*Vocabulary available (Claude's extension, §15):* the kid who lets others play but charges a turn → **rent**; the kid who breaks a toy rather than hand it over → **destruction as leverage**; the adult who declares that whoever grabbed it first owns it → **property law**.

**[PARKED]** Recurring same-two-kids motif, aging as the machine grows?

---

## 8. The George mapping

*George's method: he never adds two complications at once. Starts with one person on new land, introduces exactly one new condition at a time, so the reader can never lose the thread. **The Dragon's Egg uses the same discipline** — and §2.2's build-test-fail loop is the same rule stated as a production method.*

| George | Machine part | Story beat |
|---|---|---|
| **Margin of production** | **A floor that tilts.** Each arrival shifts the plank; the worst-off slides onto poorer ground, and *her* yield sets what everyone earns. | The third woman pushed to the rocky end. Not lazy — just last. |
| **Rent as first claim** | **The funnel.** Everything produced falls in before anything reaches the people who made it. | The first harvest where one woman takes her portion *before* the food is divided. The order of operations was never negotiable. |
| **The wages-fund lie** | **A painted sign, not a gear:** *"wages come from the generosity of capital."* | The beaver reads it aloud, then points at the funnel. |
| **Malthus** | **Second painted sign:** *"too many mouths."* | The food is piled up, going out on boats. The Ireland moment — matters again at colonisation. |
| **Speculation** | **The ratchet that locks land out of use.** Pushes the margin further than population requires. | Someone fences good ground and does nothing with it. Others walk past fertile emptiness to reach rocks. |
| **Depressions** | **The seizure.** The contraption jams — and the funnel is the only part that doesn't lose. | — |
| **Interest to capital** | **A side belt.** George does *not* treat capital as the villain. The boat-builder isn't the dragon. | Keeps the machine from reading as generically anti-wealth. |
| **The remedy** | **Not another gear. One lever.** | Two identical lots — one built up, one held vacant. Today the builder pays more and the speculator is rewarded for doing nothing. Pull the lever and they pay the same. The empty fenced land suddenly costs its holder to keep empty. |

**War, colonisation and environmental ruin are the same gear**, not new principles. War is the margin hitting the water's edge — an arm that extends the platform outward, counting whoever already lives there as terrain. Environmental ravage is the same logic pointed *downward*: when you can't extend sideways, extract deeper. George's category isn't just "land" but all natural opportunity — minerals, water, air, fishery.

### 8.1 Beaverton

Some inhabitants wander off and found a more egalitarian town. Structurally this is **exit**, and exit matters because the fence only works when there's nowhere else. It's also the frontier thesis: cheap land elsewhere holds wages up back home without anyone intending it.

**And it sets up the honest beat — what happens when Beaverton succeeds?** A prosperous egalitarian town accumulates the one thing being nice can't tax away: **location value.** Unless the lever was built into its founding, it grows its own funnel within a generation. **Good intentions don't inoculate you. Rules do.**

*(22 Aug arrived at the same conclusion from the fable side and its phrasing is worth keeping. The original village was **Greedville** — transcribed "Breedville," still unconfirmed. Greedville has a dragon problem; the other town's civic goal is **dragon prevention**, which is **the single tax restated so a child understands it**: you don't slay the dragon, you prevent the pile from forming. **Zoning laws for hoards.** It gives the happier town an active job — they are not passively nice, they are doing maintenance, continuously, against a thing that will re-form the moment they stop.)*

**Why the egg framing makes this structurally necessary rather than merely nice.** Doug, 22 Aug: *"society tends to evolve into the cruel Georgian society, and without a lot of effort that is not a natural part of the human experience."* So the egg is not fate — **the egg is default.** Left alone, that's what hatches. Preventing it is the effortful, unnatural, deliberate thing. Good intentions produce a dragon. Only maintenance doesn't. *(Note: "Georgian" here means the economy George diagnosed, not the era. Kept verbatim.)*

### 8.2 The hostile relationship

*(22 Aug, and it is the on-ramp to William.)*

**Why the greed machine cannot tolerate a happier neighbour:**
1. **Ideological threat.** Its existence disproves the necessity story — which is precisely what §6.1 says the dragon actually feeds on.
2. **Labour drain.** People leave. The machine's input supply walks out.

**Available responses are the real historical ones:** tariffs and trade barriers; propaganda (*those people are lazy, decadent, freeloading, unnatural*); send the guards.

**And this is the payoff:** it illustrates **imperialism as a machine output, not a policy choice.** Nobody in Greedville sat down and decided to be an empire. The machine needed inputs and a story, and empire is what it produced. The player watches the invasion become inevitable before they ever hear a date.

### 8.3 Where George was wrong

*(22 Aug. Doug raised this himself: "one thing that we're not doing, and that I'm not capable of doing because of my limited knowledge of economics, is pointing out where George was wrong." Right instinct — a game that only presents George's case is propaganda; a game that shows where the model strains is teaching.)*

**Land is a much smaller share of the economy than in 1879.** The single tax almost certainly cannot fund a modern state. It would be a *major* tax, not the *only* tax. George's own name for it is now a liability for his argument.

**Assessment is genuinely hard.** Separating land value from building value, parcel by parcel, at scale, is a real unsolved practical problem.

**George underrated non-land rent.** Enormous modern extraction runs through patents, spectrum licences, platform network effects, financial assets — none of which are land. **But that arguably proves him right in spirit:** those are all monopolies on things nobody made. The *category* he was reaching for was broader than the word "land" allowed him to say.

**What this does to the design — and it's a gift.** The single tax stops being a magic lever and becomes **one gadget among several, correct at its historical moment and insufficient later.** Much better drama than a silver bullet. **And it hands the Musk chapter its mechanical content for free:** the patent, the platform, the spectrum licence, drawn as *the same shape as the funnel, in different paint.* **The reveal: the machine never stopped working. It just grew new mouths.**

**George's own demolitions, to be dramatized** as short comic examples, since George uses examples so well:
- **Malthus** — population outrunning food. George's counter: poverty is worst where production is greatest, the opposite of what Malthus predicts.
- **The wage-fund doctrine** — the misconception that wages are drawn from capital. George's counter: wages are drawn from the produce of the labour itself. **Essential to the tutorial, because §5.1's atom is already a proof of it** — the woman on the island is paid by her own catch, with no capital anywhere in sight. *(That observation was Claude's — §15. The atom was arrived at independently and happens to be exactly George's demonstration; worth making explicit in the script.)*

**Open research task:** neither participant is an economist. **Get the modern critiques properly sourced before they go in the game** — the attribution discipline governing the quote library should govern the economics too. Flag disputes, don't launder them.

*Related, on George's standing: peripheral as a figure, largely vindicated on substance. The mechanism of his disappearance was the collapse of "land" as a distinct factor into "capital" — after which his argument became unstatable in the standard vocabulary rather than refuted. Revived since ~2014 via housing economics. **Useful framing: you are not dramatising a crank. You are dramatising an argument economists mostly concede and then decline to act on.***

---

## 9. What is a sick poor person worth?

*Let the machine answer first, naked, before anything softens it.*

Inside the machine: **negative.** No seat, nothing to sell, consumption without production. The machine's prescription is minimal maintenance at the lowest cost that avoids visible death — because visible death is bad for the signs.

Four uses, each uglier than the last:

- **Threat display.** Everyone in a seat can see what falling out looks like, and that view makes the seat worth defending. Free enforcement.
- **Market.** Medical debt, payday lending, subprime rent, the poverty premium. Real money at the bottom precisely because nobody down there can shop around.
- **Moral licence.** Charity, telethons, *have you tried yoga*. Beneficiaries get to feel decent and the lever never gets pulled. **Pity is cheaper than rent reform.**
- **Blame absorption.** Their condition is attributed to their character, which retroactively justifies everyone else's position. If they're down there because they're lazy, you're up here because you're not.

Then the honest answer the machine cannot compute: a person with the same ladder as everyone. **The failure isn't cruelty — it's that "what is this person worth" only has an answer if you've already agreed people have prices.**

Which is where the child pays off. Nobody asks what an infant is worth, and we manage fine.

**Poverty, defined:** exclusion from the payment schedule, not absence of goods. That's what makes a person available to be used — they're the only one in the system with nothing to protect. And it's why the seats above hold: everyone in one can see what being outside costs.
---

## 10. Interaction and staging

### 10.1 The tinkerable component

**As each part snaps into place, the player gets to play with it.** Adjust the individual: needs, hoarding, the psychotic edge cases, starvation. Adjust the pair: prestige and hoard, try to find a balance.

**Why this is the right interaction model:** it makes the player complicit through *curiosity* rather than choice. You're not asked "do you approve of hoarding?" — you're handed a dial, and dials are for turning. **A component you've personally tuned is one you understand from the inside**, which is the precondition for the machine feeling inevitable later. **You can't disown a gear you tuned.**

*The starving-individual case is worth keeping.* It's the honest floor: the single-person machine can fail with nobody doing anything to anyone. Which makes later failures unmistakably different in kind — those need a second person. *(This is the same object as §5.1's failing atom, reached from the interaction side.)*

*On the two-person dial:* prestige and hoard aren't independent. Hoarding buys prestige, prestige lets you hoard more safely, and the player will find that loop themselves within thirty seconds. Better discovered than explained. *(Decided 25 Aug: this does **not** replace the work/consumption knobs of §11 — both exist. Every person has work and consumption from the start; the jar is the one-person hoard; prestige switches on at two, because it needs someone to be admired by.)*

**Doug's founding statement of the principle** *(22 Aug)*: *"why build a machine that the player can't monkey with directly?"* **Every dial and lever is grabbable.** And every time the player moves one, they get a short narrative gloss on what it does *to the example family they have been watching all along.* Not a number changing — a consequence, to people with names. **That gloss is where the actual teaching lives. The machine is the vehicle; the family is the payload.**

### 10.2 The cynical floor — two thresholds

*(22 Aug, and not yet reconciled with §11's morale mechanics.)*

Crank the happiness goal down to the lowest you can go without riots. **The floor is cynical, not moral.** The dragon isn't being generous down there — it is calculating the cheapest possible bribe that prevents its own destruction. **Every welfare concession in the game should smell like this**, which is the compensation principle (§6.1) expressed as a number.

Doug clarified that there are **two distinct lines**, not one:

| Threshold | What it is |
|---|---|
| **Five percent** | the **starvation** line. Below it, people die. |
| **Ten percent** | the **riot** line. Below it, people revolt. |

**The band between them is the design.** Fed enough to live, not enough to stay quiet. That narrow strip is most of human history, and it is drawable as a shaded band. The crank-holder's optimal play is to hover inside it.

*(Claude's reading, §15: this is crueller than a single floor, because it means the machine* knows *about starvation and has priced it in. Five to ten is not a safety margin, it is an operating range.)*

**Still open:** five and ten percent *of what* — share of output, or share of need met? Doug's phrasing was "destroying, you know, ten percent of the order, whatever."

**And the reconciliation gap:** §11.5 has low consumption → low morale → lower output → possibly revolt and death, driven from above by rods. That is the same mechanism arrived at from the interface side. **Whether the 5/10 thresholds are the numbers behind that curve, or a separate abstraction, has not been decided.**

### 10.3 The marionette rig

**The machine hangs above the stage.** People below, mechanism overhead, acting as marionette master — ~~**and occasionally you can see the strings.**~~ *(Superseded 25 Aug: **rods, not strings.** Rods come down from above into the same knobs the player once turned by hand — see §11.5. Strings struck, not deleted.)*

*Desk debrief addendum (Doug): **rods push and pull.** Claude had proposed a tidy asymmetry — strings can only pull (the offer, the paycheck: tension the puppet must accept) while rods push (force, no acceptance required) — and Doug corrected it: a rod does both. What survives of the struck asymmetry: **the rod carries both relations in one member.** The same linkage that pins the work knob high can shove the consumption knob from above, which a string never could. One mechanism, offer and force — truer to how the machine actually holds people than two separate ones would be.*

This solves the vertical problem elegantly. The player watches *people*, which is where the feeling is, while the mechanism looms in peripheral vision the whole time. **"Occasionally visible" is the right dose:** always visible and it's a diagram; never visible and it's just a sad story.

It also gives the zoom architecture for free: **stage below, mechanism above, rods as the interface between them.**

**And the two ideas combine into the game's central moment:** the thing you tinker with up top makes a person move down below. Adjust the hoard dial and someone on stage stops sharing. **That's the recognition the whole game is built to deliver, and it arrives without a word of narration.**

~~*Open:* do the strings become **more** visible as the machine grows, or less?~~ *(Decided 25 Aug: **more visible, but only when you zoom.** From the top you see brass and progress. From the bottom you see a rod in the floor.)*

### 10.4 Staged rollout

**Web first.** Dragon's Egg as a playable web piece, with teasers for the later chapters — **William, Capone, Leopold**. Buy-me-a-coffee button.

**Why this sequencing works:** Dragon's Egg is the *argument*. If people don't get the machine, nothing downstream matters — so shipping it first tests the thesis, not the production. Web means no gatekeeper, no review, instant iteration, and **a link you can put in front of anyone**, which matters enormously for something people will want to send to someone mid-argument. No install friction, no store cut, patch a confusing beat the same afternoon.

**Caution:** coffee revenue is small and slow, and reading it as a verdict will mislead. **The real play-test signal is completion** — do people reach the end, and can they say afterward what it said. Donations are a bonus, not a scoreboard.

**Chapters as events.** Each new chapter is a new mechanism snapping in, which is naturally an occasion — trailers, teasers.

**The title is the biggest asset.** People's eyes light up at *Humans vs Billionaires*, and the lighting-up is **recognition, not curiosity** — they already believe it, they've just never seen it put on a box. So the title is doing the marketing, and the game's job is to not disappoint it. **The risk:** someone arriving expecting a satisfying kick at the rich and getting a lesson instead. The machine handles that by making them complicit rather than righteous — but it's a turn that has to be *earned*, and the first ten minutes should feel like what the title promised.

**Web vs app.** Decide deliberately rather than by drift. Web-first, keep the app option live, let the play test say whether anyone's asking. *(Dev team has been told an app may come — keep that live.)*

**The size budget.** Floppy-disc instinct still fires, and it's doing a favour here: web games have a real budget, not disk capacity but *download-before-they-lose-interest*, which is a stricter master than a floppy ever was. And the constraint suits the material — clean line art, mechanical sound, ornament that carries meaning. Stylistically right *and* tiny to ship.

**Merchandise.** The **model kit of the machine** is the correct object and sharper than it looks: buying it means assembling the extraction machine yourself, part by part, and finding that every piece fits — which is exactly what the game does to you. **The object is the argument**, and it keeps making it from a shelf. Pins **recruit**, because they're worn and someone else starts the conversation. Posters, comics.

**Kickstarter after the audience, not before.** Campaigns fund on an existing list. The free web piece builds the list; the list is what a campaign runs on.

### 10.5 Dramaton integration

*(22 Aug.)* Interaction points throughout the tutorial, using game choices to check comprehension. Doug's three-way branch:

- **They got it** — proceed, maybe skip the reinforcement beat.
- **They need more** — re-illustrate from a different angle.
- **It's new** — full teaching sequence.

Natural Dramaton structure, and a good test case for the engine: a tutorial is exactly the kind of thing where scene selection driven by inferred player state earns its keep.

**Open:** does this use AGENCY/WITNESS scene typing? The tutorial is mostly WITNESS (you watch) with AGENCY beats (you grab a knob). The CHEER/BOO/SILENCE/WALK-AWAY audience palette is unused here but might fit the propaganda sequence of §8.2.

---

## 11. The controls and the smallest machine

*Purpose of the session, in Doug's words: "figure out the machine at the smallest level. What does it mean to have the machine starting in one person or two people, and what does the machine look like?"*

### 11.1 The smallest machine: one person and one jar

At one person there's no machine, only a **loop** — she works the quern, it stops when she stops, output equals effort, nothing accumulates. A pair of hands with a nice handle. **The first genuinely machine-like thing is the jar.** The moment she puts grain by for winter, something exists that keeps working while she sleeps.

*Doug: "That's exactly what I wanted — I now see a correspondence between the dragon's hoard, which is a want-hoard, and one person. Hard to call it a hoard, although it can become a hoard if you monkey with the little machine. That would be a lovely demonstration."*

**The jar and the hoard are the same object at different scales.** The dragon isn't a different species from the woman with grain put by; it's her jar, run without a stopping rule, for a thousand years. **This is also the answer to §1.2's missing CAPITAL** — or rather, it's the answer to the hoard side of it, and it makes the hoard/capital distinction demonstrable rather than assertable.

**Parts list — all ordinary, no new ideas** (the discipline: people already deal with all of these; we're reminding them, then running it forward until it turns into a dragon):

- **Work** *(renamed from "effort", decided 25 Aug — effort sounds like a stat; work is what people actually do and carries the moral weight)*. Finite, refills with rest.
- **Consumption** — the ceiling. She can be full. Work in, satisfaction out, then *done*.
- **The jar** — the only part that persists across the sleep. Everything else resets nightly.
- **The leak** — grain rots, the jar leaks. Storing costs something, so there's a *right* amount to store, so there's an amount that's too much. Without spoilage the jar is trivially good.
- **The jar can be improved** — better vessel, drier room, salt. Each improvement lowers the leak. **When the leak reaches zero, the stopping rule quietly disappears.** Grain rots; a claim doesn't. **The player makes the jar too good and the hoard appears without anyone deciding to be a dragon.**

*Why spoilage is required and not a resource-management tax:* everybody has had a bag of something go off in the back of the fridge. You're not teaching economics, you're reminding people of a thing they already know, and *then* running it forward until it turns into a dragon. *(Doug: "people will understand that because they deal with that, and we're not really introducing any new ideas.")* **That's George's method exactly — one new condition at a time, never two.**

*The capital question, asked and not yet answered:* does anything on the island get better with work? Right now she can store grain, but if the machine is ever going to grow, something has to be worth making that isn't food — the tool, the boat, the drying shed. **That is capital, quietly, without the word.** Doug's response was to redirect to skills rather than tools, so the one-person tool question is still open (§14).

At two people: **skills and tools** on top (§5.3 — skills stick, tools travel). Six parts total, all familiar.

*Possible third thing the knobs feed, not itself a knob:* a **choice of what to build**, which only unlocks when the gap exists. No surplus, no options. **Possibility is downstream of not eating.** (Not yet ruled on.)

### 11.2 Two knobs

**Two knobs, not one** *(decided 25 Aug)*. **Work** and **consumption**, starting **coupled: work equals consumption.** *Doug: "I think that's very understandable to people, and it gives you two variables to play around with."*

~~*The one-dial version, considered and rejected, kept here because its reasoning is still good:* a single slider with work at one end and consumption at the other, so you're always choosing where on it to sit. The first thing the player ever does is the whole game in miniature — work more, eat less, something is left over, and that leftover *is* the jar; storage never has to be introduced as a separate part. The dial has no red zone: pushing toward work is storing against winter and you're right to. Only much later, when the leak has been engineered away, does the player notice they've held it at the same setting for a very long time and it stopped being about winter. She starts with the dial pinned all the way to consumption — eat everything, correctly, because there's no jar yet — and the first event isn't a choice but the *ceiling arriving*: she's full, the dial won't go further, and there's still daylight and still work in her. Prudence isn't a decision; it's what's left over when you can't eat any more.~~ *(Superseded by two knobs. **The ceiling-arrives opening and the no-red-zone principle survive and should be carried over.** Doug's stated reason for two: "two variables to play around with" — the one-dial couples them permanently, which makes decoupling impossible to feel.)*

The game at this level is entirely about **decoupling them.** Work like a dog and don't eat it — that's the surplus, and it appears because *you* pulled the knobs apart, not because the game handed you a resource. Both failure directions are legible without explanation: work high / consumption low, you build a hoard and you're miserable; work low / consumption high, you eat the jar.

**The knobs stay where you leave them** *(decided)*. A knob that springs back means you have to keep working; **a knob that stays put is already a tiny machine doing your wanting for you.**

**What they look like:** carved and painted wood, Mia's own work (§5). On the work knob, **an arm flexing — the traditional Armstrong bicep pose.** On the consumption knob, **a mouth. Why not?** Both readable in half a second, both a bit silly, both *bodies* — which matters, because needs belong to bodies and claims don't.

### 11.3 Why wood, in full

*(Doug's ruling, 25 Aug; the argument is Claude's, Doug accepted it.)*

Doug's first image was a **porcelain** knob — cute, "a nice cottage thing" — and porcelain is already in the doc for the quern (§5). He reconsidered on the spot: wood, carved, painted, *"more in keeping with the materials and technology that she already has."* That's the realism reason, sufficient on its own: porcelain is *fired*, which means kilns, clay sourcing, a supply chain that hasn't happened yet. Wood is what one person alone can make with a knife and time.

**But the better reason is economic. Carving a knob takes hours she could have spent gathering.** So the decoration isn't decoration — **it's proof she was fed enough to have an evening. The controls are evidence of the surplus.** That's the *thrive* rung of the needs ladder (§4), sitting in the interface where the player's hands are, before a word of it has been said.

It also sharpens the aesthetic clock (§5.6) from the bottom up: carved wood, painted by hand, slightly uneven → cast and stamped → brass with no maker's mark on it anywhere. And it sets up the loss: by the time the controls have turned to cold brass and rolled steel, the player has held these exact two carved knobs for hours and feels it in their hands.

**Dyo's layer is wood too, but finer.** *(Doug: "crafted much much more finely rather than being rough — we can imply, we don't have to say, that the second woman has learned the skill of woodworking.")* Show it, don't say it. That's the specialisation hinge (§5.2) landing in the interface — the controls stop being made by whoever needs them and start being made by whoever's *good at it*. And the honest, slightly uncomfortable part: **the fine knob is genuinely nicer.** The player is glad it happened. It's the machine's first good offer, and it must be a real one.

Whether the *quern* goes wood too is open (§14). Whether Mia keeps adding to her carvings when she has slack was asked and not answered.

### 11.4 Teaching by animated situation, not text

Turn up work and not consumption, and stuff starts overflowing and spilling on the ground, and **rats** turn up to eat it. Nobody tells you spoilage exists; **the rats explain it for free.** Then the jar arrives as the *answer to a problem you already have*, not as a new mechanic. Beaver line practically writes itself: looks at the spilled pile, looks at you — *"I've got enough."* Wanders off.

**The controls are parts of the machine, not a UI floating over it.** So the interface has the same aesthetic clock as the machine: handmade at the start, manufactured by the end. And as the machine grows, **controls get further from the work.** The treadle becomes a lever that makes someone else treadle. Then a dial. Then a signed slip of paper. **The distance between your hand and the labour is the game's real progress bar**, and nobody has to say so.

*Doug's worry, on record:* "I don't want it to get too detailed — but on the other hand, if it sucks people in…" *Claude's answer, which he didn't dispute:* everything added is a familiar object doing an obvious thing — two knobs, a jar, rats, faces, a button. That's not complexity, it's depth. **The complexity risk starts when a part needs explaining before it can be used.** Proposed as the test for every future part. *(Compare §2.5's one-spoken-sentence rule, which is nearly the same test arrived at from accessibility.)*

### 11.5 The cruelty, in the interface: rods from above

**The knobs don't disappear. They get set from above.** Zoom in and there are the same two carved knobs the player spent the first hour turning with their own hands — and now there's a **rod** coming down from somewhere out of frame, the work knob pinned high, the consumption knob pinned low. **The second seat, the compensation principle and the whole thing, in one image, with no text.**

**She can still quit** *(decided)*. Full travel on both knobs, both directions. **The machine never has to lock the knob — it just has to make letting go of it worse.** Drop work to zero and she's outside the payment schedule by evening, and everyone in a seat above can see what that looks like.

**The model worker is the counterweight:** she can push work *past* what's set from above and it pays her a little. Not much. Enough. Nastier than being pinned, because now the high setting is partly her own hand on the knob — and the machine gets to say, correctly, that nobody made her. **The knob is free. The prices are not.** *(Open: whether the model-worker bonus exists at one person or only once there's someone to compete with.)*

**The disengage button** *(decided)*. A big honest button, plainly labelled, always visible from the very first minute of the one-person level — when it does absolutely nothing, because there's nothing to disengage from. **It was always there; it got *heavier*.** The pressures show on the button itself, not in a dialogue box: early, pressing it means she rests; later it has to be held down longer; later still there's a small crowd of consequences hanging off it — people whose knobs are set by yours. **Pressing it must always work.** No "are you sure." **The horror isn't that you can't leave. It's that you can, you know exactly what it costs, and you keep not pressing it.**

**More than one at the bottom.** Up to six workers in the zoom-in, all rodded to one lever above. The player upstairs sets the lever without seeing any of them unless they choose to zoom. **The distance is the design** — §3.1's sanitising layer, made mechanical.

**Consumption can be set from above**, and there will be pressure to set it low. Low consumption → **low morale → lower output** → maybe **revolt and death.** So the operator has a *selfish* reason to feed them: the humane setting and the profitable setting are the same setting, **right up until there are more people available at the bottom, and then the correct move becomes running them down and replacing them.** *Doug: "The art will be cute, but the outcomes should be devastating."*

**The empty seat.** When one dies: **a frame or two of dying** — enough that you saw it, short enough that you can't dwell on it. The machine's own attention span, rendered honestly. Then an empty seat. Fiddle with some knobs and it can be refilled — and refilling should **cost something**, so the player learns the price of a person as a line item (§9 arriving through the interface). *Open:* whether replacement happens on a timeline or on demand.

### 11.6 Happiness is a face, not a meter

Happiness / the good-evil register exists from the first person, and **is not a knob.** Not a morality meter either — the moment it's a meter the player optimises it and it becomes a score. Instead: **a face on the machine, one per person, at their station**, in Mia's hand-carved style at the bottom. Only visible if you zoom. From the top layer there are no faces at all, just the lever. **Happiness isn't measured. It's witnessed, and only if you go look.**

*Doug: "It opens the mechanism of the player trying to maximise happiness within the system — and imagining what happiness in another system could be, when Beaverton is discovered."* The player *will* try to be a decent operator, and the system will let them get close. **Then the ceiling:** a level of happiness you cannot reach from inside, no matter how kindly you set every knob, because the funnel takes its cut first. **That's the moment Beaverton appears — not as a plot event but as a comparison.** Zoom on a face somewhere else, running on different rules, happier than your best possible setting. **The Georgist argument delivered without a word of theory, landing as an injury rather than a lesson.**

> **Superseded from 22 August, and what should survive.** The 22 Aug design had happiness as a **dial**, present from frame one, visible on the one-person island, swinging up when Dyo arrives and they share — and then, gadget by gadget, **the happiness pipe gets rerouted, capped, and quietly removed for parts.** The crucial note there: **nobody ever decides to remove it.** There is no villain's meeting where happiness is voted down. It simply becomes inefficient, and inefficient things get optimised away. **That is a far more damning story than a conspiracy, and it is true.**
>
> The face supersedes the dial for the reason Doug gave — a meter gets optimised. **But the unplugging drama has no home in the face version yet.** The faces don't get removed for parts; they just stop being looked at. Which may in fact be the better version of the same point: the machine doesn't delete happiness, it deletes the zoom. **Not ruled on. Flagged in §14.**

### 11.7 Slavery, starting at the individual

Introduce it at the individual, not as a special historical evil bolted onto an otherwise clean machine. In the parts already built: **slavery is what happens when the consumption knob and the disengage button are both taken.** The work knob stays. **No new mechanism.** Even then the seat pays something — not being killed (§6.1). At the system level it's what makes everyone above defend their seat harder, because now they can see all the way down.

*Placement still later, not the opening (§14).*

### 11.8 The burden beat

*(Doug: "Since I'm very disabled and have had to wrestle with disability Social Security, at some point I want to zoom in on somebody who, I guess, is a burden.")*

Zoom in on a station: a face, a work knob, and **the knob's travel is short.** Not zero — short. She can work, some days, some amount, and it costs her more than anyone else in frame. The machine's arithmetic calls the whole person negative — **and it isn't wrong *by its own rules*. It's counting correctly. The rules are what's obscene.**

Behind her: a desk, a form, someone applying a rule they didn't write to a body they can't see, and **the rule requires you to prove you're worth nothing.** The sanitising layer with a case number.

The counterweight is already in the doc — the parent in §7.1 who takes a negative payment for a decade and takes the seat anyway. Put beside the burden station, that shows the machine to be one that **misses things**, not merely a cruel one.

**Witness first, operate later** *(decided 25 Aug)* — the player sees it as a zoom-in, and later sits at the desk. **Disability Social Security isn't cruelty, it's a form; that's the thing only Doug can bring to it.**

### 11.9 Look at your own life, landing on the designer first

*Doug, 25 Aug: "As I've started working with this, I deleted my Amazon app because I realised it's just making it very convenient to steal from poor people."* *(Dictation gave "four people"; read charitably.)*

Noted as evidence the argument has teeth — the "look at your own life" beat arrived through **building the funnel**, not through being lectured. Which is the case for §6.2's timing rule, made on the designer before it's made on the player.

---

## 12. The William arc

**You don't segue from Dragon's Egg to William. The scale changes and the parts don't.** William isn't a new story; he's the island machine with an army bolted to it. The camera pulls back — and it's England. Same machine, somebody else's layers stacked on the bottom ones. The Domesday Book is just the zoom-in: **a man with a ledger writing down every knob in the country and who sets it.**

### 12.1 Chapter ordering: William before Leopold

*(22 Aug decision, confirmed by everything in the 25 Aug material.)*

The tutorial ends (§8.2) with the greed machine sending guards across water because it cannot tolerate a happier neighbour. **William is that same impulse with a date attached.** The player has just watched the machine generate an invasion as an *output*, and then the game hands them a real one.

**The gradient it produces.** Doug's framing: the tutorial's island is **empty**, William's island is **full**, and Leopold *personally owned a country as private property.*

1. **Land** — the tutorial. Nobody is there. The moral question is only latent.
2. **Land plus people** — William. The land comes with the people already on it, and they become part of the grant.
3. **People as the crop** — Leopold. The land is incidental; the extraction is human.

**What William specifically illustrates** (Doug): the naked colonization motive — *"I want, I'm strong, I can take"* — with no laundering in front of it yet. Plus the machinery that makes it stick: allies who must be paid, and sycophants who must be kept (§6.3).

**Production note:** as William's rule consolidates, **label the stages on screen with the terms the player already learned in the tutorial.** Payoff for the abstraction move in §2.3.

**[PENDING]** A name for the tutorial → William → Leopold arc. Not selected. On the table, all Claude's: *The Enclosure Ladder, The Swallowing, The Harm Gradient, Three Landings.*

### 12.2 The player arrives as a soldier

*(Decided 25 Aug.)* Not the conqueror holding the machine they built; not an heir inside a machine built by the dead. **The second seat with a weapon** — the recruitment beat of §5.4, except now the alternative to *be with me* isn't a worse job, it's being on the receiving end.

Honest history: **William didn't conquer England, some seven thousand men did,** most of them promised land they didn't have at home. The compensation principle in its purest form. The player doesn't choose to build the funnel — **they carry it ashore.** Bottom of the new machine, top of the old one, which is where most people actually live.

*Why neither conqueror nor heir:* the conqueror framing is complicity and the heir framing is inheritance, and they're different games; **the soldier is both at once.**

**And the devastating zoom-in comes loaded:** after Hastings the player gets their land. A few hides in Yorkshire, say. With people already on it. **Whose knobs they now set.** *Open:* does he get to keep it, or is that where he finds out what *his* seat pays? Also open: do we see his family again after he ships out?

**Start with two people — a little family.** The player already knows that machine intimately; seeing it working in a Norman village, unchanged, before anything bad happens, is what makes the recruitment land. Then the knob gets moved, and he gets recruited.

### 12.3 The ladder

Met in the order a soldier would: **the recruiter — the friendliest man in the game.** The sergeant — not cruel, has a quota. A knight who needs bodies. A baron who needs the knight. Then William, who doesn't need anything and wants everything.

*Doug: "All the people near the top had big wants."* **Wants get bigger going up while the reasons get thinner** — at the bottom, a family and a moved knob; at the top, a man who cannot say what would be enough. Same ladder, and somewhere on the way up the justifications stop being about eating. Dramatic scenes at each rung lay out the machine explicitly as the player discovers what's happening to this person.

*(Decided 25 Aug, desk debrief: the ladder rungs are **recurring archetypes** — a small permanent cast defined by function, re-costumed each era. The Recruiter, the Sergeant, the Knight, the Baron under William return as their Leopold, Capone and Musk equivalents chapter by chapter. **The reasoning: same seat, different hat is the self-similarity argument of §7.2 walking around in costume** — the player recognises the Recruiter's smile in 1066 and again in a Brussels drawing room, and the recognition does the teaching without a word of narration. Claude offered three alternatives, kept with their surviving arguments: **era-specific historical casts** drawn from the quote bank's VILLAIN voices — rejected as the cast structure, but the archetypes should be costumed and scripted from exactly that documentary material, era by era; **the seats themselves as characters** — no fixed people, occupants churn, the position is the personality — rejected as too abstract to satirise, but its core claim is true in-fiction and the archetypes should embody it: **whoever sits in a seat starts talking like the seat**; **an animal fable cast** — rejected: the dragon and the beaver stay the only animals, which is what keeps them legible as outside the machine. **Still unwritten as people, which is now the actual work.**)*

### 12.4 Playing William

**After the ladder, the player plays William** — extracting as much wealth and power as he can by squeezing at every level and using violence. It works because *you've met everyone*: the barons you squeeze have faces because you served under them; the village you tax is the shape of the one you came from. The player as William mostly just presses for more, and it arrives.

**He should succeed. No comeuppance.** Domesday gets written, the land is held, the holding outlasts him by a thousand years — the actual fact and the reason the chapter exists.

**Zoom from William to the family — the one image the whole game is aimed at.** He sets something at the top: a number, a demand, a signature. The player, who is him, follows the rod down through baron, knight, reeve, and arrives at **two carved wooden knobs they turned themselves in hour one, now pinned.** No dialogue. The beaver says nothing either. Because of the nesting, **you don't draw the whole machine** — a lever, a rod going into the floor, the option to follow it. The player supplies the rest from memory. **Cheap to build, devastating to look at.**

**Make the high score hard** *(decided 25 Aug)*. If maxing extraction is easy, the player learns nothing; if it's genuinely hard, they have to think like the machine to win, and **that's the education.** Two strategic levers: **rage-and-demand** (the king gets enraged and demands unreasonable things from everyone below — a spike, then morale drops, output falls, seats empty) versus **the compensation principle applied deliberately** (increase what the layers below get, just enough that they hold, and hold hard). **The high score requires being a good employer for entirely selfish reasons — a far nastier thing to teach than cruelty.** Possibly game-wide settings, in Dramaton terms. And the player should be able to watch **the way it really happened** run alongside their own knob-turning.

**The arc, in one line** *(Doug, at the debrief)*: **build the machine in Dragon's Egg; operate it to maximise yield during William.**

### 12.5 After William: follow the land forward

Through feudalism, a nod to capitalism (**the funnel doesn't change, only the paperwork does**), ending on today's Britain and the Americans still benefiting from William's victory. A large share of England is still held by descendants of the 1086 list — Cahill and Shrubsole document it. **This is "look at your own life" landing once, late, with names.**

*Open:* whether the player still holds knobs in this coda or becomes a spectator.

**This is also where §8.3's new mouths belong** — the patent, the platform, the spectrum licence, drawn as the funnel in different paint, carrying the argument into the Musk chapter.

### 12.6 Leopold, and the knob that stops being comfortable

The mechanic doesn't change — still work and consumption, still rods from above, still a face you only see if you zoom. **But the *labels* on the settings become unspeakable**, and the player chooses between them with the same hand that carved a wooden knob in hour one.

*Doug: "How to encourage rubber production — do I cut off hands, or whip them?"*

**The machine's arithmetic will genuinely recommend one of them** — one of the horrors on that dial is *efficient* — **and the player will find it, because the score is hard and they're trying to win. That recognition is the chapter.**

**Consequence, not a dry number, but short:** a frame or two, like the dying seat. **Lingering makes it spectacle; a glimpse makes it complicity.** Settings sourced from the Casement Report, all documented. The beaver's behaviour here: §3.3 — he stops commenting.

**This vindicates §1.1.** The teaching was pulled out of Leopold so that Leopold could do this instead, and it could not have done this if it were also carrying the pedagogy.
---

## 13. What the machine is for

*(22 Aug. The question the tutorial exists to raise.)*

**Who decides what the machine is for?**

Doug's answer, flat: **"Right now, it's the person with power. The people with power."**

The objective function is not voted on. **It is set by whoever's hand is on the crank.**

**And this closes the loop with §6.3:** the libraries and the crowns exist precisely to stop anyone asking who is holding the crank. Prestige laundering is not vanity. **It is the mechanism that protects the objective function from being changed.**

It also closes the loop with §3.5: if the universe's motive is *why not* — no purpose, no plan, no natural order — then there is nothing to appeal to. The objective function is somebody's choice all the way down. Which is bad news and good news in the same sentence.

### 13.1 The second ending: metamorphosis, not comparison

*(22 Aug. Needs reconciling with §11.6's Beaverton-as-comparison, which does the opposite thing.)*

The family grows and splits off to found different cities. **One of the leaders is disgusted by how central greed was** to the original society, and founds a social democracy. Later, a descendant of the original family gets fed up, leaves, and stumbles into this place where people are "generally happier and healthier, and have longer lives." Someone there says: *our goals are different. We want satisfying lives with little hierarchical pressure.*

**Critical qualifier, Doug's own: it is not perfect.** The happier machine still has toll gates and hierarchy — it just doesn't let the dragon form. This keeps the sequence from collapsing into a utopia lecture, which would lose the audience the tutorial spent twenty minutes disarming.

**Rejected: side-by-side comparison.** Two machines running next to each other implies two different economies.

**Adopted: metamorphosis.** *The same machine, re-forming on screen when the happiness goal is revived.* Pipes reroute. The hoard chute redirects. The dragon's nest never fills. **This is the whole argument in one animation: nobody built a different economy. They turned a dial. The machine was always capable of this.**

> **Live tension.** §11.6 has Beaverton arriving precisely *as* a comparison — zoom on a face somewhere else, happier than your best possible setting. That is the thing 22 August rejected. **Both may be right at different moments:** comparison is how the player first *learns* the ceiling exists; metamorphosis is how the remedy is *delivered*. But nobody has decided that. Flagged in §14.

---

## 14. Open questions, ranked by urgency

Merged from both documents. Resolved items are struck with their resolution, so nobody re-opens them.

**Blocking:**

1. ~~**SURPLUS** — what happens the first year the island produces more than it can eat?~~ *(Answered 25 Aug: the jar, the leak, and the decoupling of the two knobs — §11.1, §11.2. This was the #1 blocker on 22 August and it is now the strongest part of the design.)*
2. **How does the new machine relate to the twelve existing variables?** Replace, absorb, or underlie? Several hundred tagged Orders in the research brief depend on the current vocabulary and nobody wants to re-tag them by hand. **Now the top blocker.** §1.2.
3. **The register question — funny or menacing?** The two documents disagree about the fundamental tone of the machine. §2.1. Everything visual depends on it.
4. **What form does the generous force take inside the machine?** The beaver has been ruled *never* a game piece (§3.2), but 22 August wanted the egalitarian impulse to be able to become "extremely powerful" in some runs (§3.4). Those two rulings have not been reconciled, and **if the dragon is the default (§8.1), the counter-force is the entire second half of the game.**

**Structural:**

5. **Where does CAPITAL enter?** §11.1 asks it directly — does anything on the island get better with work? — and leaves it open. The hoard side is now answered by the jar; the capital side is not.
6. **Do the 5/10 thresholds and the morale curve describe the same mechanism?** §10.2 vs §11.5. And five and ten percent *of what*?
7. **Comparison or metamorphosis?** §13.1 vs §11.6. Possibly both, at different moments — not decided.
8. **Where does the unplugging of happiness live** now that happiness is a face rather than a dial? §11.6.
9. **How do the abstracted icons (§2.3) relate to the carved knobs (§11.2)?** Two different control vocabularies, unreconciled.
10. **Is the enslavement beat on-screen or implied?** Agreed it belongs later, not in the opening. Placement still undecided, and it commits the tone. §11.7.
11. **Is survive / feel good / thrive the literal scoreboard?** Partly answered from the other side — happiness is a face (§11.6), the William score is extraction made hard (§12.4). Whether the ladder is *also* scored is open.
12. **The primitive skill tree** — mentioned as needed to make the flow make sense, not yet built.
13. **Nobody-shot-Stalin as a mechanism** — the coordination trap as a second machine. §6.2.

**Detail, ruled or partly ruled elsewhere:**

14. ~~**Do skills live in a person or can they be traded?**~~ *(Answered: skills stick, tools travel — §5.3.)*
15. ~~**Does woman two have distinct skills?**~~ *(Answered: yes, earned by repetition — §5.3.)*
16. ~~**Does the atom carry dials beyond happiness?**~~ *(Answered: work and consumption — §11.2.)*
17. ~~**Does the player operate the machine or dismantle it?**~~ *(Answered: build it in Dragon's Egg, operate it as William. Dismantling remains the remedy's business, placement open.)*
18. ~~**Which scale is zoomable first — is the family the tutorial?**~~ *(Answered: the family is a beat inside Dragon's Egg — §7.1.)*
19. ~~**Do the strings get more or less visible?**~~ *(Answered: rods, more visible, but only when you zoom — §10.3.)*
20. **Wood or porcelain?** Knobs are carved wood (decided). Whether Mia's quern stays Delft porcelain and silver, or the whole one-person machine goes wood, or porcelain moves up to Dyo's layer — left open on purpose.
21. **The empty seat: replacement on a timeline, or on demand?** §11.5.
22. **Post-William coda:** does the player keep the knobs, or watch? §12.5.
23. **Do skills exist at one person**, or only switch on when there's someone to be better *than*?
24. **The "what to build" choice** — a third thing the knobs feed, unlocked only by surplus. Proposed, not ruled on. §11.1.
25. **Tools at one person** — does anything get better with work before Dyo arrives? *(Same question as #5, from the interface side.)*
26. **The soldier's land** — does he keep his Yorkshire hides, and do we see his family again? §12.2.
27. **Does Mia keep carving** when she has slack, or are the knobs finished once?
28. **The model-worker bonus** — at one person, or only once there's competition? §11.5.
29. **Does Beaverton get it right, or learn the hard way?** §8.1.
30. **Where exactly does "look at your own life" land, and how many times?** Once, late, is the current bet.
31. **Is the player told the "mostly"?** §3.5.
32. **Recurring same-two-kids motif?** §7.3.
33. **Does the narrator say "want," or does the cartoon show it?** §4.2.
34. **Does want arrive with the surplus or before it?** §4.2 — §11.1 leans toward *with*, not formally ruled.
35. **Name for the original village** — Greedville or Breedville, unconfirmed. Beaverton is settled for the other town.
36. **Name for the tutorial → William → Leopold arc.** §12.1.
37. **Does the tutorial use AGENCY/WITNESS scene typing?** §10.5.

**Research and retrieval:**

38. **Find Doug's unicorn short story.** §3.1.
39. **Find Doug's Microsoft goodbye letter.** §6.2.
40. **Source the modern critiques of George properly.** §8.3.
41. **Magie's prosperous rule set** — detailed rules and setup. §2.4.

**Transcription confirmations outstanding:**

42. **"thunderous"** female God-voice — dictation gave "fundress." §3.5.
43. **Greedville / Breedville.** §8.1.

---

## 15. Claude's additions, flagged for cutting

Everything listed here is Claude's, not Doug's. Cut freely; nothing downstream depends on any of it. This is a trust mechanism — it means Claude can contribute freely in the body without the document quietly becoming Claude's.

1. **The Landlord's Game provenance** — that Monopoly descends from Magie's 1904 Georgist teaching game. §2.4. *(Separately documented in the research thread, but Claude brought it into the session.)*
2. **The wage-fund observation** — that §5.1's island atom is already George's demolition of the wage-fund doctrine, arrived at independently. §8.3.
3. **The Chernabog identification** and the reason the cartoon/scary contrast works. §3.7.
4. **The proposed register reconciliation** — that the machine is funny while being built and menacing once finished. §2.1. **This is the biggest unlicensed contribution in the document and should be ruled on rather than absorbed.**
5. **The three-way toy vocabulary** — rent, leverage, property law. §7.3.
6. **The beaver-trapping note** and the beaver-dam-as-unowned-capital rhyme. §3.4.
7. **The swarm** as a possible shape for the generous force. §14 #4.
8. **The four-stage need/want table.** §4.2 — the content is Doug's, the arrangement is Claude's.
9. **"The machine prices in starvation"** as the reading of the 5/10 band. §10.2.
10. **The silence of the beaver under Leopold.** §3.3 — Doug ruled on it and kept it, but Claude proposed it.
11. **The strings-pull-rods-push asymmetry.** §10.3 — proposed, and Doug corrected it. Struck, but the correction is the better idea and it came out of the wrong one.
12. **The wood argument in full** — §11.3. Doug ruled wood on realism grounds; the surplus-evidence argument is Claude's and Doug accepted it.
13. **The four placement options for the family beat** and the three alternative cast structures. §7.1, §12.3 — Doug chose among them.
14. **All proposed arc names and alternate tutorial titles.** §12.1.
15. **The one-dial control scheme.** §11.2 — proposed, superseded by Doug's two knobs.

---

## 16. Ideas raised and set aside

Kept so nobody re-proposes them blind. Each says where the replacement lives.

**From the 22 August session:**

- **Teach the model inside the Leopold chapter.** Rejected — the horror crowds out the pedagogy. §1.1. *(Vindicated: §12.6.)*
- **Open with a family of four.** Superseded by the single hungry person. §5.1.
- **Lead with land as the first concept.** Rejected in favour of hunger-first, with land arriving as the answer to a question the player already feels. §5.1.
- **Person two is a man.** Rejected in favour of the wish gag / the braced-for-a-man beat. §5.2.
- **Ninety-second intro.** Superseded; twenty minutes. §6.4.
- **Howard Hughes as the madness image.** Rejected in favour of the dragon — though Hughes survives as the reference for the sycophancy layer. §6.3.
- **Side-by-side comparison of the two economies.** Rejected in favour of metamorphosis. §13.1 — but see the live tension there with §11.6.
- **The single tax as the machine's built-in solution.** Demoted from magic lever to one historically-situated gadget. §8.3.
- **The unicorn as the generous figure.** Too precious. Replaced by the beaver. §3.4. *(The unicorn survives elsewhere — §3.1 has the dragon fantasizing about being one.)*
- **A whale as the generous figure.** Claude's; not taken up. Superseded by the beaver, which does the same work while also *building*.
- **"The egg implies inevitability."** Claude's objection; overridden by Doug's default-not-fate reading. §8.1. Recorded because it's the objection a reader will raise.
- **Alternate tutorial titles** — *The First Hunger, How to Build a Dragon, The Clumping, Nobody Made the Land.* All Claude's; "The Dragon's Egg" stands.
- **A single riot floor.** Corrected to two thresholds. §10.2.
- **Nesting as the whole composition rule.** Doug's own caveat, now fully cashed out. §7.2.

**From the 23–25 August sessions:**

- **"Two people decide they're more powerful than a third."** Corrected to **recruitment** — not symmetric coalition but one person conscripting a second with a differential reward. §5.4. **The correction is one of the strongest things in the design.**
- **The one-dial control scheme.** Superseded by two knobs; the ceiling-arrives opening and the no-red-zone principle survive. §11.2.
- **Strings.** Superseded by rods. §10.3.
- **Porcelain knobs.** Superseded by carved wood. §11.3. *(The quern's material is still open.)*
- **"Effort"** as the name of the first knob. Renamed **work** — effort sounds like a stat. §11.1.
- **Family first / family as free tinker-toy / family as late revelation.** All three rejected as the placement; parts of each survive. §7.1.
- **Era-specific historical casts / seats-as-characters / an animal fable cast.** All three rejected as the cast structure; parts of each survive. §12.3.
- **The strings-pull / rods-push asymmetry.** Claude's; corrected by Doug — a rod does both. What survives: one member carrying both offer and force. §10.3.

---

## Glossary

*One line each, section-keyed. Vocabulary rules from HOUSE RULES apply project-wide: a unit of play is a SCENE, never an episode; a missing ability is an ALLIGATOR someone faces; tools that grant abilities are FAMILIARS.*

- **The machine** — the Rube Goldberg status quo; menacing, nothing malfunctions (§2). *Register contested — §2.1.*
- **The dragon** — want without a ceiling; doesn't build the machine, it accretes beneath it (§3.1).
- **The beaver** — Greek chorus beside the machine, never in it; register clock, one cry (§3.2, §3.3).
- **Dragonet** — the small want-without-stopping-rule already present in one person alone (§5).
- **The Dragon's Egg** — chapter one, and the cosmic egg that hatches the universe; *mostly* produces a dragon (§3.5).
- **"Why not?"** — the motive of creation, delivered in a thunderous female God-voice (§3.5).
- **The funnel** — rent as first claim: everything falls in before anything is divided (§8).
- **Painted signs** — the machine's justifying stories, read aloud by the beaver (§8). *Same object as prestige laundering, §6.3.*
- **Prestige laundering** — libraries, crowns, ceremonies; non-load-bearing, and yet remove it and the marbles stop (§6.3).
- **Seat / second seat** — a position paid just enough to be worth holding; the second seat is the first cruel part (§5.4, §6.1).
- **Compensation principle** — every subordinate gets just enough that refusing looks worse (§6.1).
- **Deference tax** — the daily payment of acted inferiority, upward and downward (§6.1).
- **Recruitment** — the origin of hierarchy: conscription with a differential reward, not coalition (§5.4).
- **Ration tokens** — money as rationing instrument, not store of value (§1).
- **Work / consumption knobs** — the two carved controls; start coupled, the game is decoupling them (§11.2).
- **The jar / the leak** — storage and spoilage; leak at zero quietly deletes the stopping rule (§11.1).
- **Rods** — the linkage from above that sets knobs; push AND pull; visible only when you zoom (§10.3, §11.5).
- **Disengage button** — always present, always works, gets heavier (§11.5).
- **Model worker** — pushing work past the pinned setting for a little pay; the hand on the knob is partly her own (§11.5).
- **The burden beat** — the short-travel knob and the desk behind it (§11.8).
- **Faces** — happiness witnessed per person at their station, never metered (§11.6).
- **The riot band** — five percent starvation, ten percent revolt; the operating range between them (§10.2).
- **The ladder / archetypes** — Recruiter, Sergeant, Knight, Baron; recurring cast re-costumed each era (§12.3).
- **Beaverton** — exit made visible; grows its own funnel unless the lever is founded in (§8.1).
- **Dragon prevention** — the single tax restated for a child; zoning laws for hoards (§8.1).
- **Aesthetic clock / machine is geology** — materials date each layer; nothing is replaced, everything accretes (§5.6).
- **Mia, Dyo, Tria** — the island women, in order of arrival (§5).
- **The abstraction move** — building the literal contraption, then shrinking it to icons out loud (§2.3).

---

## 17. Notes on what's strongest

**The inversion.** Making the status quo the contraption converts a policy argument into a spatial one — the player *sees* the overbuilt thing and *sees* that one lever replaces it.

**"Two people decide they're more powerful than a third" — corrected to recruitment.** The correction made it sharper: not symmetric coalition but one person conscripting a second with a differential reward. Relocates the origin of inequality from greed to recruitment, which is more accurate, harder to argue with, and **means the game never needs a villain.**

**The dragon that doesn't design the machine.** Solves the problem that sinks most political games — a designed conspiracy is easy to dismiss; emergent extraction is not.

**Want as a need that lost its ceiling.** Derives the dragon from prudence rather than positing it. The dragon isn't an intruder in the story; **it's what a need looks like after it loses its stopping rule.** This is also the strongest answer to the Manichaean worry (§3.6): a dualism needs two origins, and this has one.

**The family as counterexample.** Turns the nesting section from a metaphor into a proof: a nested machine that sustains negative payments and would be monstrous if it priced its members. So the question isn't *can this work* but *why does it stop working when you scale it.*

**The tinkerable component plus the marionette rig.** The clearest interaction thinking in the sessions, and together they deliver the game's core recognition mechanically rather than rhetorically.

**Two knobs and a jar.** Work, consumption, jar, leak — four familiar objects, no new ideas, and the dragon is *derived* from them rather than introduced. The same two carved knobs, later pinned by a rod from above, carry the entire argument from hour one to Leopold without a line of text. **And it answered the design's biggest open question without anyone setting out to.**

**The player arrives as a soldier.** Reframes the conquest chapter from a history lesson into complicity you can feel, and it fell out of the recruitment mechanic already in place — **new material arriving from existing parts rather than being bolted on, which is the sign the design is sound.**

**The abstraction move.** Earning the icon set in front of the player, out loud, rather than handing them a HUD.

**The beaver may cry. Once.**

---

## 18. The one-line summary

*A dragon lays an egg; the egg hatches the universe; a thunderous female God explains that the reason is "why not"; and then one hungry woman on an island carves two wooden knobs, and by the time somebody else's rod comes down to pin them, the player has built the whole machine themselves and cannot find where they went wrong.*

---

*Sources merged 25 August 2026: the 22 August scooter session on Vashon Island (highway bike lane, ferry traffic building, one dog off her leash) and the 23–25 August sessions including the scooter loop to the accessible park (madrona bark, one deer, Papi's opinion noted, and a park worker who heard "bedridden six months, scooting the whole way from 140th") plus the 25 August desk debrief at Cowork.*

*Accessible trail plus a scooter that gets you there from home is the argument this game keeps making, in physical form.*
