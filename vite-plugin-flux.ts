import { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Local image-generation bridge: the editor POSTs to /api/flux-generate
 * (same request/response shape as the old Lovable/Supabase edge
 * function) and this middleware talks to the Black Forest Labs Flux
 * API server-side. The API key stays in .env.local (BFL_API_KEY) and
 * never reaches the browser.
 *
 * Setup:
 *   .env.local            BFL_API_KEY=your-key-here
 *   optional              FLUX_MODEL=flux-2-pro   (endpoint name at api.bfl.ai/v1/)
 *
 * Dev-server only: generation is an editor-time activity.
 */

const BFL_BASE = 'https://api.bfl.ai/v1';
const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 180_000;

// Style enforcement (ported from the old edge function, compressed for
// Flux's direct-prompt style)
const ENFORCED_STYLE =
  'Art style, strictly: bold black outlines around all shapes, simple flat solid color fills, ' +
  'no shading, no gradients, no soft shadows, no realistic lighting, only a few thin interior ' +
  'detail lines. Clean vector illustration / cel animation look with hard color edges.';

const GREEN_SCREEN =
  'The character must be rendered alone on a solid bright green background (#00FF00), ' +
  'pure flat green with no gradients and no shadows cast on it, for chroma-key compositing.';

interface GenRequest {
  prompt: string;
  referenceImageCloseUp?: string;
  referenceImageFullBody?: string;
  styleGuide?: string;
  referenceImage?: string;
  existingImage?: string;
  editMode?: boolean;
  enforceStyleGuide?: boolean;
  isCharacter?: boolean;
  aspectRatio?: string;
  stylePack?: string; // pack folder name (per-game style, from game settings)
}

// ---- style pack ------------------------------------------------------
// STYLE_REF_DIR in .env.local names a folder of images; up to
// MAX_PACK_IMAGES of them ride along on every generation as style
// references (Flux multi-reference). Swap the folder to change eras.

const MAX_PACK_IMAGES = 3;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

interface StylePack {
  images: string[];
  text: string; // from style.txt in the folder — era style words that ride every generation
}

const EMPTY_PACK: StylePack = { images: [], text: '' };
let packCache: { key: string; pack: StylePack } | null = null;

function loadStylePack(dir: string | undefined): StylePack {
  if (!dir) return EMPTY_PACK;
  let entries: string[];
  try {
    entries = readdirSync(dir).filter(f => IMAGE_EXTS.has(extname(f).toLowerCase())).sort();
  } catch {
    console.warn(`🎨 STYLE_REF_DIR not readable: ${dir}`);
    return EMPTY_PACK;
  }
  // Prefer files under the size cap (huge refs bloat every request);
  // fall back to smallest-first if nothing fits.
  const MAX_REF_BYTES = 2 * 1024 * 1024;
  const sized = entries.map(f => {
    let size = Infinity;
    try { size = statSync(join(dir, f)).size; } catch { /* skip */ }
    return { f, size };
  }).filter(e => Number.isFinite(e.size));
  const underCap = sized.filter(e => e.size <= MAX_REF_BYTES).map(e => e.f);
  const picked = (underCap.length > 0
    ? underCap
    : sized.sort((a, b) => a.size - b.size).map(e => e.f)
  ).slice(0, MAX_PACK_IMAGES);
  if (picked.length < Math.min(entries.length, MAX_PACK_IMAGES)) {
    console.warn(`🎨 Style pack: some refs in ${dir} exceed 2MB and were skipped — smaller versions would strengthen the style signal`);
  }
  const key = dir + '|' + picked.map(f => {
    try { return f + ':' + statSync(join(dir, f)).mtimeMs; } catch { return f; }
  }).join(',') + '|' + (() => {
    try { return statSync(join(dir, 'style.txt')).mtimeMs; } catch { return 0; }
  })();
  if (packCache?.key === key) return packCache.pack;

  const images: string[] = [];
  for (const f of picked) {
    try {
      const b64 = readFileSync(join(dir, f)).toString('base64');
      images.push(`data:${MIME[extname(f).toLowerCase()]};base64,${b64}`);
    } catch { /* skip unreadable */ }
  }
  let text = '';
  try { text = readFileSync(join(dir, 'style.txt'), 'utf8').trim(); } catch { /* optional */ }
  if (images.length || text) {
    console.log(`🎨 Style pack: ${images.length} reference(s)${text ? ' + style.txt' : ''} from ${dir}`);
  }
  const pack = { images, text };
  packCache = { key, pack };
  return pack;
}

const stripDataUrl = (s: string): string =>
  s.replace(/^data:image\/\w+;base64,/, '');

function buildFluxBody(body: GenRequest, stylePack: StylePack = EMPTY_PACK): Record<string, unknown> {
  const promptParts: string[] = [];
  const images: string[] = [];
  const imageRoles: string[] = [];

  const addImage = (dataUrl: string | undefined, role: string) => {
    if (!dataUrl) return;
    images.push(stripDataUrl(dataUrl));
    imageRoles.push(`Image ${images.length}: ${role}`);
  };

  const addPack = () => {
    for (const img of stylePack.images) {
      addImage(img, 'era style reference — match the art style, linework, texture and palette of this image');
    }
  };

  if (body.editMode && body.existingImage) {
    addImage(body.existingImage, 'the current image — edit THIS image, keeping the overall scene');
    addImage(body.styleGuide, 'style reference — match this art style');
    addPack();
    promptParts.push(`Edit the current image according to these instructions: ${body.prompt}`);
  } else {
    addImage(body.styleGuide, 'style reference — match this art style exactly');
    addPack();
    addImage(body.referenceImage, 'composition reference — match this layout, perspective and camera angle');
    addImage(body.referenceImageCloseUp, "character face reference — match these facial features exactly");
    addImage(body.referenceImageFullBody, 'character body reference — match body proportions and clothing');
    promptParts.push(body.prompt);
  }

  if (imageRoles.length > 0) promptParts.unshift(imageRoles.join('. ') + '.');
  // The era's own style words beat the generic flat-color enforcement
  if (stylePack.text) promptParts.push(`ART STYLE (MANDATORY): ${stylePack.text}`);
  else if (body.enforceStyleGuide) promptParts.push(ENFORCED_STYLE);
  if (body.isCharacter) promptParts.push(GREEN_SCREEN);

  const flux: Record<string, unknown> = {
    prompt: promptParts.join('\n\n'),
    output_format: 'png',
    aspect_ratio: body.aspectRatio || (body.isCharacter ? '2:3' : '16:9'),
    safety_tolerance: 4,
  };
  // Flux multi-reference: input_image, input_image_2, ...
  images.forEach((img, i) => {
    flux[i === 0 ? 'input_image' : `input_image_${i + 1}`] = img;
  });
  return flux;
}

async function callFlux(apiKey: string, model: string, body: GenRequest, stylePack: StylePack = EMPTY_PACK): Promise<{ imageUrl: string }> {
  const fluxBody = buildFluxBody(body, stylePack);

  const submit = await fetch(`${BFL_BASE}/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-key': apiKey },
    body: JSON.stringify(fluxBody),
  });
  if (!submit.ok) {
    const text = await submit.text();
    if (submit.status === 404) {
      throw new Error(
        `Flux endpoint "${model}" not found (404). Set FLUX_MODEL in .env.local to a valid ` +
        `BFL endpoint (e.g. flux-2-pro, flux-2-flex). API said: ${text}`,
      );
    }
    throw new Error(`Flux submit failed (${submit.status}): ${text}`);
  }
  const { id, polling_url: pollingUrl } = await submit.json() as { id: string; polling_url?: string };
  const pollUrl = pollingUrl || `${BFL_BASE}/get_result?id=${id}`;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error('Flux generation timed out');
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const poll = await fetch(pollUrl, { headers: { 'x-key': apiKey } });
    if (!poll.ok) throw new Error(`Flux poll failed (${poll.status}): ${await poll.text()}`);
    const data = await poll.json() as { status: string; result?: { sample?: string }; details?: unknown };

    if (data.status === 'Ready') {
      const sampleUrl = data.result?.sample;
      if (!sampleUrl) throw new Error('Flux returned Ready but no image URL');
      // The sample URL is short-lived: fetch now, hand back a data URL
      const img = await fetch(sampleUrl);
      if (!img.ok) throw new Error(`Failed to download generated image (${img.status})`);
      const b64 = Buffer.from(await img.arrayBuffer()).toString('base64');
      return { imageUrl: `data:image/png;base64,${b64}` };
    }
    if (data.status === 'Content Moderated' || data.status === 'Request Moderated') {
      throw new Error('Image generation blocked by content moderation. Try a different prompt, pose, or reference.');
    }
    if (data.status === 'Error' || data.status === 'Task not found') {
      throw new Error(`Flux generation failed: ${data.status} ${JSON.stringify(data.details ?? '')}`);
    }
    // Pending / Queued: keep polling
  }
}

// ---- fal.ai path -----------------------------------------------------
// fal.ai keys look like "uuid:secret" (they contain a colon). fal hosts
// Flux 2 behind its own API: POST https://fal.run/<model> with
// Authorization: Key <key>; the call long-polls until the image is done.

const FAL_BASE = 'https://fal.run';

const falImageSize = (aspect: string): string => {
  if (aspect === '1:1') return 'square_hd';
  if (aspect === '2:3' || aspect === '3:4' || aspect === '9:16') return 'portrait_4_3';
  return 'landscape_16_9';
};

async function callFal(apiKey: string, model: string, body: GenRequest, stylePack: StylePack = EMPTY_PACK): Promise<{ imageUrl: string }> {
  // Reuse the same prompt assembly; collect reference images as data URIs
  const promptParts: string[] = [];
  const imageUrls: string[] = [];
  const imageRoles: string[] = [];

  const addImage = (dataUrl: string | undefined, role: string) => {
    if (!dataUrl) return;
    imageUrls.push(dataUrl); // fal accepts data URIs directly
    imageRoles.push(`Image ${imageUrls.length}: ${role}`);
  };

  const addPack = () => {
    for (const img of stylePack.images) {
      addImage(img, 'era style reference — match the art style, linework, texture and palette of this image');
    }
  };

  if (body.editMode && body.existingImage) {
    addImage(body.existingImage, 'the current image — edit THIS image, keeping the overall scene');
    addImage(body.styleGuide, 'style reference — match this art style');
    addPack();
    promptParts.push(`Edit the current image according to these instructions: ${body.prompt}`);
  } else {
    addImage(body.styleGuide, 'style reference — match this art style exactly');
    addPack();
    addImage(body.referenceImage, 'composition reference — match this layout, perspective and camera angle');
    addImage(body.referenceImageCloseUp, 'character face reference — match these facial features exactly');
    addImage(body.referenceImageFullBody, 'character body reference — match body proportions and clothing');
    promptParts.push(body.prompt);
  }
  if (imageRoles.length > 0) promptParts.unshift(imageRoles.join('. ') + '.');
  // The era's own style words beat the generic flat-color enforcement
  if (stylePack.text) promptParts.push(`ART STYLE (MANDATORY): ${stylePack.text}`);
  else if (body.enforceStyleGuide) promptParts.push(ENFORCED_STYLE);
  if (body.isCharacter) promptParts.push(GREEN_SCREEN);

  // Reference images route to the model's edit variant
  const endpoint = imageUrls.length > 0 ? `${model}/edit` : model;
  const falBody: Record<string, unknown> = {
    prompt: promptParts.join('\n\n'),
    num_images: 1,
    output_format: 'png',
    image_size: falImageSize(body.aspectRatio || (body.isCharacter ? '2:3' : '16:9')),
    // Historical-documentary game content trips the default checker's
    // false positives; keep the checker on but widen tolerance.
    safety_tolerance: 4,
    ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
  };

  const resp = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
    body: JSON.stringify(falBody),
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 404) {
      throw new Error(
        `fal.ai model "${endpoint}" not found (404). Set FLUX_MODEL in .env.local to a valid ` +
        `fal model id (e.g. fal-ai/flux-2, fal-ai/flux-2-pro). API said: ${text}`,
      );
    }
    throw new Error(`fal.ai request failed (${resp.status}): ${text}`);
  }
  const data = await resp.json() as { images?: Array<{ url?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error(`fal.ai returned no image: ${JSON.stringify(data).slice(0, 300)}`);
  if (url.startsWith('data:')) return { imageUrl: url };
  const img = await fetch(url);
  if (!img.ok) throw new Error(`Failed to download generated image (${img.status})`);
  const b64 = Buffer.from(await img.arrayBuffer()).toString('base64');
  return { imageUrl: `data:image/png;base64,${b64}` };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function fluxPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'flux-image-bridge',
    configureServer(server) {
      // List available style packs (subfolders of STYLE_PACKS_DIR) so the
      // editor can offer a per-game style selector
      server.middlewares.use('/api/flux-style-packs', (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');
        const base = env.STYLE_PACKS_DIR;
        if (!base) { res.end(JSON.stringify({ packs: [] })); return; }
        try {
          const packs = readdirSync(base, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort();
          res.end(JSON.stringify({ packs }));
        } catch {
          res.end(JSON.stringify({ packs: [], error: `STYLE_PACKS_DIR not readable: ${base}` }));
        }
      });

      server.middlewares.use('/api/flux-generate', (req: IncomingMessage, res: ServerResponse) => {
        const respond = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        if (req.method !== 'POST') return respond(405, { error: 'POST only' });

        const apiKey = env.BFL_API_KEY || env.FAL_KEY;
        if (!apiKey) {
          return respond(500, {
            error: 'No API key set. Create .env.local in the repo root with BFL_API_KEY=your-key (BFL or fal.ai key both work) and restart the dev server.',
          });
        }
        // fal.ai keys contain a colon (uuid:secret); BFL keys do not
        const isFal = apiKey.includes(':');
        const model = env.FLUX_MODEL || (isFal ? 'fal-ai/flux-2-pro' : 'flux-2-pro');

        (async () => {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as GenRequest;
          if (!body.prompt?.trim()) return respond(400, { error: 'prompt is required' });
          // Per-game pack name (subfolder of STYLE_PACKS_DIR) wins;
          // STYLE_REF_DIR is the legacy machine-wide fallback
          const packDir = body.stylePack && env.STYLE_PACKS_DIR
            ? join(env.STYLE_PACKS_DIR, body.stylePack)
            : env.STYLE_REF_DIR;
          const stylePack = loadStylePack(packDir);
          console.log(`🎨 Flux [${isFal ? 'fal.ai' : 'bfl'}] ${model}: ${body.editMode ? 'EDIT' : 'GENERATE'}${body.stylePack ? ` [pack: ${body.stylePack}]` : ''}${stylePack.images.length ? ` +${stylePack.images.length} style refs` : ''} — ${body.prompt.slice(0, 80)}...`);
          const result = isFal
            ? await callFal(apiKey, model, body, stylePack)
            : await callFlux(apiKey, model, body, stylePack);
          console.log('🎨 Flux: image ready');
          respond(200, result);
        })().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error('🎨 Flux error:', message);
          respond(500, { error: message });
        });
      });
    },
  };
}
