import { Plugin } from 'vite';

/**
 * DRAM BRIDGE — dev-server collaboration endpoint (2026-08-31).
 *
 * Lets an AI collaborator (or any local tool) read and write the LIVE game
 * document while the editor is open. The whole editable surface is one
 * GameData JSON, so the bridge is two routes plus a websocket mirror:
 *
 *   GET  /bridge/game  -> the live GameData (as last pushed by the editor)
 *   PUT  /bridge/game  -> replace the document; the open editor applies it
 *                         immediately (through migrateGameData on the client)
 *
 * The editor pushes its state over Vite's own HMR websocket (dram:push) and
 * listens for externally written documents (dram:apply). Dev server only —
 * localhost collaboration, not a production surface.
 */
export function dramBridgePlugin(): Plugin {
  let lastDoc: unknown = null;

  const MAX_BODY_BYTES = 64 * 1024 * 1024; // a .dram with inline images can be big, but not this big
  const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

  return {
    name: 'dram-bridge',
    apply: 'serve',
    configureServer(server) {
      server.ws.on('dram:push', (data: unknown) => {
        lastDoc = data;
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
        req.on('end', () => {
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
            server.ws.send('dram:apply', doc);
            res.end(JSON.stringify({ ok: true, line }));
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
          res.end(JSON.stringify(lastDoc));
          return;
        }

        if (req.method === 'PUT') {
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
          req.on('end', () => {
            if (res.writableEnded) return;
            try {
              const doc = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              lastDoc = doc;
              server.ws.send('dram:apply', doc);
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
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
