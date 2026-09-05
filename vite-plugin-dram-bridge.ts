import { Plugin } from 'vite';

/**
 * DRAM BRIDGE — dev-server collaboration endpoint (2026-08-31).
 *
 * Lets an AI collaborator (or any local tool) read and write the LIVE game
 * document while the editor is open. The whole editable surface is one
 * GameData JSON, so the bridge is two routes plus a websocket mirror:
 *
 *   GET  /bridge/game  -> the live GameData (as last pushed by the editor);
 *                         the ETag header carries its revision, e.g. "17"
 *   PUT  /bridge/game  -> replace the document; the open editor applies it
 *                         immediately (through migrateGameData on the client).
 *                         MUST carry If-Match: "<rev>" from the GET it edited:
 *                         428 without it, 409 if the document moved since
 *                         (Doug renamed something in the editor after the
 *                         AI's read). Body must be a JSON object.
 *
 * The editor pushes its state over Vite's own HMR websocket (dram:push) and
 * listens for externally written documents (dram:apply). Dev server only —
 * localhost collaboration, not a production surface.
 *
 * Revision guard added 2026-09-04 (code dive: an AI PUT silently discarded
 * whatever the editor changed after the AI's GET — last writer wins). The
 * rev is a counter that bumps on every change to the mirrored document:
 * editor push, PUT, /bridge/say. Read, edit, write with the rev you read.
 */
export function dramBridgePlugin(): Plugin {
  let lastDoc: unknown = null;
  let rev = 0;

  const MAX_BODY_BYTES = 64 * 1024 * 1024; // a .dram with inline images can be big, but not this big
  const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  // The HMR websocket is reachable from the LAN like the rest of the dev
  // server. Vite hands the handler its client; the peer address sits on the
  // underlying socket. Refuse a push only when the address is KNOWN to be
  // remote — if a future Vite hides it, the editor on this machine still works.
  const wsAddr = (client: unknown): string => {
    const raw = (client as { socket?: { _socket?: { remoteAddress?: string } } } | undefined)?.socket?._socket?.remoteAddress;
    return typeof raw === 'string' ? raw : '';
  };
  const etag = () => `"${rev}"`;
  const ifMatch = (raw: string | string[] | undefined): string | null => {
    const v = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
    if (!v) return null;
    return v.replace(/^W\//, '').replace(/^"|"$/g, '');
  };

  return {
    name: 'dram-bridge',
    apply: 'serve',
    configureServer(server) {
      server.ws.on('dram:push', (data: unknown, client: unknown) => {
        const addr = wsAddr(client);
        if (addr && !LOOPBACK.has(addr)) return;   // only the editor on this machine sets the document
        if (!isObject(data)) return;
        lastDoc = data;
        rev += 1;
      });

      // POST /bridge/say { thingId, text, who?: 'doug'|'phrog', turned?: KnobTurn[] }
      // The per-object conversation channel (the halo's Talk handle,
      // 2026-09-02): append one line to that thing's log in the live
      // document and push it to the open editor. An outside voice client
      // speaks through here; a Phrog session replies through here with
      // who:'phrog' and the knobs it turned, after PUTting its edits.
      server.middlewares.use('/bridge/say', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) {
          res.statusCode = 403;
          res.end(JSON.stringify({ ok: false, error: 'bridge is localhost-only' }));
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'POST only' }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => { chunks.push(chunk); });
        req.on('error', (err: Error) => {
          if (res.writableEnded) return;
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: `request failed: ${err.message}` }));
        });
        req.on('end', () => {
          if (res.writableEnded) return;
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              thingId?: string; text?: string; who?: 'doug' | 'phrog'; turned?: unknown[];
            };
            const doc = lastDoc as Record<string, unknown[]> | null;
            if (!doc) throw new Error('no document open in the editor yet');
            if (!body.thingId || !body.text?.trim()) throw new Error('thingId and text are required');
            const line = {
              at: new Date().toISOString(),
              who: body.who === 'phrog' ? 'phrog' : 'doug',
              text: body.text.trim(),
              ...(Array.isArray(body.turned) && body.turned.length > 0 ? { turned: body.turned } : {}),
            };
            let hit = false;
            for (const key of ['things', 'actors', 'scenes', 'drops', 'items', 'sfx', 'buttons']) {
              const arr = doc[key];
              if (!Array.isArray(arr)) continue;
              doc[key] = arr.map((rec: unknown) => {
                const r = rec as { id?: string; log?: unknown[] };
                if (!r || r.id !== body.thingId) return rec;
                hit = true;
                return { ...r, log: [...(Array.isArray(r.log) ? r.log : []), line] };
              });
            }
            if (!hit) throw new Error(`no thing with id ${body.thingId}`);
            lastDoc = doc;
            rev += 1;
            server.ws.send('dram:apply', doc);
            res.setHeader('ETag', etag());
            res.end(JSON.stringify({ ok: true, line, rev }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });

      server.middlewares.use('/bridge/game', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        // The dev server binds every interface (phone previews), but the
        // bridge is a WRITE surface — loopback only.
        if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) {
          res.statusCode = 403;
          res.end(JSON.stringify({ ok: false, error: 'bridge is localhost-only' }));
          return;
        }

        if (req.method === 'GET') {
          res.setHeader('ETag', etag());
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(lastDoc));
          return;
        }

        if (req.method === 'PUT') {
          const stale = (code: number, why: string) => {
            res.statusCode = code;
            res.setHeader('ETag', etag());
            res.end(JSON.stringify({
              ok: false, rev,
              error: `${why}. GET /bridge/game, take its ETag, make your edit on that document, and PUT with If-Match: "<rev>".`,
            }));
          };
          const claimed = ifMatch(req.headers['if-match']);
          if (claimed === null) { stale(428, 'If-Match is required'); req.resume(); return; }
          if (claimed !== String(rev)) { stale(409, `the document is at rev ${rev}, not ${claimed}`); req.resume(); return; }

          // Collect raw Buffers and decode ONCE — concatenating string
          // chunks corrupts multi-byte UTF-8 split across chunk boundaries.
          const chunks: Buffer[] = [];
          let received = 0;
          req.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (received > MAX_BODY_BYTES) {
              res.statusCode = 413;
              res.end(JSON.stringify({ ok: false, error: 'document too large' }));
              req.destroy();
              return;
            }
            chunks.push(chunk);
          });
          req.on('error', (err: Error) => {
            // An aborted upload used to surface as an unhandled stream error.
            if (res.writableEnded) return;
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: `upload failed: ${err.message}` }));
          });
          req.on('end', () => {
            if (res.writableEnded) return;
            try {
              const doc: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              if (!isObject(doc)) throw new Error('the document must be a JSON object');
              // Checked again at write time: the editor may have pushed while the body was in flight.
              if (claimed !== String(rev)) { stale(409, `the document moved to rev ${rev} while your PUT was in flight`); return; }
              lastDoc = doc;
              rev += 1;
              server.ws.send('dram:apply', doc);
              res.setHeader('ETag', etag());
              res.end(JSON.stringify({ ok: true, rev }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'GET or PUT only' }));
      });
    },
  };
}
