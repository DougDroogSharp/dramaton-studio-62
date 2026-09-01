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

  return {
    name: 'dram-bridge',
    apply: 'serve',
    configureServer(server) {
      server.ws.on('dram:push', (data: unknown) => {
        lastDoc = data;
      });

      server.middlewares.use('/bridge/game', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          res.end(JSON.stringify(lastDoc));
          return;
        }

        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const doc = JSON.parse(body);
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
