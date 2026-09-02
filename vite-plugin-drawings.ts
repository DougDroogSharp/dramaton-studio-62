import { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * DRAWINGS FOLDER — dev-server import route (Facing Alligators, 2026-09-02).
 *
 * The editor's Drawings tab can pull an artist's whole folder in one go
 * instead of one file picker per image:
 *
 *   GET /api/drawings/list?dir=<absolute folder>   -> { ok, dir, files: [{ name, path, size, mtime }] }
 *   GET /api/drawings/file?path=<absolute file>    -> the image bytes with its mime type
 *
 * Read-only, dev server only, loopback only, and confined to the user's home
 * directory (Dropbox lives there). Nothing is copied or moved on disk: the
 * editor reads the bytes into the document and the folder stays the artist's.
 */
export function drawingsPlugin(): Plugin {
  const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
  };
  const home = path.resolve(os.homedir());
  const insideHome = (p: string): boolean => {
    const r = path.resolve(p);
    const rel = path.relative(home, r);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };

  return {
    name: 'drawings-folder',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/drawings', (req, res) => {
        const json = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };

        if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) {
          json(403, { ok: false, error: 'drawings route is localhost-only' });
          return;
        }
        if (req.method !== 'GET') {
          json(405, { ok: false, error: 'GET only' });
          return;
        }

        const url = new URL(req.url ?? '/', 'http://localhost');

        if (url.pathname === '/list') {
          const dir = url.searchParams.get('dir') ?? '';
          if (!dir || !insideHome(dir)) {
            json(400, { ok: false, error: 'dir must be an absolute path inside your home folder' });
            return;
          }
          let entries: fs.Dirent[];
          try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
          } catch (err) {
            json(404, { ok: false, error: `cannot read folder: ${(err as Error).message}` });
            return;
          }
          const files = entries
            .filter(e => e.isFile() && MIME[path.extname(e.name).toLowerCase()])
            .map(e => {
              const full = path.join(dir, e.name);
              const st = fs.statSync(full);
              return { name: e.name, path: full, size: st.size, mtime: st.mtimeMs };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
          json(200, { ok: true, dir: path.resolve(dir), files });
          return;
        }

        if (url.pathname === '/file') {
          const p = url.searchParams.get('path') ?? '';
          const mime = MIME[path.extname(p).toLowerCase()];
          if (!p || !insideHome(p) || !mime) {
            json(400, { ok: false, error: 'path must be an image inside your home folder' });
            return;
          }
          if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
            json(404, { ok: false, error: 'no such file' });
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'no-store');
          fs.createReadStream(p).pipe(res);
          return;
        }

        json(404, { ok: false, error: 'unknown drawings route (list | file)' });
      });
    },
  };
}
