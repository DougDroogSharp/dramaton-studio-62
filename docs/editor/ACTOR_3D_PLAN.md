# DRAMATON EDITOR — 3-D ACTORS, object-centric plan (v2)

**Rewritten 2026-09-02 22:30 -07:00 by EDITOR (actor-3d lane)** after Doug's reframe (source of record: Dropbox `Consolidated/Projects/DRAMATON_EDITOR_object_centric_vision.md`, captured the same evening). v1 of this plan (22:07) designed "add 3-D actors" as a section of the actor editor page; that is the tool-centric reflex Doug rejected. What was built under v1 (increment 1, below) survives because it is already shaped like an affordance on the actor, not a page; it is re-labelled, not redone. Worktree `C:\Users\dougs\actor-3d`, branch `actor-3d`, port 8089.

## The frame (Doug, verbatim fragments)
"speak something into existence and then put that thing someplace in an environment where I can do things" · "it would contain all the handles for editing apparatus modules to latch onto" · "if there's a type … it's got these affordances by which I mean gauges and knobs" · "I want the whole thing to be verbal" · "first there's this little urproduct, a placeholder that you can converse with the AI about" · "instead of editors you're handing affordances to an AI".
Consequences for this lane: no 3-D character editor page. "3-D actor" is a TYPE a thing can BECOME; becoming snaps 3-D affordances onto the thing's universal handles; every affordance is a named knob the AI turns through the bridge; every on-screen control is coarse (no dragging, no fine pointer work); the conversation is with Phrog (core + a 3-D specialist).

## What the codebase already has that fits
- Every record (Actor, Scene, Drop, Item, Sfx, Button, Episode, Subplot, Skin) already carries `id`, `name`, `note`, `status`. That is a halo waiting to be named.
- Vitas already expose **gauges and knobs** as world variables (`george_hunger`, `george_appetite`); Doug's phrase and the existing mechanism are the same thing.
- The **DRAM bridge** (`GET`/`PUT /bridge/game`) is already "the AI turns the knobs": everything editable is one JSON document. It lacks a per-object conversation channel.
- The actor page already stacks facets, not tools: Pose Library, Voice, 3-D Body (v1.01), Vita gauges/knobs. Becoming is already additive in practice (an actor with sprites AND a skinId).
- Prior art to hold in mind: Morphic halos (Squeak/Self: any object sprouts the same ring of handles; type-specific ones join the ring) and the inspector pattern (one view that reads any object back). Difference here: the handles are nameable in speech, not grippable.

## (a) The universal handles: what a fresh ur-object always has
Six handles, each a verb Doug can say. Nothing else until it becomes something.
| Handle | Spoken form | What it is in the document |
|---|---|---|
| **Name** | "call it Ivy" | `name` (id derives from it once) |
| **Place** | "put it by the well", "it lives in the market scene" | `place?: { sceneId?: string; x?: number; y?: number; anchor?: string }` — stage percent coordinates or a named Drop anchor; empty = nowhere yet |
| **Look** | "show me", "make its picture" | `image?` (thumbnail/representation); empty until something can render one |
| **Talk** | "give me flames here", "tell me about it" | `log: Utterance[]` (`{ at, who: 'doug' \| 'phrog', text, turned?: KnobTurn[] }`), the per-object conversation; the AI's replies record which knobs it turned |
| **Become** | "make it a 3-D actor", "it's also a sound" | `facets: FacetKind[]` — the ONE handle that changes the halo; each facet snaps its affordances on (see b) |
| **Inspect** | "what are you?", "what can I change?" | read-only: the halo, the facets, every knob with its current value and spoken range, in words |
Plus one gauge every object has: **status** (new / work / done), already present everywhere. `note` becomes the pinned summary at the top of `log`.
Storage: a new `things: UrObject[]` list holds objects that have no facet yet (a name and a conversation). The first Become moves the record into the typed array it now belongs to (`actors`, `drops`, `sfx`, `scenes`, `items`, `buttons`) and keeps `id`, `name`, `place`, `log`, `image`, `status`. The Dramaton file shape stays the storage (standing rule); the halo is the same six fields on every record, declared once as `interface Handles` and mixed into each type. Migration: absent fields mean "no place, empty log", i.e. every existing project is already valid.
Knob discipline (applies to every facet): a knob has a **path** (`ivy.body.height`), a **spoken name** ("height"), a **coarse range** in words that map to numbers (tiny / small / normal / big / huge = 0.6 / 1.2 / 1.55 / 2.2 / 4.0 m) as well as the number, and it is reachable through the bridge. On screen a knob is a big select or a five-step strip, never a slider that needs a steady hand.

**RULED 2026-09-02 22:35 -07:00 (Doug, option 1): Become is additive. A thing collects facets; an actor can hold sprites and a 3-D body together; a 3-D body can grow sprites from its own snapshots.** Stored as `facets: FacetKind[]` on every record; the display also counts evidence (graphics present = 2-D, a body file = 3-D) so old projects read correctly without a migration pass.

## (b) How the 3-D ACTOR facet snaps on
"Become a 3-D actor" adds `facets: [..., '3d']` and grows these affordances on the thing. Each row is an affordance, its verbs, its knobs/gauges, and which module answers (the specialist that inherits Phrog-core).
| Affordance | Verbs (spoken) | Knobs · gauges | Module |
|---|---|---|---|
| **Body** (the mesh + skin, `Skin.modelFile`) | "give it a body", "make it from these words", "make it from its picture", "use the Vita 2b body", "use this file" | body (choice: store list) · source (gauge: meshy-text / meshy-image / import / store) | Meshy specialist (text-to-3D, image-to-3D) · model-store module (pick, import) |
| **Rig** | "rig it", "can it walk?" | rig (gauge: WALKS / STATIC / OTHER, from the seven leg bones) | Meshy auto-rig + the mixamorig rename |
| **Moves** (the pose vocabulary) | "teach it to wave", "it should be able to sit", "make up a slump" | moves (list: baked clips + library clips + authored clips) — each name is a `[POSE]` word | clip-library module (assign `*_clip.glb`) · Meshy preset clips · authored `AnimationClip` JSON over the bridge (already in DRAM_BRIDGE.md) |
| **Size** | "make it bigger", "child-sized" | height (coarse strip, default normal = 1.55) | rig3d (measure, scale, feet on ground) |
| **Stance** | "face the well", "stand on the rock" | facing (8 coarse directions) · anchor (from Place) | placement module (extends the universal Place handle with 3-D facing) |
| **Look** (inherits the universal handle) | "show me from the side", "make its sprites" | angle (8 coarse) · pose | snapshot → thumbnail now; snapshot → `graphics[]` sprites next (the 2-D facet grows from the 3-D one) |
| **Effects** (later; the fire session's contract) | "give me flames here", "smoke from its nose" | effect (choice: embers / small / campfire / hearth / big / belch) · where (a bone or anchor name) | particle/VFX specialist via `createFire(scene, opts)`; the affordance lives on the thing, never in an effects page |
| **Instruments** (already built for Vitas) | "make it starving and lazy" | gauges/knobs presets | existing VitaPanel |
Inspect for a 3-D actor reads back, in words: body and its source, rig gauge, the moves list, height, facing, effects, and every Vita gauge. Nothing here is a page; it is the halo of one thing, drawn in place on the thing's own card.

## The conversation channel (the AI turns the knobs)
- `POST /bridge/say { thingId, text }` appends an Utterance to the thing's `log` and returns. A Phrog session (today: a Claude Code session on the bridge; Doug dictates through Dragon as he does now) watches `log`, reads the document, turns knobs, PUTs, and writes its reply with `turned: [{ path, from, to }]` so every change is auditable and undoable.
- The editor draws the `log` under the thing's card with one coarse "say" box; the editor never needs its own speech recognition to start.
- Prompts: `docs/editor/agents/PHROG_CORE.md` (the master layer: identity, taste, how it works with Doug; the personality is Doug's to specify, open question in the vision doc) and `docs/editor/agents/actor3d.md` (the 3-D specialist: the knob table above, the Meshy limits, the store rules). Per-module prompts stack on the core.

## What changes in the code (from v1)
- `Body3DSection` stays as the **Body / Rig / Moves / Size / Look** affordance card of the 3-D facet; its disabled Import and Generate buttons become the "give it a body" verbs; a coarse height strip replaces nothing yet built.
- New: `Handles` (place, log, facets) mixed into every record; `things[]`; a **THING** entry in the toolbar ("speak something into existence": a name, optional place); **Become** on every thing's card; **Inspect** as a words-only readback; `POST /bridge/say`.
- The AC / SC / DR tabs remain as VIEWS (lists filtered by facet), not as editors; the actor page becomes the thing's card.

## Increments (one commit each, on `actor-3d`)
1. **3-D body affordance** — BUILT 2026-09-02 22:27 -07:00 under v1, uncommitted, editor v1.01: store pick, three r160 preview at 1.55 with feet on the ground, rig gauge, library clips assigned as `[POSE]` words, snapshot to thumbnail, `MODELS_DIR` override, 386 tests green. Re-labelled under the frame, not redone.
2. **The halo** — `Handles` on every record, `things[]`, THING entry, Become (facets), Inspect readback, `POST /bridge/say` + the log under the card. Editor v1.02. **BUILT 2026-09-02 22:55 -07:00, uncommitted.** `src/utils/halo.ts` (pure: `facetsOf`, `become`, `sayTo`, `inspect`, `placeWords`), `src/components/HaloCard.tsx` (Place as a 3×3 word grid + scene + anchor, Become as word buttons, Talk as the log + a Say box, Inspect as a words list), `src/components/editors/ThingEditor.tsx` (TH tab; THING button in the toolbar speaks one into existence), the halo mounted on the actor card, the 3-D Body card shown only once the actor has the 3-D facet, the bridge's `/bridge/say` documented in `docs/DRAM_BRIDGE.md`. Verified in the browser: THING → "front right" → said a line → Inspect reads it back in words → Become 3-D actor moved Ivy into actors with place, log and facet intact and the 3-D Body card appeared; a Phrog reply through `POST /bridge/say` with `turned` landed in the log live. 393 tests green.
3. **Coarse knobs** — height strip, facing, the word-to-number maps; every 3-D knob reachable by path through the bridge; `actor3d.md` specialist prompt drafted from the table above.
4. **"Give it a body"** — `vite-plugin-meshy.ts` (text-to-3D, image-to-3D, auto-rig, mixamorig rename, into the store) and the import-from-disk verb. **BUILT 2026-09-03 01:15 -07:00 (ruled ahead of 3 by Doug at 00:20), uncommitted, editor v1.03. LIVE-PROVEN 01:23: Ivy, spoken into existence as a thing at 22:50 and told "a small green person who waves a lot", got a body from those words in about 12 minutes: preview → refine → rig → seven files in the store, `ivy_meshy.glb` registered as a walker, walk and run as moves, a Phrog-voiced log line "Made a body (Meshy text-to-3D); it walks." The key is read from the Windows user environment (setx) through a registry fallback when the dev server's process predates it; never printed.** Store convention follows the HvM 3D session's note of 00:15: only a HUMANOID (seven mixamorig leg bones after the rename) is registered in `manifest.json`; anything else is dropped in unregistered for the creature bench. Pieces: `src/utils/meshyBones.ts` (the exact 24-joint map, diffed from `_raw.glb` vs renamed files in the store), `src/utils/glbRename.ts` (rewrite node names in the GLB JSON chunk, re-pack, no three.js), `vite-plugin-models.ts` gains `storeRiggedGlb` (`<stem>_raw.glb` + `<stem>.glb` + renamed walking/running siblings, never overwrites, manifest append under a `.lock` file, atomic write) and `POST /api/models/import`; `vite-plugin-meshy.ts` (`/api/meshy/text-to-3d`, `/refine`, `/image-to-3d`, `/rig`, `/task`, `/save`; key server-side only; contract checked against docs.meshy.ai 2026-09-03: text-to-3d v2 with `pose_mode: a-pose`, image-to-3d v1, rigging v1 with `height_meters: 1.55`); `src/utils/meshyClient.ts` (stage-by-stage chain with progress; rig failure = prop, not an error; house-style prompt block from `AIPOTU_HOUSE_STYLE.md` appended to every from-words prompt). The 3-D BODY card now reads "Give it a body: from words · from its picture · from the store · from a file", with the credit estimate on the button (about 35), a progress bar per stage, and a stop. A finished body joins the store listing, the skin library and the actor, with `walk`/`run` moves from Meshy's bundled clips and a Phrog-voiced log line naming the file it turned. Tests: GLB round trip and rename, store write + manifest append + no-duplicate + prop-not-registered.
5. **Look → sprites** — snapshot pose × angle into `graphics[]`, so a 3-D thing plays on today's 2-D stage and theater.
6. **Effects on the thing** — "flames here" through the fire session's `createFire` contract, attached at a bone or anchor.

## Coordination (unchanged from v1, plus one)
- **HvM 3D session:** the model store (`vendor/models/`, `manifest.json`) is add-and-append only from this lane, under a lock file; ack pending (mailbox 22:28). I never edit `stage.html` or the studies; their four rules are copied into `src/utils/rig3d.ts`.
- **Meshy session:** no Meshy code existed; increment 4 makes the driver durable; asked for their bone map and task settings.
- **Fire/VFX session:** increment 6 consumes their `createFire(scene, opts)` contract as an affordance on the thing.
- **GW BUILDER:** `Skin.modelFile` + `clipRefs` + the `Handles` fields are what George World reads to load a Vita's body and place.
- **Phrog side (cross-seam):** the conversation channel and the two prompt files are Phrog's architecture (core + specialists) landing in the editor; pointer appended to `CrossProjectComm/TO_PHROG.md`; nothing marked handled on Phrog's behalf.

## Known rough edges after increment 1
- `heightM` ("came in") read 1.20 and 1.30 for the same file across hot reloads; informational only.
- The mouse wheel over the preview zooms the camera instead of scrolling the page (to be replaced by coarse zoom steps under the knob discipline).
- Import and Generate are on screen but disabled until increment 4.
