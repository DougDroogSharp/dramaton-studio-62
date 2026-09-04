// "Give it a body": the browser side of the Meshy bridge. Drives the
// stages one by one (preview → refine, or image → then rig → save) so the
// 3-D BODY card can show which stage is running, its percent and what it
// will cost. Server side: vite-plugin-meshy.ts.
//
// Filed 2026-09-03 00:40 -07:00 by EDITOR (actor-3d lane).

import { Actor } from '@/types';

// Dropbox Consolidated/Projects/AIPOTU/AIPOTU_HOUSE_STYLE.md, "Prompt block
// (paste into Meshy / image AI)", Doug's house look. Appended to every
// body-from-words prompt unless the creator edits it out.
export const MESHY_HOUSE_STYLE =
  'Hand-painted stylized 3D game art, friendly and bright, somewhat toylike but generally realistic. ' +
  'Warm, saturated-but-natural palette, soft daylight, painterly baked textures, clean silhouettes; ' +
  'chunky, readable, characterful forms with believable proportions and real materials. ' +
  'Not flat-shaded, not flat 2D, not photoreal, not chibi-abstract.';

// Rough credits, from the store's notes (image-to-3D 30; preview + refine
// about 30; rigging 5). Shown before the click, never charged by us.
export const CREDITS_FROM_WORDS = 35;
export const CREDITS_FROM_PICTURE = 35;

export const bodyPromptFor = (actor: Actor): string => {
  const said = (actor.log ?? []).filter(u => u.who === 'doug').map(u => u.text.trim()).filter(Boolean);
  const bits = [
    `${actor.name}: a single humanoid character, full body, standing in an A-pose, facing forward, on a plain background.`,
    actor.note?.trim() ? actor.note.trim() : '',
    said.length > 0 ? said.slice(-3).join(' ') : '',
    MESHY_HOUSE_STYLE,
  ].filter(Boolean);
  return bits.join('\n').slice(0, 800);
};

export interface BodyProgress {
  stage: 'preview' | 'refine' | 'image' | 'rig' | 'save';
  label: string;
  percent: number;
}

export interface StoredBodyResult {
  file: string;
  files: string[];
  humanoid: boolean;
  renamedBones: number;
  clips: { name: string; file: string }[];
  taskIds: Record<string, string>;
  how: string;
}

const POLL_MS = 3000;
const TIMEOUT_MS = 25 * 60 * 1000;

const post = async <T,>(path: string, body: unknown): Promise<T> => {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || `${path} failed (${r.status})`);
  return data as T;
};

interface TaskView { status: string; progress: number; error?: string; glbUrl?: string; thumbnailUrl?: string; credits?: number }

const waitFor = async (
  kind: 'text' | 'image' | 'rig',
  id: string,
  stage: BodyProgress['stage'],
  label: string,
  onProgress: (p: BodyProgress) => void,
  signal?: AbortSignal,
): Promise<TaskView> => {
  const started = Date.now();
  for (;;) {
    if (signal?.aborted) throw new Error('stopped');
    const r = await fetch(`/api/meshy/task?kind=${kind}&id=${encodeURIComponent(id)}`);
    const t = (await r.json()) as TaskView & { error?: string };
    if (!r.ok) throw new Error(t.error || `task lookup failed (${r.status})`);
    onProgress({ stage, label, percent: t.progress ?? 0 });
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error(`${label}: ${t.error || t.status}`);
    if (Date.now() - started > TIMEOUT_MS) throw new Error(`${label}: timed out`);
    await new Promise(res => setTimeout(res, POLL_MS));
  }
};

export interface MakeBodyOptions {
  name: string;
  prompt?: string;         // from words
  imageDataUrl?: string;   // from its picture
  signal?: AbortSignal;
}

// The whole chain. Rigging failure is not fatal: the body is saved as a
// prop (unregistered) and `humanoid` comes back false.
export const makeBody = async (opts: MakeBodyOptions, onProgress: (p: BodyProgress) => void): Promise<StoredBodyResult> => {
  let sourceKind: 'text' | 'image';
  let sourceTaskId: string;
  let previewTaskId: string | undefined;
  if (opts.prompt?.trim()) {
    sourceKind = 'text';
    const { taskId: preview } = await post<{ taskId: string }>('/api/meshy/text-to-3d', { prompt: opts.prompt });
    previewTaskId = preview;
    await waitFor('text', preview, 'preview', 'Meshy is sketching the shape', onProgress, opts.signal);
    const { taskId: refine } = await post<{ taskId: string }>('/api/meshy/refine', { previewTaskId: preview });
    sourceTaskId = refine;
    await waitFor('text', refine, 'refine', 'Meshy is painting it', onProgress, opts.signal);
  } else if (opts.imageDataUrl) {
    sourceKind = 'image';
    const { taskId } = await post<{ taskId: string }>('/api/meshy/image-to-3d', { imageDataUrl: opts.imageDataUrl });
    sourceTaskId = taskId;
    await waitFor('image', taskId, 'image', 'Meshy is building it from the picture', onProgress, opts.signal);
  } else {
    throw new Error('give it words or a picture');
  }

  let rigTaskId: string | undefined;
  try {
    const { taskId } = await post<{ taskId: string }>('/api/meshy/rig', { inputTaskId: sourceTaskId });
    rigTaskId = taskId;
    await waitFor('rig', taskId, 'rig', 'Meshy is putting bones in it', onProgress, opts.signal);
  } catch (err) {
    // Biped-only rigging: a dragon or a dog comes back unrigged and that is fine.
    console.warn('rig skipped:', err);
    rigTaskId = undefined;
  }

  onProgress({ stage: 'save', label: 'Bringing it into the model store', percent: 100 });
  return post<StoredBodyResult>('/api/meshy/save', {
    name: opts.name,
    sourceKind,
    sourceTaskId,
    previewTaskId,
    rigTaskId,
    prompt: opts.prompt,
  });
};

// "From a file": copy a GLB / FBX / glTF / VRM from disk into the store.
export const importBodyFile = async (name: string, fileName: string, data: ArrayBuffer): Promise<StoredBodyResult> => {
  const bytes = new Uint8Array(data);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const r = await post<Omit<StoredBodyResult, 'taskIds' | 'how'>>('/api/models/import', { name, fileName, dataBase64: btoa(bin) });
  return { ...r, taskIds: {}, how: 'import' };
};
