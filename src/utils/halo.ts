// The halo: the six handles every thing carries (Name, Place, Look, Talk,
// Become, Inspect) and the verbs on them, as pure functions over the
// document. UI in src/components/HaloCard.tsx; bridge channel in
// vite-plugin-dram-bridge.ts (POST /bridge/say).
//
// Object-centric editor, Doug 2026-09-02: "speak something into existence
// and then put that thing someplace in an environment where I can do
// things". Becoming is additive (ruled 22:35).
//
// Filed 2026-09-02 22:40 -07:00 by EDITOR (actor-3d lane).

import {
  Actor, Button, Drop, FacetKind, GameData, Handles, Item, Place, Scene, Sfx,
  UrObject, Utterance, AssetStatus,
} from '@/types';
import { allSkinAnimations } from './skins';
import { rigLabel } from './rigKind';

// Any record that wears the halo.
export type Haloed = Handles & { id: string; name: string; image?: string; note?: string; status?: AssetStatus };

export type HaloKind = 'thing' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button';

export const FACET_LABEL: Record<FacetKind, string> = {
  '2d': '2-D actor',
  '3d': '3-D actor',
  backdrop: 'backdrop',
  sound: 'sound',
  text: 'text (scene)',
  item: 'item',
  button: 'button',
};

// Coarse stage positions: three columns by three rows, in words, so
// "put it front left" needs no pointer. y grows downward on the stage,
// so BACK is the top row.
export const PLACE_COLUMNS = [
  { word: 'left', x: 20 }, { word: 'middle', x: 50 }, { word: 'right', x: 80 },
] as const;
export const PLACE_ROWS = [
  { word: 'back', y: 25 }, { word: 'center', y: 50 }, { word: 'front', y: 75 },
] as const;

export const placeWords = (place: Place | undefined, game: GameData): string => {
  if (!place || (!place.sceneId && place.x === undefined && !place.anchor)) return 'nowhere yet';
  const parts: string[] = [];
  if (place.sceneId) {
    const scene = game.scenes.find(s => s.id === place.sceneId);
    parts.push(scene ? `in ${scene.name}` : `in a missing scene (${place.sceneId})`);
  }
  if (place.anchor) parts.push(`at ${place.anchor}`);
  else if (place.x !== undefined && place.y !== undefined) {
    const col = [...PLACE_COLUMNS].sort((a, b) => Math.abs(a.x - place.x!) - Math.abs(b.x - place.x!))[0].word;
    const row = [...PLACE_ROWS].sort((a, b) => Math.abs(a.y - place.y!) - Math.abs(b.y - place.y!))[0].word;
    parts.push(`${row} ${col}`);
  }
  return parts.join(', ') || 'nowhere yet';
};

// Facets a record has: what it declared plus what its data proves.
export const facetsOf = (kind: HaloKind, rec: Haloed, game: GameData): FacetKind[] => {
  const out = new Set<FacetKind>(rec.facets ?? []);
  if (kind === 'actor') {
    const a = rec as Actor;
    if (a.graphics?.length > 0) out.add('2d');
    const skin = a.skinId ? (game.skins ?? []).find(s => s.id === a.skinId) : undefined;
    if (skin?.modelFile) out.add('3d');
  }
  if (kind === 'drop') out.add('backdrop');
  if (kind === 'sfx') out.add('sound');
  if (kind === 'scene') out.add('text');
  if (kind === 'item') out.add('item');
  if (kind === 'button') out.add('button');
  return [...out];
};

// Find any haloed record by id, whatever array it lives in.
export const findHaloed = (game: GameData, id: string): { kind: HaloKind; rec: Haloed } | undefined => {
  const t = (game.things ?? []).find(x => x.id === id);
  if (t) return { kind: 'thing', rec: t };
  const a = game.actors.find(x => x.id === id);
  if (a) return { kind: 'actor', rec: a };
  const s = game.scenes.find(x => x.id === id);
  if (s) return { kind: 'scene', rec: s };
  const d = game.drops.find(x => x.id === id);
  if (d) return { kind: 'drop', rec: d };
  const i = game.items.find(x => x.id === id);
  if (i) return { kind: 'item', rec: i };
  const f = game.sfx.find(x => x.id === id);
  if (f) return { kind: 'sfx', rec: f };
  const b = game.buttons.find(x => x.id === id);
  if (b) return { kind: 'button', rec: b };
  return undefined;
};

// Write a haloed record back wherever it lives.
export const replaceHaloed = (game: GameData, kind: HaloKind, rec: Haloed): GameData => {
  const swap = <T extends { id: string }>(arr: T[]): T[] => arr.map(x => (x.id === rec.id ? (rec as unknown as T) : x));
  switch (kind) {
    case 'thing': return { ...game, things: swap(game.things ?? []) };
    case 'actor': return { ...game, actors: swap(game.actors) };
    case 'scene': return { ...game, scenes: swap(game.scenes) };
    case 'drop': return { ...game, drops: swap(game.drops) };
    case 'item': return { ...game, items: swap(game.items) };
    case 'sfx': return { ...game, sfx: swap(game.sfx) };
    case 'button': return { ...game, buttons: swap(game.buttons) };
  }
};

// Talk: append one line to a thing's conversation.
export const sayTo = (
  game: GameData,
  id: string,
  text: string,
  who: Utterance['who'] = 'doug',
  at: string = new Date().toISOString(),
  turned?: Utterance['turned'],
): GameData => {
  const found = findHaloed(game, id);
  if (!found || !text.trim()) return game;
  const line: Utterance = { at, who, text: text.trim(), ...(turned && turned.length > 0 ? { turned } : {}) };
  return replaceHaloed(game, found.kind, { ...found.rec, log: [...(found.rec.log ?? []), line] });
};

// Speak a thing into existence.
export const newThing = (name = 'Something', id = `thing_${Date.now()}`): UrObject => ({
  id,
  name,
  status: 'new',
  log: [],
});

// Become: a thing takes its first facet and moves into the typed array it
// now belongs to, keeping every handle. Returns the new game and where the
// record went. On a record that already has a type, Become adds a facet.
export const become = (
  game: GameData,
  id: string,
  facet: FacetKind,
  now = Date.now(),
): { game: GameData; kind: HaloKind; id: string } | undefined => {
  const found = findHaloed(game, id);
  if (!found) return undefined;
  const { kind, rec } = found;
  if (kind !== 'thing') {
    const facets = [...new Set([...(rec.facets ?? []), facet])];
    return { game: replaceHaloed(game, kind, { ...rec, facets }), kind, id };
  }
  const thing = rec as UrObject;
  const carried = {
    id: thing.id,
    name: thing.name,
    ...(thing.note ? { note: thing.note } : {}),
    ...(thing.place ? { place: thing.place } : {}),
    ...(thing.log && thing.log.length > 0 ? { log: thing.log } : {}),
    status: (thing.status === 'new' ? 'work' : thing.status) as AssetStatus,
    facets: [facet],
  };
  const rest = { ...game, things: (game.things ?? []).filter(t => t.id !== id) };
  switch (facet) {
    case '2d':
    case '3d': {
      const actor: Actor = { ...carried, graphics: [], ...(thing.image ? { image: thing.image } : {}) };
      return { game: { ...rest, actors: [...rest.actors, actor] }, kind: 'actor', id: actor.id };
    }
    case 'backdrop': {
      const drop: Drop = { ...carried, prompt: thing.note ?? '', ...(thing.image ? { image: thing.image } : {}) };
      return { game: { ...rest, drops: [...rest.drops, drop] }, kind: 'drop', id: drop.id };
    }
    case 'sound': {
      const sfx: Sfx = { ...carried, type: 'pulse', category: 'DO', params: { intensity: 50 } };
      return { game: { ...rest, sfx: [...rest.sfx, sfx] }, kind: 'sfx', id: sfx.id };
    }
    case 'text': {
      const scene: Scene = { ...carried, sceneType: 'AGENCY', script: '', stage: [] };
      return { game: { ...rest, scenes: [...rest.scenes, scene] }, kind: 'scene', id: scene.id };
    }
    case 'item': {
      const item: Item = { ...carried, category: 'prop', acquisition: 'pickup', effects: [], ...(thing.note ? { description: thing.note } : {}) };
      return { game: { ...rest, items: [...rest.items, item] }, kind: 'item', id: item.id };
    }
    case 'button': {
      const button: Button = {
        ...carried,
        label: thing.name,
        x: thing.place?.x ?? 50,
        y: thing.place?.y ?? 80,
        width: 20,
        height: 8,
      };
      return { game: { ...rest, buttons: [...rest.buttons, button] }, kind: 'button', id: button.id };
    }
  }
  void now;
  return undefined;
};
// (`now` is reserved for id minting when Become has to invent an id.)

// Inspect: everything the thing knows about itself, in words. One line
// per fact, so it reads aloud and an AI can quote it back.
export const inspect = (kind: HaloKind, rec: Haloed, game: GameData): string[] => {
  const lines: string[] = [];
  const facets = facetsOf(kind, rec, game);
  lines.push(`${rec.name}.`);
  lines.push(
    facets.length === 0
      ? 'A thing with no type yet. It can become: ' + (Object.keys(FACET_LABEL) as FacetKind[]).map(f => FACET_LABEL[f]).join(', ') + '.'
      : `It is: ${facets.map(f => FACET_LABEL[f]).join(' and ')}.`,
  );
  lines.push(`Lives ${placeWords(rec.place, game)}.`);
  lines.push(rec.image ? 'It has a picture.' : 'No picture yet.');
  lines.push(`Status: ${rec.status ?? 'new'}.`);
  if (rec.note?.trim()) lines.push(`Note: ${rec.note.trim()}`);

  if (kind === 'actor') {
    const a = rec as Actor;
    if (a.graphics.length > 0) {
      const poses = [...new Set(a.graphics.map(g => g.pose))];
      lines.push(`Sprites: ${a.graphics.length}, poses ${poses.join(', ')}.`);
    }
    lines.push(a.voiceId ? `Voice: ${a.voiceId}.` : 'No voice yet.');
    const skin = a.skinId ? (game.skins ?? []).find(s => s.id === a.skinId) : undefined;
    if (skin) {
      lines.push(`Body: ${skin.name}${skin.modelFile ? ` (${skin.modelFile})` : ' (manifest only)'}${skin.source ? `, from ${skin.source.kind}` : ''}.`);
      lines.push(`Rig: ${rigLabel(skin.rig)}.`);
      if (skin.heightM !== undefined) lines.push(`Came in at ${skin.heightM.toFixed(2)}, stands at 1.55.`);
      const moves = allSkinAnimations(skin);
      lines.push(moves.length > 0 ? `Moves: ${moves.join(', ')}.` : 'No moves yet.');
    } else if (facets.includes('3d')) {
      lines.push('No body yet: give it one from words, from its picture, from the store, or from a file.');
    }
    for (const g of a.gauges ?? []) lines.push(`Gauge ${g.name}: level ${g.level}, red line ${g.redLine}, goal ${g.goal}.`);
    for (const k of a.knobs ?? []) lines.push(`Knob ${k.name}: ${k.value}.`);
  }
  if (kind === 'drop') {
    const d = rec as Drop;
    if (d.anchors && d.anchors.length > 0) lines.push(`Anchors: ${d.anchors.map(x => x.id).join(', ')}.`);
  }
  if (kind === 'sfx') {
    const f = rec as Sfx;
    lines.push(`Effect: ${f.type}, ${f.category}, intensity ${f.params.intensity}.`);
  }
  if (kind === 'scene') {
    const s = rec as Scene;
    lines.push(`Script: ${(s.script ?? '').split('\n').filter(l => l.trim()).length} lines.`);
  }
  const said = rec.log?.length ?? 0;
  lines.push(said === 0 ? 'Nothing said about it yet.' : `${said} line${said === 1 ? '' : 's'} of conversation.`);
  return lines;
};
