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

## Safety notes

- PUT replaces the whole document — read-modify-write, never construct from
  scratch, or you'll erase the rest of the project.
- The autosave (IndexedDB) picks up applied changes on the editor's normal
  debounce, so bridge edits persist like hand edits.
- Localhost only; the bridge is a dev-collaboration surface, not an API for
  the published game.
