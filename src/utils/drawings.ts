// DRAWINGS — finished 2-D art brought in from outside the pipeline
// (Facing Alligators, 2026-09-02).
//
// A Drawing is the one stored copy of an artist's image. Drops and actor
// graphics that use it carry `drawingId`; on FILE SAVE the duplicate bytes
// are stripped (dehydrate), on LOAD they are filled back in (hydrate, from
// migrateGameData) — the same trick as ActorGraphic.imageRef. Everything
// downstream (Stage, portraits, the runner) keeps reading `.image`.
//
// Nothing here generates art. Drawings are imported, trimmed at most, and
// placed. Which drawing goes where is the creator's call.

import type { GameData, Drawing, Drop, Actor, ActorGraphic } from '@/types';

export const IMAGE_FILE_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;
export const isImageFileName = (name: string): boolean => IMAGE_FILE_RE.test(name);

export const newDrawingId = (): string =>
  `drawing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// "30d868d2-FullSizeRender.jpeg" -> "FullSizeRender"; "IMG_1914.png" -> "IMG 1914".
// Phone exports prefix an 8-hex upload hash; strip it, keep the rest.
export const nameFromFileName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, '');
  const unhashed = base.replace(/^[0-9a-f]{8}-/i, '');
  return unhashed.replace(/[_-]+/g, ' ').trim() || base;
};

export interface DrawingSeed {
  name?: string;
  fileName?: string;
  sourcePath?: string;
  artist?: string;
  image: string;
  width?: number;
  height?: number;
  tags?: string[];
}

export const drawingFromSeed = (seed: DrawingSeed): Drawing => ({
  id: newDrawingId(),
  name: seed.name ?? (seed.fileName ? nameFromFileName(seed.fileName) : 'Untitled drawing'),
  artist: seed.artist,
  fileName: seed.fileName,
  sourcePath: seed.sourcePath,
  image: seed.image,
  width: seed.width,
  height: seed.height,
  tags: seed.tags,
  importedAt: Date.now(),
  status: 'work',
});

// Same file from the same folder = already imported. Used by the folder
// scanner so re-scanning never duplicates.
export const findDrawingByFile = (
  drawings: Drawing[],
  fileName: string,
  sourcePath?: string,
): Drawing | undefined =>
  drawings.find(d => d.fileName === fileName && (sourcePath === undefined || d.sourcePath === sourcePath));

// ── hydrate / dehydrate ─────────────────────────────────────────────

const byId = (drawings: Drawing[] | undefined): Map<string, Drawing> =>
  new Map((drawings ?? []).map(d => [d.id, d]));

// Fill `.image` on every drop and graphic that names a drawing but carries
// no bytes of its own. Never overwrites an image that is present.
export const hydrateDrawingRefs = (game: GameData): GameData => {
  const drawings = byId(game.drawings);
  if (drawings.size === 0) return game;

  const fillDrop = (d: Drop): Drop => {
    if (!d.drawingId || d.image) return d;
    const drawing = drawings.get(d.drawingId);
    if (!drawing) {
      console.warn(`drop "${d.id}": drawingId "${d.drawingId}" does not resolve`);
      return d;
    }
    return { ...d, image: drawing.image };
  };

  const fillGraphic = (actorId: string) => (g: ActorGraphic): ActorGraphic => {
    if (!g.drawingId || g.image) return g;
    const drawing = drawings.get(g.drawingId);
    if (!drawing) {
      console.warn(`actor "${actorId}" graphic "${g.id}": drawingId "${g.drawingId}" does not resolve`);
      return g;
    }
    return { ...g, image: drawing.image };
  };

  return {
    ...game,
    drops: (game.drops ?? []).map(fillDrop),
    actors: (game.actors ?? []).map(a =>
      Array.isArray(a.graphics) ? { ...a, graphics: a.graphics.map(fillGraphic(a.id)) } : a,
    ),
  };
};

// The inverse, for the file on disk: where a drop or graphic still shows
// exactly its drawing's bytes, drop the copy. Anything edited away from the
// drawing (a different image under the same drawingId) is kept as-is, so
// nothing is ever lost. Returns a new document; the live one is untouched.
export const dehydrateDrawingRefs = (game: GameData): GameData => {
  const drawings = byId(game.drawings);
  if (drawings.size === 0) return game;

  const stripDrop = (d: Drop): Drop => {
    if (!d.drawingId || !d.image) return d;
    const drawing = drawings.get(d.drawingId);
    if (!drawing || drawing.image !== d.image) return d;
    const { image: _image, ...rest } = d;
    return rest;
  };

  const stripGraphic = (g: ActorGraphic): ActorGraphic => {
    if (!g.drawingId || !g.image) return g;
    const drawing = drawings.get(g.drawingId);
    if (!drawing || drawing.image !== g.image) return g;
    return { ...g, image: '' };
  };

  return {
    ...game,
    drops: (game.drops ?? []).map(stripDrop),
    actors: (game.actors ?? []).map(a =>
      Array.isArray(a.graphics) ? { ...a, graphics: a.graphics.map(stripGraphic) } : a,
    ),
  };
};

// ── where is a drawing used ─────────────────────────────────────────

export interface DrawingUses {
  drops: Drop[];
  graphics: { actor: Actor; graphic: ActorGraphic }[];
}

export const findDrawingUses = (game: GameData, drawingId: string): DrawingUses => ({
  drops: (game.drops ?? []).filter(d => d.drawingId === drawingId),
  graphics: (game.actors ?? []).flatMap(actor =>
    (actor.graphics ?? [])
      .filter(g => g.drawingId === drawingId)
      .map(graphic => ({ actor, graphic })),
  ),
});

// Remove a drawing. Its users keep the bytes they already show (they were
// hydrated) and simply stop pointing at the store.
export const removeDrawing = (game: GameData, drawingId: string): GameData => ({
  ...game,
  drawings: (game.drawings ?? []).filter(d => d.id !== drawingId),
  drops: (game.drops ?? []).map(d => (d.drawingId === drawingId ? { ...d, drawingId: undefined } : d)),
  actors: (game.actors ?? []).map(a => ({
    ...a,
    graphics: (a.graphics ?? []).map(g => (g.drawingId === drawingId ? { ...g, drawingId: undefined } : g)),
  })),
});

// Re-point every user of a drawing at its (possibly re-trimmed) bytes.
export const replaceDrawingImage = (
  game: GameData,
  drawingId: string,
  image: string,
  size?: { width: number; height: number },
): GameData => {
  const old = (game.drawings ?? []).find(d => d.id === drawingId);
  if (!old) return game;
  return {
    ...game,
    drawings: (game.drawings ?? []).map(d =>
      d.id === drawingId ? { ...d, image, width: size?.width ?? d.width, height: size?.height ?? d.height } : d,
    ),
    drops: (game.drops ?? []).map(d =>
      d.drawingId === drawingId && d.image === old.image ? { ...d, image } : d,
    ),
    actors: (game.actors ?? []).map(a => ({
      ...a,
      graphics: (a.graphics ?? []).map(g =>
        g.drawingId === drawingId && g.image === old.image ? { ...g, image } : g,
      ),
    })),
  };
};

// ── border trimming (pure part) ─────────────────────────────────────
//
// Phone screenshots of a drawing arrive with black bars or a white margin.
// trimBox finds the tightest box whose edge rows/columns all match the
// corner colour within `tolerance` (0-255 per channel). Pure so it can be
// tested without a canvas; trimDataUrl below does the pixel work.

export interface Box { x: number; y: number; width: number; height: number }

export const trimBox = (
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  tolerance = 16,
): Box => {
  if (width <= 0 || height <= 0) return { x: 0, y: 0, width, height };
  const px = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const near = (a: number[], b: number[]) =>
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance;

  // Each edge trims against its OWN corner colour, so a black bar at the
  // top and a white margin at the left both go.
  const rowUniform = (y: number, ref: number[]) => {
    for (let x = 0; x < width; x++) if (!near(px(x, y), ref)) return false;
    return true;
  };
  const colUniform = (x: number, y0: number, y1: number, ref: number[]) => {
    for (let y = y0; y <= y1; y++) if (!near(px(x, y), ref)) return false;
    return true;
  };

  // Each axis is trimmed on its own; an axis that would eat the whole
  // picture (a flat image, or a flat region inside black bars) is left
  // alone rather than trimmed to nothing.
  let top = 0;
  let bottom = height - 1;
  const topRef = px(0, 0);
  while (top < bottom && rowUniform(top, topRef)) top++;
  const bottomRef = px(0, height - 1);
  while (bottom > top && rowUniform(bottom, bottomRef)) bottom--;
  if (bottom - top < 1) {
    top = 0;
    bottom = height - 1;
  }

  let left = 0;
  let right = width - 1;
  const leftRef = px(0, top);
  while (left < right && colUniform(left, top, bottom, leftRef)) left++;
  const rightRef = px(width - 1, top);
  while (right > left && colUniform(right, top, bottom, rightRef)) right--;
  if (right - left < 1) {
    left = 0;
    right = width - 1;
  }

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

// ── browser-side helpers (canvas / FileReader) ──────────────────────

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Not a readable image'));
    img.src = src;
  });

export const readImageSize = async (dataUrl: string): Promise<{ width: number; height: number }> => {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
};

export interface TrimResult {
  image: string;
  width: number;
  height: number;
  trimmed: boolean;
}

// Crop the uniform borders off a data URL. Output is PNG (lossless) so a
// second trim costs nothing. Returns trimmed:false when nothing changed.
export const trimDataUrl = async (dataUrl: string, tolerance = 16): Promise<TrimResult> => {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(img, 0, 0);
  const box = trimBox(ctx.getImageData(0, 0, w, h).data, w, h, tolerance);
  if (box.x === 0 && box.y === 0 && box.width === w && box.height === h) {
    return { image: dataUrl, width: w, height: h, trimmed: false };
  }
  const out = document.createElement('canvas');
  out.width = box.width;
  out.height = box.height;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Could not get canvas context');
  octx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  return { image: out.toDataURL('image/png'), width: box.width, height: box.height, trimmed: true };
};

// Rough byte size of a data URL (base64 → bytes), for the UI.
export const dataUrlBytes = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const b64 = dataUrl.length - comma - 1;
  return Math.floor((b64 * 3) / 4);
};

export const formatBytes = (n: number): string =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
