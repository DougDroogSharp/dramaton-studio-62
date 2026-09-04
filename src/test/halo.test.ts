import { describe, it, expect } from 'vitest';
import { createDefaultGame, migrateGameData, GameData, Actor } from '../types';
import { become, facetsOf, findHaloed, inspect, newThing, placeWords, sayTo } from '../utils/halo';

const withThing = (): { game: GameData; id: string } => {
  const t = newThing('Ivy', 'thing_ivy');
  const game = { ...createDefaultGame(), things: [t] };
  return { game, id: t.id };
};

describe('the halo: speak, place, talk', () => {
  it('a fresh thing has a name, no facets, no place, an empty log', () => {
    const { game, id } = withThing();
    const found = findHaloed(game, id)!;
    expect(found.kind).toBe('thing');
    expect(facetsOf('thing', found.rec, game)).toEqual([]);
    expect(placeWords(found.rec.place, game)).toBe('nowhere yet');
    expect(inspect('thing', found.rec, game)[1]).toMatch(/no type yet/);
  });

  it('Talk appends to the log and Inspect counts it', () => {
    const { game, id } = withThing();
    const g2 = sayTo(game, id, 'be a small green person', 'doug', '2026-09-02T22:40:00-07:00');
    const g3 = sayTo(g2, id, 'done: body from words', 'phrog', '2026-09-02T22:41:00-07:00', [{ path: 'ivy.body', to: 'ivy_meshy.glb' }]);
    const rec = findHaloed(g3, id)!.rec;
    expect(rec.log).toHaveLength(2);
    expect(rec.log![1].who).toBe('phrog');
    expect(rec.log![1].turned).toEqual([{ path: 'ivy.body', to: 'ivy_meshy.glb' }]);
    expect(inspect('thing', rec, g3).at(-1)).toBe('2 lines of conversation.');
    expect(sayTo(g3, 'nope', 'x')).toBe(g3);
  });

  it('Place reads back in words', () => {
    const game = { ...createDefaultGame(), scenes: [{ id: 'sc1', name: 'The Market' }] } as unknown as GameData;
    expect(placeWords({ sceneId: 'sc1', x: 80, y: 75 }, game)).toBe('in The Market, front right');
    expect(placeWords({ x: 50, y: 25 }, game)).toBe('back middle');
    expect(placeWords({ sceneId: 'sc1', anchor: 'WELL' }, game)).toBe('in The Market, at WELL');
  });
});

describe('Become is additive', () => {
  it('a thing becoming a 3-D actor moves into actors with its handles', () => {
    const { game, id } = withThing();
    const g2 = sayTo(game, id, 'hello');
    const r = become(g2, id, '3d')!;
    expect(r.kind).toBe('actor');
    expect(r.game.things).toEqual([]);
    const actor = r.game.actors.find(a => a.id === id)!;
    expect(actor.name).toBe('Ivy');
    expect(actor.facets).toEqual(['3d']);
    expect(actor.log).toHaveLength(1);
    expect(actor.status).toBe('work');
    expect(facetsOf('actor', actor, r.game)).toEqual(['3d']);
    expect(inspect('actor', actor, r.game)).toContain('No body yet: give it one from words, from its picture, from the store, or from a file.');
  });

  it('an actor keeps 2-D when it also becomes 3-D, and evidence counts as a facet', () => {
    const actor: Actor = { id: 'a1', name: 'Mia', graphics: [{ id: 'g', pose: 'Neutral', expression: 'Neutral', angle: 0, image: 'x' }] };
    const game = { ...createDefaultGame(), actors: [actor] };
    expect(facetsOf('actor', actor, game)).toEqual(['2d']);
    const r = become(game, 'a1', '3d')!;
    expect(r.kind).toBe('actor');
    const a2 = r.game.actors[0];
    expect(a2.graphics).toHaveLength(1);
    expect(facetsOf('actor', a2, r.game).sort()).toEqual(['2d', '3d']);
    const skinned = { ...r.game, skins: [{ id: 's', name: 'Vita', animations: ['walk'], modelFile: 'v.glb', rig: 'mixamorig' as const }], actors: [{ ...a2, facets: undefined, skinId: 's' }] };
    expect(facetsOf('actor', skinned.actors[0], skinned).sort()).toEqual(['2d', '3d']);
    expect(inspect('actor', skinned.actors[0], skinned)).toContain('Moves: walk.');
  });

  it('other facets land in their own lists', () => {
    for (const [facet, list] of [['backdrop', 'drops'], ['sound', 'sfx'], ['text', 'scenes'], ['item', 'items'], ['button', 'buttons']] as const) {
      const { game, id } = withThing();
      const r = become(game, id, facet)!;
      expect((r.game as unknown as Record<string, { id: string }[]>)[list].some(x => x.id === id)).toBe(true);
      expect(r.game.things).toEqual([]);
    }
  });

  it('older documents load with an empty things list', () => {
    const migrated = migrateGameData({ info: { title: 'old' }, actors: [], scenes: [] });
    expect(migrated.things).toEqual([]);
  });
});
