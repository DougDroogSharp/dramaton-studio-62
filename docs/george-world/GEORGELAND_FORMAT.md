# GEORGELAND FILE FORMAT — `georgeland/1` (proposed contract, one page)

Filed 2026-09-02 12:41 (-07:00) by EDITOR (Georgeland Editor lane), branch `georgeland-editor`. **Status: PROPOSED.** The editor writes exactly this; the map loader (GW BUILDER, greenlit 2026-09-01) should read exactly this. HvM Graphics' fuller loader contract was not yet posted when this was written, so this is the reconciliation offer: one shape, two consumers, never two. The code copy of the shape is `docs/prototypes/aipotu/georgeland_format.js` (constants, `newGeorgeland`, `validateGeorgeland`, `snapResources`); both the editor and the game's `?georgeland=` hook import it, so the shape changes in one file.

## The file (JSON, `georgelands/<id>.json`)

| Field | Type | Meaning |
|---|---|---|
| `format` | `"georgeland/1"` | shape version; bump on breaking change |
| `id` | slug `[a-z0-9-]` | file-name stem, URL-safe (`?georgeland=georgelands/<id>.json`) |
| `displayName` | string | the picker label |
| `paletteAccents` | `{sky, water}` hex | sky / water tint hints for the loader |
| `terrain.module` | string | a **map module id**: `aipotu` (the game's island, module #0), `georgeland2`, later `caldera`, `atoll`, `delta`. The loader owns the binding module → `terrainH`/`terrainNormal`. The file never carries a heightmap (Phase 3 terraforming will add a `terrain.heightmap` alternative). |
| `terrain.ws` | number | world scale the module is authored at (Aipotu 1.25, Georgeland 2 2.5) |
| `terrain.seaLevel` | number | water plane Y |
| `terrain.dryMin` | number | `terrainH` above which ground counts as dry (Aipotu uses 1.3, the game's own shoreline test) |
| `terrain.bounds` | `{minX,maxX,minZ,maxZ}` | island bounds in world units |
| `terrain.spawn` | `{x,z}` | default landing / camera focus |
| `terrain.camera` | `{pos[3], target[3]}` | default framing |
| `resources[]` | see below | **Phase 1: the placed resources** |
| `clusters[]` | `{id,label,type,x,z,r}` | editing convenience and the name a voice uses (“make the beach berries richer”); loaders may ignore |
| `style` | see below | **the Georgeland's own aesthetic** (Doug, 2026-09-02: the flat / no-texture contract is no longer a mandate; the look is the creator's choice, per Georgeland) |
| `resourceMode` | `replace` (default) or `add` | `replace`: a type present in the file REPLACES the game's built-in scatter of that type; `add`: laid on top |
| `placements[]` | `{key,x,z,r,…}` | Phase 2: the named anchors the sim seats entities on (king's-hall site, camps, landing beach, duke/serf plots, path polyline, volcano vent, surf bay, funeral ground, egg chamber) |
| `cast[]` | | Phase 2: starting Vitas (presets / capacity) |
| `conditions{}` | | Phase 2: the settable societal Conditions (slavery, child labour, reproduction…) as on/off + params |
| `meta` | `{author, created, modified, editor, tutorialStage, notes}` | provenance (the Wake); ISO timestamps with offset |

### A resource
```json
{ "id":"r12", "type":"berry", "x":-8.95, "z":60.24, "y":4.279, "amount":2, "richness":0.83, "cluster":"c1" }
```
- `x,z` world units on the module's ground. **`y` is a cache** of `terrainH(x,z)` at save time so readers without the sampler can use it; the loader **re-samples through `terrainH`** so nothing floats or sinks when the landform changes.
- `type`: `berry` (food bush) · `fir` (timber, fellable) · `palm` (shade/timber) · `stone` (stone/ore) · `gold`.
- `amount` = how much is there: berries on the bush 1–3 · fir size 1–3 · palm height 1–3 · stone/gold units 1–5.
- `richness` 0..1 = how well/fast it yields. Game mapping today: berry richness ≥ 0.5 = the rich `far` bush (regrow 55 vs 80); gold: the richest spot becomes the MINE.
- `cluster` (optional) names a `clusters[]` entry.

### The style block (added 2026-09-02 13:36, ruling: aesthetic-agnostic)
```json
"style": {
  "preset": "standin-flat",
  "name": "house flat", "notes": "",
  "assets": { "gold": { "url": "vendor/models/nugget.glb", "height": 1.2, "scale": null, "yOffset": 0 } },
  "budget": { "triangles": 300000, "drawCalls": 400, "assetMB": 40 }
}
```
- `preset` names how a type with no mesh asset is drawn: `standin-flat` (Lambert, flat-shaded), `standin-textured` (painted-canvas PBR, smooth), `meshes` (assets only; a missing asset still falls back to the flat stand-in). Renderers that have their own makers (the game today) may map a preset onto them.
- `assets` is per resource type, ANY style: a `.glb` / `.gltf` / `.fbx` URL rendered with its own materials (textured PBR included), fitted to `height` in world units (the Vita is 1.5) unless `scale` is given, feet at the ground plus `yOffset`. The editor loads them through the vendored GLTFLoader / FBXLoader with a PMREM environment so metallic materials render; the loader decides whether the game honours `assets` or substitutes its house makers.
- `budget` is the light per-Georgeland performance budget (single-file browser game): the editor shows live triangles / draw calls / asset MB against it and turns the line red when over. Defaults 300k · 400 · 40 MB; a Georgeland may lower them.
- `name` / `notes` label the aesthetic (the bake-off winner for Aipotu and the tutorial lands goes here).

## What the game does with it today (the `?georgeland=` hook on branch `georgeland-editor`)
`georgeworld.html?georgeland=georgelands/<id>.json` — one synchronous fetch after the built-in scatter, before the mine. berry → live `makeBerryBush` (harvestable) · fir → live `makePine` (fellable) · palm → palm + obstacle · stone → scenery rocks + obstacle · gold → ore nuggets at each spot, and `MINE` moves to the richest gold. `window.GEORGELAND_LOADED = {file, id, seated, doc}` for checks. Verified 2026-09-02: 13/13 berries and 15/15 firs seated at the exact saved coordinates. This hook is the placeholder for the loader; GW BUILDER folds it into the real map loader and deletes it.

## Questions for HvM Graphics to settle (reply in MAILBOX)
1. Module ids and where the module registry lives (in-file registry vs separate module files) — the file only names the module.
2. Anchor keys for `placements[]` (Phase 2) — proposed: `hall, camps, landing, dukePlots[], serfPlots[], path[], vent, surf, funeral, egg`, each `{x,z,r}` re-sampled through `terrainH`.
3. Whether `clusters[]` and `y` caches stay (harmless to ignore) and whether `resourceMode: replace` is the right default.
4. Stone and gold consumers: today scenery + MINE relocation; when the tier list / industry lands, `amount`/`richness` are the knobs.
5. `style`: does the loader honour `style.assets` (load the Georgeland's own meshes) or map `style.preset` onto the game's makers? Either is valid under the contract; say which so the editor's preview matches the game.

## Tools
- Editor: `docs/prototypes/aipotu/georgeland_editor.html` (v0.1) served by `serve_georgeland.py` (port 8218) which also runs the bridge: `GET/PUT /bridge/georgeland` (alias `/bridge/game`) with a `baseRev` guard, `POST /bridge/command {"cmd":"…"}` for a spoken sentence, `POST /georgeland/save`, `GET /georgeland/list`, `POST /shot`.
- Look: `georgeland_styles.js` — stand-in sets per preset, external mesh assets (GLB/glTF/FBX, materials as authored, skinned meshes cloned correctly), the PMREM environment, asset byte stats for the budget.
- Terrains: `georgeland_terrains.js` — `aipotu` (verbatim copy of the game's `terrainH` v0.79 until module #0 exports it) and `georgeland2` (live from the study in a hidden iframe).
