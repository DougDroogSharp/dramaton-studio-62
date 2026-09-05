// Meshy bridge (dev only): the durable form of the pipeline the Meshy
// session ran by hand on 2026-09-02 — text-to-3D preview → refine, or
// image-to-3D → auto-rig → download → bone rename to mixamorig:* → into the
// one model store, registered only if it walks. The key stays server-side
// (MESHY_API_KEY in .env.local or the environment) and never reaches the
// browser. The editor's 3-D BODY card drives the sequence stage by stage so
// Doug sees progress and credits.
//
//   POST /api/meshy/text-to-3d   { prompt }                    -> { taskId }   (preview)
//   POST /api/meshy/refine       { previewTaskId }             -> { taskId }
//   POST /api/meshy/image-to-3d  { imageDataUrl }              -> { taskId }
//   POST /api/meshy/rig          { inputTaskId, heightMeters? } -> { taskId }
//   GET  /api/meshy/task?kind=text|image|rig&id=…             -> { status, progress, ... }
//   POST /api/meshy/save         { name, sourceKind, sourceTaskId, rigTaskId?, prompt? } -> StoredBody + taskIds
//
// Contract checked against docs.meshy.ai on 2026-09-03 (text-to-3d v2,
// image-to-3d v1, rigging v1). Credits, from the store's notes: image-to-3D
// 30, refine ~30 with preview, rigging 5.
//
// Filed 2026-09-03 00:40 -07:00 by EDITOR (actor-3d lane).

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { StoredBody, freeStem, isLoopback, readBody, resolveModelsDir, storeRiggedGlb, storeSlug } from './vite-plugin-models';

// Spend guard (code dive 2026-09-04): every Meshy route is localhost-only, and
// one dev-server run may CREATE at most MESHY_TASK_BUDGET tasks (preview,
// refine, image, rig each count one; polling and saving are free). Default 12
// is about three characters. Raise it in .env.local for a long session;
// restarting the dev server resets the count.
const DEFAULT_TASK_BUDGET = 12;

const MESHY_BASE = 'https://api.meshy.ai';
export const STANDARD_HEIGHT_M = 1.55;

type TaskKind = 'text' | 'image' | 'rig';
const TASK_PATH: Record<TaskKind, string> = {
  text: '/openapi/v2/text-to-3d',
  image: '/openapi/v1/image-to-3d',
  rig: '/openapi/v1/rigging',
};

interface MeshyTask {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress?: number;
  model_urls?: Record<string, string>;
  thumbnail_url?: string;
  task_error?: { message?: string };
  consumed_credits?: number;
  result?: {
    rigged_character_glb_url?: string;
    basic_animations?: Record<string, string>;
  };
}

async function meshy<T>(key: string, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${MESHY_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Meshy ${path} → ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

const create = async (key: string, kind: TaskKind, body: unknown): Promise<string> => {
  const r = await meshy<{ result: string }>(key, TASK_PATH[kind], { method: 'POST', body: JSON.stringify(body) });
  return r.result;
};

const getTask = (key: string, kind: TaskKind, id: string): Promise<MeshyTask> =>
  meshy<MeshyTask>(key, `${TASK_PATH[kind]}/${encodeURIComponent(id)}`);

const download = async (url: string): Promise<Buffer> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed (${r.status}) ${url.slice(0, 80)}`);
  return Buffer.from(await r.arrayBuffer());
};

// Doug sets the key with `setx` (the Windows USER environment). A dev
// server started from a shell or app that predates the setx never sees
// it in process.env, so fall back to the registry value. Read once, never
// logged, never sent to the browser.
let userEnvKey: string | undefined;
const windowsUserEnv = (name: string): string => {
  if (process.platform !== 'win32') return '';
  if (userEnvKey !== undefined) return userEnvKey;
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.+)`));
    userEnvKey = m ? m[1].trim() : '';
  } catch {
    userEnvKey = '';
  }
  return userEnvKey;
};

export function meshyPlugin(env: Record<string, string> = {}): Plugin {
  let dir = resolveModelsDir(process.cwd(), env);
  const key = () => env.MESHY_API_KEY || process.env.MESHY_API_KEY || windowsUserEnv('MESHY_API_KEY');
  const budget = Math.max(0, Number(env.MESHY_TASK_BUDGET || process.env.MESHY_TASK_BUDGET) || DEFAULT_TASK_BUDGET);
  let created = 0;
  // Every task creation goes through here, so the budget cannot be bypassed.
  const createBudgeted = async (k: string, kind: TaskKind, body: unknown): Promise<string> => {
    if (created >= budget) throw new Error(`Meshy task budget spent (${created}/${budget} this dev-server run). Set MESHY_TASK_BUDGET in .env.local or restart the dev server.`);
    created += 1;
    return create(k, kind, body);
  };
  return {
    name: 'meshy-bridge',
    apply: 'serve',
    configResolved(config) {
      dir = resolveModelsDir(config.root, env);
      config.logger.info(`🧱 Meshy bridge: ${key() ? 'key present' : 'NO KEY — set MESHY_API_KEY in .env.local'}; store ${dir}; localhost-only; budget ${budget} tasks/run`);
    },
    configureServer(server) {
      const json = (res: ServerResponse, status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      };
      const guard = (req: IncomingMessage, res: ServerResponse, method: string): string | null => {
        if (!isLoopback(req)) { json(res, 403, { error: 'Meshy bridge is localhost-only' }); return null; }
        if (req.method !== method) { json(res, 405, { error: `${method} only` }); return null; }
        const k = key();
        if (!k) { json(res, 500, { error: 'No Meshy key. Add MESHY_API_KEY=your-key to .env.local in the checkout and restart the dev server.' }); return null; }
        return k;
      };
      const wrap = (fn: () => Promise<void>, res: ServerResponse) =>
        fn().catch((err: unknown) => { console.error('🧱 Meshy error:', err); json(res, 500, { error: err instanceof Error ? err.message : String(err) }); });

      server.middlewares.use('/api/meshy/text-to-3d', (req, res) => {
        const k = guard(req, res, 'POST'); if (!k) return;
        wrap(async () => {
          const body = JSON.parse(await readBody(req)) as { prompt?: string };
          if (!body.prompt?.trim()) return json(res, 400, { error: 'prompt is required' });
          console.log(`🧱 Meshy text-to-3D preview: ${body.prompt.slice(0, 80)}…`);
          const taskId = await createBudgeted(k, 'text', {
            mode: 'preview',
            prompt: body.prompt.trim().slice(0, 800),
            ai_model: 'latest',
            pose_mode: 'a-pose',      // rig-friendly
            topology: 'triangle',
            target_polycount: 30000,
            should_remesh: true,
          });
          json(res, 200, { taskId });
        }, res);
      });

      server.middlewares.use('/api/meshy/refine', (req, res) => {
        const k = guard(req, res, 'POST'); if (!k) return;
        wrap(async () => {
          const body = JSON.parse(await readBody(req)) as { previewTaskId?: string };
          if (!body.previewTaskId) return json(res, 400, { error: 'previewTaskId is required' });
          const taskId = await createBudgeted(k, 'text', { mode: 'refine', preview_task_id: body.previewTaskId, enable_pbr: false, ai_model: 'latest' });
          json(res, 200, { taskId });
        }, res);
      });

      server.middlewares.use('/api/meshy/image-to-3d', (req, res) => {
        const k = guard(req, res, 'POST'); if (!k) return;
        wrap(async () => {
          const body = JSON.parse(await readBody(req)) as { imageDataUrl?: string };
          if (!body.imageDataUrl?.startsWith('data:image/')) return json(res, 400, { error: 'imageDataUrl (a data: URL) is required' });
          console.log('🧱 Meshy image-to-3D');
          const taskId = await createBudgeted(k, 'image', {
            image_url: body.imageDataUrl,
            ai_model: 'latest',
            pose_mode: 'a-pose',
            should_texture: true,
            enable_pbr: false,
            topology: 'triangle',
            target_polycount: 30000,
            should_remesh: true,
          });
          json(res, 200, { taskId });
        }, res);
      });

      server.middlewares.use('/api/meshy/rig', (req, res) => {
        const k = guard(req, res, 'POST'); if (!k) return;
        wrap(async () => {
          const body = JSON.parse(await readBody(req)) as { inputTaskId?: string; heightMeters?: number };
          if (!body.inputTaskId) return json(res, 400, { error: 'inputTaskId is required' });
          const taskId = await createBudgeted(k, 'rig', { input_task_id: body.inputTaskId, height_meters: body.heightMeters ?? STANDARD_HEIGHT_M });
          json(res, 200, { taskId });
        }, res);
      });

      server.middlewares.use('/api/meshy/task', (req, res) => {
        const k = guard(req, res, 'GET'); if (!k) return;
        wrap(async () => {
          const u = new URL(req.url ?? '/', 'http://x');
          const kind = u.searchParams.get('kind') as TaskKind | null;
          const id = u.searchParams.get('id');
          if (!kind || !TASK_PATH[kind] || !id) return json(res, 400, { error: 'kind (text|image|rig) and id are required' });
          const t = await getTask(k, kind, id);
          json(res, 200, {
            id: t.id,
            status: t.status,
            progress: t.progress ?? 0,
            thumbnailUrl: t.thumbnail_url,
            glbUrl: t.model_urls?.glb ?? t.result?.rigged_character_glb_url,
            error: t.task_error?.message,
            credits: t.consumed_credits,
          });
        }, res);
      });

      // Bring it home: the source task's GLB (static), the rig's GLB
      // (raw + renamed) and its bundled walking/running clips, into the
      // store; registered in the manifest only if it walks.
      server.middlewares.use('/api/meshy/save', (req, res) => {
        const k = guard(req, res, 'POST'); if (!k) return;
        wrap(async () => {
          const body = JSON.parse(await readBody(req)) as {
            name?: string; sourceKind?: 'text' | 'image'; sourceTaskId?: string; rigTaskId?: string; prompt?: string; previewTaskId?: string;
          };
          if (!body.name || !body.sourceKind || !body.sourceTaskId) return json(res, 400, { error: 'name, sourceKind and sourceTaskId are required' });
          const source = await getTask(k, body.sourceKind, body.sourceTaskId);
          if (source.status !== 'SUCCEEDED' || !source.model_urls?.glb) return json(res, 400, { error: `source task is ${source.status}` });
          const stem = freeStem(dir, `${storeSlug(body.name)}_meshy`, ['.glb', '_static.glb']);
          const files: string[] = [];
          const staticGlb = await download(source.model_urls.glb);
          writeFileSync(join(dir, `${stem}_static.glb`), staticGlb);   // gitignored (*_static.glb)
          files.push(`${stem}_static.glb`);
          const when = new Date().toISOString().slice(0, 10);
          const how = body.sourceKind === 'text' ? 'Meshy text-to-3D' : 'Meshy image-to-3D';
          const taskIds: Record<string, string> = {
            ...(body.previewTaskId ? { preview: body.previewTaskId } : {}),
            [body.sourceKind === 'text' ? 'refine' : 'image']: body.sourceTaskId,
            ...(body.rigTaskId ? { rig: body.rigTaskId } : {}),
          };
          const noteTasks = Object.entries(taskIds).map(([kk, v]) => `${kk} ${v}`).join(', ');

          let rig: MeshyTask | undefined;
          if (body.rigTaskId) {
            rig = await getTask(k, 'rig', body.rigTaskId);
            if (rig.status !== 'SUCCEEDED') rig = undefined;
          }
          if (!rig?.result?.rigged_character_glb_url) {
            // No rig: a prop or creature. Dropped in, not registered.
            writeFileSync(join(dir, `${stem}.glb`), staticGlb);
            files.push(`${stem}.glb`);
            const stored: StoredBody & { taskIds: Record<string, string>; how: string } = {
              file: `${stem}.glb`, files, humanoid: false, renamedBones: 0, clips: [], taskIds, how,
            };
            return json(res, 200, stored);
          }
          const rigged = await download(rig.result.rigged_character_glb_url);
          const anims = rig.result.basic_animations ?? {};
          const extras: { suffix: string; data: Buffer; clip?: string }[] = [];
          const pull = async (urlKey: string, suffix: string, clip?: string) => {
            const url = anims[urlKey];
            if (!url) return;
            try { extras.push({ suffix, data: await download(url), clip }); } catch (err) { console.warn('🧱 skip', urlKey, err); }
          };
          await pull('walking_glb_url', '_walking.glb');
          await pull('running_glb_url', '_running.glb');
          await pull('walking_armature_glb_url', '_walking_armature.glb', 'walk');
          await pull('running_armature_glb_url', '_running_armature.glb', 'run');
          const stored = storeRiggedGlb(dir, stem, rigged, extras, {
            name: `${body.name} (${how}, auto-rigged ${when})`,
            _note: `Made from the Dramaton editor's 3-D BODY card. Meshy's rig renamed to mixamorig:* in the GLB JSON (Spine02/Spine01/Spine -> Spine/Spine1/Spine2, neck -> Neck, head_end -> HeadTop_End); raw names in ${stem}_raw.glb; untouched export ${stem}_static.glb (gitignored); bundled Meshy clips ${stem}_walking.glb / ${stem}_running.glb (+ *_armature.glb clip-only).${body.prompt ? ` Prompt: ${body.prompt.slice(0, 200)}` : ''} Meshy tasks: ${noteTasks}.`,
          });
          json(res, 200, { ...stored, files: [...files, ...stored.files], taskIds, how });
        }, res);
      });
    },
  };
}
