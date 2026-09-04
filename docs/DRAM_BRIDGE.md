# DRAM BRIDGE — AI collaboration endpoint
Filed 2026-08-31 21:40 by Code (EDITOR session).

The editor's entire editable surface is one JSON document (`GameData`, the
.dram shape). The bridge exposes that live document while the dev server is
running, so an AI collaborator can co-edit the open project.

## Endpoints (dev server only, e.g. http://localhost:8080)

| Route | Method | Meaning |
|---|---|---|
| `/bridge/game` | GET | The live GameData as last pushed by the open editor |
| `/bridge/game` | PUT | Replace the document; the open editor applies it immediately |

The editor mirrors its state over Vite's HMR websocket (`dram:push` out,
`dram:apply` in, debounced 300 ms). Inbound documents pass through
`migrateGameData`, so partial/older shapes are tolerated; a toast announces
each applied update. Not compiled into production builds.

## Collaboration loop

1. Doug runs the editor (`npm run dev`) and loads/starts a game.
2. The AI reads the document: `GET /bridge/game` — world variables, Vita
   gauges/knobs, scenes + scripts, Narraton keys, skins with **armature**
   (joint hierarchy) and animation manifests.
3. The AI edits the JSON and `PUT`s it back. The change appears in the open
   editor instantly.

## Voice-driven animation authoring

Skins carry `armature` (joints with nearest-joint parents, harvested at
import from the glTF) and `authoredAnimations`: `{ name, clip }` where
`clip` is a three.js `AnimationClip.toJSON()` object. To author a clip from
a spoken request: read the skin's armature, write keyframe tracks against
those joint names, append to `authoredAnimations`, PUT. The clip name
immediately joins the wearer's pose vocabulary (`[POSE actor pose=<name>]`
+ autocomplete). The runtime side plays authored clips with
`AnimationClip.parse` on the loaded skin (George World integration note for
HvM Graphics at merge time).

## Talk: the per-object conversation channel (the halo, 2026-09-02)

Every thing in the document (`things[]`, `actors`, `scenes`, `drops`,
`items`, `sfx`, `buttons`) carries the same handles: `place`, `log`,
`facets` (see `Handles` in `src/types.ts`). `log` is the conversation
about that one thing: `{ at, who: 'doug' | 'phrog', text, turned? }`.

| Route | Method | Meaning |
|---|---|---|
| `/bridge/say` | POST | `{ thingId, text, who?, turned? }` → appends one line to that thing's `log` in the live document and pushes it to the open editor |

The loop Doug's editing follows (object-centric editor, Doug 2026-09-02:
"instead of editors you're handing affordances to an AI"):

1. Doug says something to a thing (the editor's Say box, or an outside
   voice client through `POST /bridge/say`). The line lands in `log` with
   `who: 'doug'`.
2. A Phrog session watches `GET /bridge/game` for `log` lines by Doug
   with no reply after them, reads the thing (`inspect()` in
   `src/utils/halo.ts` says the same in words), turns the knobs it means
   (edit the JSON, `PUT /bridge/game`), then answers through
   `POST /bridge/say` with `who: 'phrog'` and `turned: [{ path, from, to }]`
   naming every knob it changed, so the change is auditable and undoable.
3. Knob paths are `<thingName>.<affordance>.<knob>`, e.g. `ivy.body`,
   `ivy.moves`, `ivy.height`, `ivy.place`, `ivy.hunger.goal`.

Becoming: to give a thing a type, set `facets` (additive; `become()` in
`src/utils/halo.ts` shows what each facet needs when a thing leaves
`things[]` for a typed array). A 3-D actor's body is `Skin.modelFile`
pointing into the model store (`/models/<file>`, `/api/models/list`).

## Safety notes

- PUT replaces the whole document — read-modify-write, never construct from
  scratch, or you'll erase the rest of the project.
- The autosave (IndexedDB) picks up applied changes on the editor's normal
  debounce, so bridge edits persist like hand edits.
- Localhost only; the bridge is a dev-collaboration surface, not an API for
  the published game.
