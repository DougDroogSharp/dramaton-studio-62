// Turn the photographed gauge parts into usable UI sprites.
//
// The source art is embroidered linen shot on a green cloth: 768x1024
// dials and needles, 1024x576 bars, ~9.8MB for twelve files. None of
// that can go on a console as-is — the green has to become alpha, the
// empty margin has to go, and a dial that renders at 120px does not
// need a 768px bitmap.
//
//   node scripts/prep-gauge-art.mjs            # all games
//   node scripts/prep-gauge-art.mjs --game william
//
// Writes public/gauges/<game>/<part>.png plus a pivots.json recording
// where each needle turns, because a needle rotated about the centre of
// its bounding box wobbles instead of sweeping.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const GAMES = ['william', 'leopold', 'capone', 'elon'];
const PARTS = ['frame', 'needle', 'bar'];
// Display sizes. A dial sits in a 132px shelf; twice that is plenty for
// a high-DPI screen and still a twentieth of the source bytes.
const TARGET = { frame: 256, needle: 256, bar: 384 };

const args = process.argv.slice(2);
const only = args.includes('--game') ? args[args.indexOf('--game') + 1] : null;
const games = only ? [only] : GAMES;

// ---------------------------------------------------------- chroma key
// Same thresholds as scripts/generate-art.mjs, which has been keying
// character art all along: solid green goes fully transparent, edge
// fringe gets partial alpha and its green cast pulled out, so linen
// threads keep their soft edge instead of gaining a green halo.
function chromaKey(png) {
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const greenness = g - Math.max(r, b);
    if (g > 90 && greenness > 60) {
      d[i + 3] = 0;
    } else if (g > 70 && greenness > 25) {
      d[i + 3] = Math.max(0, 255 - greenness * 4);
      d[i + 1] = Math.max(r, b);
    }
  }
  return png;
}

/**
 * Drop specks.
 *
 * The cloth was dusty and the lint photographs as dark flecks that
 * survive the key. They are invisible at a glance and they wreck two
 * things: contentBounds() crops to a speck instead of the artwork, and
 * the pivot search measures a row from a speck to the needle and puts
 * the rotation centre in the wrong place. Anything smaller than
 * minArea and not touching the main blob goes.
 */
function despeckle(png, minArea = 60) {
  const { width: w, height: h, data: d } = png;
  const seen = new Uint8Array(w * h);
  const opaque = (i) => d[i * 4 + 3] > 40;
  const blobs = [];

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !opaque(start)) continue;
    const cells = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      cells.push(p);
      const x = p % w, y = (p - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (seen[n] || !opaque(n)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    blobs.push(cells);
  }

  if (blobs.length === 0) return { png, removed: 0 };
  const biggest = blobs.reduce((a, b) => (b.length > a.length ? b : a));
  let removed = 0;
  for (const cells of blobs) {
    if (cells === biggest || cells.length >= minArea) continue;
    for (const p of cells) d[p * 4 + 3] = 0;
    removed++;
  }
  return { png, removed };
}

/** Bounding box of everything not fully transparent. */
function contentBounds(png) {
  const { width: w, height: h, data: d } = png;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function crop(png, b) {
  const out = new PNG({ width: b.w, height: b.h });
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const s = ((y + b.y) * png.width + (x + b.x)) * 4;
      const t = (y * b.w + x) * 4;
      out.data[t] = png.data[s];
      out.data[t + 1] = png.data[s + 1];
      out.data[t + 2] = png.data[s + 2];
      out.data[t + 3] = png.data[s + 3];
    }
  }
  return out;
}

/** Box-filter downscale. Averaging beats nearest for embroidery texture. */
function resize(png, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(png.width, png.height));
  if (scale >= 1) return png;
  const w = Math.max(1, Math.round(png.width * scale));
  const h = Math.max(1, Math.round(png.height * scale));
  const out = new PNG({ width: w, height: h });
  const sx = png.width / w, sy = png.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.min(png.width, Math.ceil((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.min(png.height, Math.ceil((y + 1) * sy));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const s = (yy * png.width + xx) * 4;
          const al = png.data[s + 3];
          // Weight colour by alpha so transparent pixels do not drag
          // the edges toward black.
          r += png.data[s] * al; g += png.data[s + 1] * al; b += png.data[s + 2] * al;
          a += al; n++;
        }
      }
      const t = (y * w + x) * 4;
      out.data[t] = a > 0 ? Math.round(r / a) : 0;
      out.data[t + 1] = a > 0 ? Math.round(g / a) : 0;
      out.data[t + 2] = a > 0 ? Math.round(b / a) : 0;
      out.data[t + 3] = Math.round(a / n);
    }
  }
  return out;
}

/**
 * Where a needle pivots.
 *
 * The boss — the stitched knot the needle turns on — is the widest
 * opaque run near the bottom of the sprite. Rotating about the centre of
 * the bounding box instead makes the needle orbit rather than sweep.
 */
function findPivot(png) {
  const { width: w, height: h, data: d } = png;
  // The widest CONTIGUOUS run, not first-to-last. A single surviving
  // speck out to one side would otherwise read as a very wide row and
  // drag the pivot away from the boss.
  const rowWidth = (y) => {
    let best = null, runStart = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && d[(y * w + x) * 4 + 3] > 80;
      if (on && runStart < 0) runStart = x;
      if (!on && runStart >= 0) {
        const width = x - runStart;
        if (!best || width > best.width) best = { first: runStart, last: x - 1, width };
        runStart = -1;
      }
    }
    return best;
  };
  // Search the bottom quarter, where the boss is stitched.
  let best = null;
  for (let y = Math.floor(h * 0.75); y < h; y++) {
    const r = rowWidth(y);
    if (r && (!best || r.width > best.width)) best = { ...r, y };
  }
  if (!best) return { x: 0.5, y: 0.9 };
  return {
    x: ((best.first + best.last) / 2) / w,
    y: best.y / h,
  };
}

// ------------------------------------------------------------------ run
const outRoot = resolve('public/gauges');
mkdirSync(outRoot, { recursive: true });
const pivots = {};
let srcBytes = 0, outBytes = 0, done = 0;

for (const game of games) {
  const dir = resolve(outRoot, game);
  mkdirSync(dir, { recursive: true });
  pivots[game] = {};

  for (const part of PARTS) {
    const src = resolve(`art-demo/${game}/gauge_${part}.png`);
    if (!existsSync(src)) { console.log(`  ${game}/${part}: no source, skipped`); continue; }

    srcBytes += statSync(src).size;
    let png = PNG.sync.read(readFileSync(src));
    png = chromaKey(png);
    const { removed } = despeckle(png);

    const b = contentBounds(png);
    if (!b) { console.log(`  ${game}/${part}: keyed to nothing — check the green`); continue; }
    png = crop(png, b);

    if (part === 'needle') pivots[game].needle = findPivot(png);

    png = resize(png, TARGET[part]);
    const outPath = resolve(dir, `${part}.png`);
    const buf = PNG.sync.write(png);
    writeFileSync(outPath, buf);
    outBytes += buf.length;
    done++;

    console.log(
      `  ${game}/${part}`.padEnd(20) +
      `${png.width}x${png.height}`.padEnd(10) +
      `${(buf.length / 1024).toFixed(0)}KB`.padEnd(8) +
      (removed ? `${removed} specks removed` : '')
    );
  }
}

writeFileSync(resolve(outRoot, 'pivots.json'), JSON.stringify(pivots, null, 2));
console.log(`\n${done} sprites`);
console.log(`source ${(srcBytes / 1048576).toFixed(1)}MB  ->  output ${(outBytes / 1048576).toFixed(2)}MB`);
console.log(`pivots written to public/gauges/pivots.json`);
