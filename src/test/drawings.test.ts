import { describe, it, expect, vi, afterEach } from 'vitest';
import { migrateGameData, createDefaultGame, Drawing } from '@/types';
import {
  hydrateDrawingRefs,
  dehydrateDrawingRefs,
  findDrawingUses,
  removeDrawing,
  replaceDrawingImage,
  trimBox,
  nameFromFileName,
  findDrawingByFile,
  drawingFromSeed,
} from '@/utils/drawings';

// The drawings store: one copy of an artist's bytes, any number of drops
// and graphics pointing at it. Saved files carry the bytes once; the load
// path fills them back in.

const ART = 'data:image/png;base64,CHRIS';

const drawing = (over: Partial<Drawing> = {}): Drawing => ({
  id: 'dw_gator',
  name: 'Alligator in the rain',
  artist: 'Chris Unruh',
  fileName: '30d868d2-FullSizeRender.jpeg',
  image: ART,
  ...over,
});

const gameWith = (opts: { drops?: unknown[]; actors?: unknown[]; drawings?: Drawing[] }) => {
  const g = createDefaultGame();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = g as any;
  any.drawings = opts.drawings ?? [drawing()];
  any.drops = opts.drops ?? [];
  any.actors = opts.actors ?? [];
  return g;
};

describe('drawing refs: hydrate on load', () => {
  afterEach(() => vi.restoreAllMocks());

  it('migrateGameData fills a drop and a graphic that name a drawing', () => {
    const g = migrateGameData(gameWith({
      drops: [{ id: 'd1', name: 'Cover', prompt: '', drawingId: 'dw_gator' }],
      actors: [{ id: 'bop', name: 'Bop', graphics: [
        { id: 'g1', pose: 'Neutral', expression: 'Neutral', angle: 0, image: '', drawingId: 'dw_gator' },
      ] }],
    }));
    expect(g.drops[0].image).toBe(ART);
    expect(g.actors[0].graphics[0].image).toBe(ART);
  });

  it('never overwrites an image that is present', () => {
    const g = hydrateDrawingRefs(gameWith({
      drops: [{ id: 'd1', name: 'Edited', prompt: '', image: 'OTHER', drawingId: 'dw_gator' }],
    }));
    expect(g.drops[0].image).toBe('OTHER');
  });

  it('warns and leaves a dangling drawingId alone', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = hydrateDrawingRefs(gameWith({
      drops: [{ id: 'd1', name: 'Lost', prompt: '', drawingId: 'nope' }],
    }));
    expect(g.drops[0].image).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('migrateGameData always leaves a drawings array', () => {
    const g = migrateGameData({ info: { title: 'x' }, actors: [], scenes: [] });
    expect(g.drawings).toEqual([]);
  });
});

describe('drawing refs: dehydrate on save', () => {
  it('strips the duplicate bytes from users that still show the drawing', () => {
    const g = dehydrateDrawingRefs(gameWith({
      drops: [{ id: 'd1', name: 'Cover', prompt: '', image: ART, drawingId: 'dw_gator' }],
      actors: [{ id: 'bop', name: 'Bop', graphics: [
        { id: 'g1', pose: 'Neutral', expression: 'Neutral', angle: 0, image: ART, drawingId: 'dw_gator' },
      ] }],
    }));
    expect(g.drops[0].image).toBeUndefined();
    expect(g.drops[0].drawingId).toBe('dw_gator');
    expect(g.actors[0].graphics[0].image).toBe('');
    // the store keeps the one copy
    expect(g.drawings?.[0].image).toBe(ART);
  });

  it('keeps an image that was edited away from its drawing', () => {
    const g = dehydrateDrawingRefs(gameWith({
      drops: [{ id: 'd1', name: 'Tinted', prompt: '', image: 'TINTED', drawingId: 'dw_gator' }],
    }));
    expect(g.drops[0].image).toBe('TINTED');
  });

  it('round-trips: dehydrate then migrate restores every image', () => {
    const live = gameWith({
      drops: [{ id: 'd1', name: 'Cover', prompt: '', image: ART, drawingId: 'dw_gator' }],
      actors: [{ id: 'bop', name: 'Bop', graphics: [
        { id: 'g1', pose: 'Neutral', expression: 'Neutral', angle: 0, image: ART, drawingId: 'dw_gator' },
      ] }],
    });
    const saved = JSON.parse(JSON.stringify(dehydrateDrawingRefs(live)));
    expect(JSON.stringify(saved).split('CHRIS').length - 1).toBe(1); // bytes once
    const back = migrateGameData(saved);
    expect(back.drops[0].image).toBe(ART);
    expect(back.actors[0].graphics[0].image).toBe(ART);
  });

  it('does not mutate the live document', () => {
    const live = gameWith({
      drops: [{ id: 'd1', name: 'Cover', prompt: '', image: ART, drawingId: 'dw_gator' }],
    });
    dehydrateDrawingRefs(live);
    expect(live.drops[0].image).toBe(ART);
  });
});

describe('drawing uses, removal, replacement', () => {
  const live = () => gameWith({
    drops: [
      { id: 'd1', name: 'Cover', prompt: '', image: ART, drawingId: 'dw_gator' },
      { id: 'd2', name: 'Other', prompt: '', image: 'X' },
    ],
    actors: [{ id: 'bop', name: 'Bop', graphics: [
      { id: 'g1', pose: 'Neutral', expression: 'Neutral', angle: 0, image: ART, drawingId: 'dw_gator' },
    ] }],
  });

  it('lists every user', () => {
    const uses = findDrawingUses(live(), 'dw_gator');
    expect(uses.drops.map(d => d.id)).toEqual(['d1']);
    expect(uses.graphics.map(u => `${u.actor.id}/${u.graphic.id}`)).toEqual(['bop/g1']);
  });

  it('removing a drawing detaches users but they keep their bytes', () => {
    const g = removeDrawing(live(), 'dw_gator');
    expect(g.drawings).toEqual([]);
    expect(g.drops[0].drawingId).toBeUndefined();
    expect(g.drops[0].image).toBe(ART);
    expect(g.actors[0].graphics[0].image).toBe(ART);
  });

  it('replacing the bytes (a trim) follows through to unedited users only', () => {
    const g0 = live();
    g0.drops.push({ id: 'd3', name: 'Tinted', prompt: '', image: 'TINTED', drawingId: 'dw_gator' });
    const g = replaceDrawingImage(g0, 'dw_gator', 'TRIMMED', { width: 10, height: 20 });
    expect(g.drawings?.[0].image).toBe('TRIMMED');
    expect(g.drawings?.[0].width).toBe(10);
    expect(g.drops[0].image).toBe('TRIMMED');
    expect(g.drops[2].image).toBe('TINTED');
    expect(g.actors[0].graphics[0].image).toBe('TRIMMED');
  });
});

describe('trimBox', () => {
  // Build an RGBA buffer: fill colour, then paint a rectangle of `ink`.
  const buffer = (w: number, h: number, fill: number[], ink: number[], box: [number, number, number, number]) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const inside = x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3];
      const c = inside ? ink : fill;
      const i = (y * w + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
    return data;
  };

  it('finds the ink inside a white margin', () => {
    const data = buffer(20, 10, [255, 255, 255], [0, 0, 0], [5, 2, 8, 4]);
    expect(trimBox(data, 20, 10)).toEqual({ x: 5, y: 2, width: 8, height: 4 });
  });

  it('strips black phone bars top and bottom around a light picture', () => {
    // 10 wide, 30 tall: black rows 0-9 and 20-29, picture rows 10-19
    const data = buffer(10, 30, [0, 0, 0], [240, 240, 250], [0, 10, 10, 10]);
    expect(trimBox(data, 10, 30)).toEqual({ x: 0, y: 10, width: 10, height: 10 });
  });

  it('tolerates jpeg noise within the tolerance', () => {
    const data = buffer(12, 12, [250, 250, 250], [30, 30, 30], [3, 3, 6, 6]);
    // a slightly off-white pixel in the margin must not stop the trim
    data[(1 * 12 + 1) * 4] = 244;
    expect(trimBox(data, 12, 12, 16)).toEqual({ x: 3, y: 3, width: 6, height: 6 });
  });

  it('keeps a uniform image whole', () => {
    const data = buffer(8, 8, [9, 9, 9], [9, 9, 9], [0, 0, 0, 0]);
    expect(trimBox(data, 8, 8)).toEqual({ x: 0, y: 0, width: 8, height: 8 });
  });
});

describe('import helpers', () => {
  it('names a drawing from its file name, dropping the phone upload hash', () => {
    expect(nameFromFileName('30d868d2-FullSizeRender.jpeg')).toBe('FullSizeRender');
    expect(nameFromFileName('IMG_1914.png')).toBe('IMG 1914');
    expect(nameFromFileName('alligator-cover.png')).toBe('alligator cover');
  });

  it('recognises a file already imported from the same folder', () => {
    const d = drawingFromSeed({ fileName: 'a.png', sourcePath: 'C:\\art', image: ART });
    expect(findDrawingByFile([d], 'a.png', 'C:\\art')).toBe(d);
    expect(findDrawingByFile([d], 'a.png', 'D:\\elsewhere')).toBeUndefined();
    expect(findDrawingByFile([d], 'a.png')).toBe(d);
  });
});
