// Model store bridge (dev only). Serves the ONE model registry the asset
// stage already uses — docs/prototypes/aipotu/vendor/models/ and its
// manifest.json — to the editor at /models/<file>, and lists it at
// /api/models/list, so a 3-D actor's Skin can point at a store file instead
// of carrying the binary (decisions 6 / 35b: one registry, Dropbox models/
// retired).
//
// WRITES (2026-09-03, after the HvM 3D session's convention note of 00:15):
// this lane only ADDS files and APPENDS manifest entries, under a lock
// file, never rewriting or removing anyone else's entry; and only a
// HUMANOID (rigged biped with the seven mixamorig leg bones) is registered
// in manifest.json, because that file drives the Terrain Walk's walker
// menu. Anything else is dropped into the folder unregistered and reported
// for the creature bench. See docs/editor/ACTOR_3D_PLAN.md.
//
// Filed 2026-09-02 22:07 -07:00 by EDITOR (actor-3d lane); writes added
// 2026-09-03 00:40 -07:00.

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  closeSync, createReadStream, existsSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync,
} from 'fs';
import { basename, join, resolve } from 'path';
import { glbNodeNames, renameGlbNodes } from './src/utils/glbRename';
import { looksLikeMeshyRig, meshyToMixamo } from './src/utils/meshyBones';
import { rigKindFromNames } from './src/utils/rigKind';

const toArrayBuffer = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

// Write and spend surfaces are localhost-only (code dive 2026-09-04): the dev
// server listens on every interface, so without this any device on the wifi
// could write into the model store or run Meshy on Doug's key. Same gate the
// DRAM bridge has used since 2026-08-31.
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const isLoopback = (req: IncomingMessage): boolean => LOOPBACK.has(req.socket.remoteAddress ?? '');

export const readBody = (req: IncomingMessage, maxBytes = 256 * 1024 * 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (c: Buffer) => {
      received += c.length;
      if (received > maxBytes) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

// A store-safe file stem: lower-case, underscores, nothing else.
export const storeSlug = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'thing';

// Never overwrite: if <stem>.glb exists, use <stem>_2.glb, _3 ...
export const freeStem = (dir: string, stem: string, suffixes: string[]): string => {
  const taken = (s: string) => suffixes.some(x => existsSync(join(dir, `${s}${x}`)));
  if (!taken(stem)) return stem;
  for (let i = 2; i < 1000; i++) if (!taken(`${stem}_${i}`)) return `${stem}_${i}`;
  throw new Error(`no free name for ${stem}`);
};

// Append one skins[] entry under a lock file. Read-modify-write of the
// whole document so other sessions' entries and readme strings survive
// byte for byte (the file is UTF-8 with em-dashes; we keep it that way).
export const appendManifestSkin = (dir: string, entry: { file: string; name: string; mb?: number; _note?: string }): void => {
  const manifestPath = join(dir, 'manifest.json');
  const lockPath = `${manifestPath}.lock`;
  let fd: number | undefined;
  const deadline = Date.now() + 5000;
  for (;;) {
    try { fd = openSync(lockPath, 'wx'); break; } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST' || Date.now() > deadline) throw new Error(`manifest is locked (${lockPath})`);
      const until = Date.now() + 100;
      while (Date.now() < until) { /* spin briefly; dev-only */ }
    }
  }
  try {
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, 'utf8')) as { skins?: unknown[] }
      : {};
    const skins = Array.isArray(manifest.skins) ? manifest.skins : [];
    if (!skins.some(s => (s as { file?: string }).file === entry.file)) skins.push(entry);
    manifest.skins = skins;
    const tmp = `${manifestPath}.tmp`;
    writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    renameSync(tmp, manifestPath);
  } finally {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(lockPath); } catch { /* already gone */ }
  }
};

export interface StoredBody {
  file: string;                 // the file the Skin points at
  files: string[];              // everything written
  humanoid: boolean;            // registered in manifest.json
  renamedBones: number;
  clips: { name: string; file: string }[];
}

// Put a rigged (or not) GLB into the store the way the Meshy session did
// by hand: <stem>_raw.glb keeps Meshy's bone names, <stem>.glb carries the
// mixamorig names; bundled walking/running siblings get the same rename.
export const storeRiggedGlb = (
  dir: string,
  stem: string,
  rigged: Buffer,
  extras: { suffix: string; data: Buffer; clip?: string }[],
  register: { name: string; _note?: string },
): StoredBody => {
  const files: string[] = [];
  const names = glbNodeNames(toArrayBuffer(rigged));
  const meshy = looksLikeMeshyRig(names);
  let renamedBones = 0;
  let main = rigged;
  if (meshy) {
    writeFileSync(join(dir, `${stem}_raw.glb`), rigged);
    files.push(`${stem}_raw.glb`);
    const r = renameGlbNodes(toArrayBuffer(rigged), meshyToMixamo);
    renamedBones = r.renamed;
    main = Buffer.from(r.glb);
  }
  const file = `${stem}.glb`;
  writeFileSync(join(dir, file), main);
  files.push(file);
  const clips: StoredBody['clips'] = [];
  for (const x of extras) {
    let data = x.data;
    if (meshy) { try { data = Buffer.from(renameGlbNodes(toArrayBuffer(x.data), meshyToMixamo).glb); } catch { /* not a glb: keep raw */ } }
    const f = `${stem}${x.suffix}`;
    writeFileSync(join(dir, f), data);
    files.push(f);
    if (x.clip) clips.push({ name: x.clip, file: f });
  }
  const humanoid = rigKindFromNames(glbNodeNames(toArrayBuffer(main))) === 'mixamorig';
  if (humanoid) {
    appendManifestSkin(dir, {
      file,
      name: register.name,
      mb: Math.round(main.length / 1024 / 1024 * 10) / 10,
      ...(register._note ? { _note: register._note } : {}),
    });
  }
  return { file, files, humanoid, renamedBones, clips };
};

// Relative to the Vite root (the repo checkout). The main checkout, every
// worktree and the netlify staging copy all carry the store at this path.
export const MODELS_DIR_REL = 'docs/prototypes/aipotu/vendor/models';

const MIME: Record<string, string> = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.vrm': 'model/gltf-binary',
  '.fbx': 'application/octet-stream',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

interface ManifestEntry {
  file: string;
  name: string;
  mb?: number;
  _note?: string;
}

interface Manifest {
  skins?: ManifestEntry[];
  vita_animations?: ManifestEntry[];
  props?: ManifestEntry[];
}

// What the editor's 3-D BODY section shows: every rigged skin from the
// manifest, every clip file on disk, and the props, each with its size.
export interface ModelStoreListing {
  skins: ManifestEntry[];
  clips: ManifestEntry[];
  props: ManifestEntry[];
  dir: string;
  error?: string;
}

const mbOf = (path: string): number | undefined => {
  try { return Math.round(statSync(path).size / 1024 / 1024 * 10) / 10; } catch { return undefined; }
};

// Clip files: the manifest's vita_animations point at the mesh+clip GLBs;
// the bones-only *_clip.glb sibling is what an actor's body actually
// borrows. List every *_clip.glb / *_armature.glb on disk, named from the
// manifest where it knows them, from the file name otherwise.
export function listClips(dir: string, manifest: Manifest): ManifestEntry[] {
  const known = new Map<string, string>();
  for (const a of manifest.vita_animations ?? []) {
    const clipFile = a.file.replace(/\.glb$/i, '_clip.glb');
    known.set(clipFile, a.name.replace(/\s*\(.*\)\s*$/, '').trim() || a.name);
  }
  let files: string[] = [];
  try { files = readdirSync(dir); } catch { return []; }
  return files
    .filter(f => /_(clip|armature)\.glb$/i.test(f))
    .sort()
    .map(f => ({
      file: f,
      name: known.get(f) ?? f.replace(/^vita_anim_/, '').replace(/_(clip|armature)\.glb$/i, '').replace(/_/g, ' '),
      mb: mbOf(join(dir, f)),
    }));
}

export const readListing = (root: string, env: Record<string, string> = {}): ModelStoreListing =>
  readListingFrom(resolveModelsDir(root, env));

// Where the store is. A worktree only carries the COMMITTED files; the newest
// Meshy bodies and clip files sit uncommitted in the main checkout tonight.
// MODELS_DIR in .env.local (absolute path) points a lane at the one live
// store; unset, the checkout's own copy is used.
export function resolveModelsDir(root: string, env: Record<string, string> = {}): string {
  const override = env.MODELS_DIR?.trim();
  return override ? resolve(override) : resolve(root, MODELS_DIR_REL);
}

export function readListingFrom(dir: string): ModelStoreListing {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return { skins: [], clips: [], props: [], dir, error: `no manifest at ${manifestPath}` };
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch (err) {
    return { skins: [], clips: [], props: [], dir, error: `manifest unreadable: ${err instanceof Error ? err.message : String(err)}` };
  }
  const withSize = (e: ManifestEntry): ManifestEntry => ({ ...e, mb: e.mb ?? mbOf(join(dir, e.file)) });
  return {
    skins: (manifest.skins ?? []).filter(e => existsSync(join(dir, e.file))).map(withSize),
    clips: listClips(dir, manifest),
    props: (manifest.props ?? []).filter(e => existsSync(join(dir, e.file))).map(withSize),
    dir,
  };
}

export function modelsPlugin(env: Record<string, string> = {}): Plugin {
  let dir = resolveModelsDir(process.cwd(), env);
  return {
    name: 'model-store-bridge',
    configResolved(config) {
      dir = resolveModelsDir(config.root, env);
      config.logger.info(`📦 model store: ${dir}${env.MODELS_DIR ? ' (MODELS_DIR)' : ''}`);
    },
    configureServer(server) {
      const json = (res: ServerResponse, status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      };

      server.middlewares.use('/api/models/list', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
        json(res, 200, readListingFrom(dir));
      });

      // "Give it a body from a file": { name, fileName, dataBase64, note? }.
      // A .glb goes through the Meshy rename if it carries Meshy's bone
      // names; .fbx/.gltf/.vrm are stored as-is (the stage's FBX loader
      // normalises Mixamo names at load). Registered only if humanoid.
      server.middlewares.use('/api/models/import', (req: IncomingMessage, res: ServerResponse) => {
        if (!isLoopback(req)) return json(res, 403, { error: 'model import is localhost-only' });
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
        (async () => {
          const body = JSON.parse(await readBody(req)) as { name?: string; fileName?: string; dataBase64?: string; note?: string };
          if (!body.fileName || !body.dataBase64) return json(res, 400, { error: 'fileName and dataBase64 are required' });
          const ext = (body.fileName.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
          if (!['.glb', '.gltf', '.vrm', '.fbx'].includes(ext)) return json(res, 400, { error: `unsupported file type ${ext || '(none)'}` });
          const data = Buffer.from(body.dataBase64, 'base64');
          const baseStem = storeSlug(body.name || body.fileName.replace(/\.[^.]+$/, ''));
          const stem = freeStem(dir, baseStem, [ext, '_raw.glb']);
          const label = (body.name || baseStem).trim();
          const filedAt = new Date().toISOString().slice(0, 10);
          if (ext === '.glb') {
            const stored = storeRiggedGlb(dir, stem, data, [], {
              name: `${label} (imported ${filedAt})`,
              _note: `Imported from disk through the Dramaton editor's 3-D BODY card (${body.fileName}).${body.note ? ' ' + body.note : ''}`,
            });
            return json(res, 200, stored);
          }
          const file = `${stem}${ext}`;
          writeFileSync(join(dir, file), data);
          const humanoid = ext === '.fbx' ? /mixamorig/i.test(data.toString('latin1', 0, Math.min(data.length, 4 * 1024 * 1024))) : false;
          if (humanoid) appendManifestSkin(dir, { file, name: `${label} (imported ${filedAt})`, mb: Math.round(data.length / 1024 / 1024 * 10) / 10 });
          const stored: StoredBody = { file, files: [file], humanoid, renamedBones: 0, clips: [] };
          json(res, 200, stored);
        })().catch((err: unknown) => json(res, 500, { error: err instanceof Error ? err.message : String(err) }));
      });

      // /models/<file>: one file out of the store, no directory walking
      // (basename only), no caching (the store changes under us hourly).
      server.middlewares.use('/models', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const file = basename(raw);
        if (!file || file !== raw.replace(/^\/+/, '')) return json(res, 400, { error: 'one file name, no path' });
        const path = join(dir, file);
        if (!existsSync(path) || !statSync(path).isFile()) return json(res, 404, { error: `${file} is not in the model store` });
        const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
        res.setHeader('Content-Length', String(statSync(path).size));
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'HEAD') return res.end();
        createReadStream(path).pipe(res);
      });
    },
  };
}
