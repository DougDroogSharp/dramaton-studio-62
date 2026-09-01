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
