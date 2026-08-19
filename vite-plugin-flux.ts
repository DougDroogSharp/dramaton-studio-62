import { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

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
}

const stripDataUrl = (s: string): string =>
  s.replace(/^data:image\/\w+;base64,/, '');

function buildFluxBody(body: GenRequest): Record<string, unknown> {
  const promptParts: string[] = [];
  const images: string[] = [];
  const imageRoles: string[] = [];

  const addImage = (dataUrl: string | undefined, role: string) => {
    if (!dataUrl) return;
    images.push(stripDataUrl(dataUrl));
    imageRoles.push(`Image ${images.length}: ${role}`);
  };

  if (body.editMode && body.existingImage) {
    addImage(body.existingImage, 'the current image — edit THIS image, keeping the overall scene');
    addImage(body.styleGuide, 'style reference — match this art style');
    promptParts.push(`Edit the current image according to these instructions: ${body.prompt}`);
  } else {
    addImage(body.styleGuide, 'style reference — match this art style exactly');
    addImage(body.referenceImage, 'composition reference — match this layout, perspective and camera angle');
    addImage(body.referenceImageCloseUp, "character face reference — match these facial features exactly");
    addImage(body.referenceImageFullBody, 'character body reference — match body proportions and clothing');
    promptParts.push(body.prompt);
  }

  if (imageRoles.length > 0) promptParts.unshift(imageRoles.join('. ') + '.');
  if (body.enforceStyleGuide) promptParts.push(ENFORCED_STYLE);
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

async function callFlux(apiKey: string, model: string, body: GenRequest): Promise<{ imageUrl: string }> {
  const fluxBody = buildFluxBody(body);

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
      server.middlewares.use('/api/flux-generate', (req: IncomingMessage, res: ServerResponse) => {
        const respond = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        if (req.method !== 'POST') return respond(405, { error: 'POST only' });

        const apiKey = env.BFL_API_KEY;
        if (!apiKey) {
          return respond(500, {
            error: 'BFL_API_KEY is not set. Create .env.local in the repo root with BFL_API_KEY=your-key and restart the dev server.',
          });
        }
        const model = env.FLUX_MODEL || 'flux-2-pro';

        (async () => {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as GenRequest;
          if (!body.prompt?.trim()) return respond(400, { error: 'prompt is required' });
          console.log(`🎨 Flux ${model}: ${body.editMode ? 'EDIT' : 'GENERATE'} — ${body.prompt.slice(0, 80)}...`);
          const result = await callFlux(apiKey, model, body);
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
