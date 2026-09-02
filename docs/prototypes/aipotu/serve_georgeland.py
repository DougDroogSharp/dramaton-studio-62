# Georgeland Editor server (default port 8218) — filed 2026-09-02 12:36 (-07:00) by EDITOR.
# The same no-store static server as serve_nocache.py (so the editor, the game
# and vendor/three are all served from this worktree), plus the GEORGELAND BRIDGE:
# the editor's live document over HTTP so a voice-driven Claude can co-edit it
# while Doug watches the page update (GEORGELAND_EDITOR_DESIGN.md §4, the DRAM
# bridge pattern of docs/DRAM_BRIDGE.md, plus a rev guard).
#
#   GET  /bridge/georgeland            -> {"rev": n, "doc": {...}}   (204 if ?since=n matches)
#   PUT  /bridge/georgeland            <- {"doc": {...}, "baseRev": n?, "by": "claude"}
#                                       replaces the document; 409 {"rev":n,"doc":…} if
#                                       baseRev is given and is stale (read-modify-write).
#   POST /bridge/command               <- {"cmd": "scatter 12 berries near the beach"}
#                                       queues a sentence for the page's command parser
#                                       (same grammar as the on-page command bar);
#                                       returns {"n": id}. GET /bridge/command?since=n
#                                       lists queued commands and their results.
#   POST /bridge/command/result        <- {"n": id, "result": "..."}  (the page reports back)
#   POST /georgeland/save              <- {"doc": {...}}  writes georgelands/<id>.json
#   GET  /georgeland/list              -> ["aipotu-x", ...]  (files in georgelands/)
#   /bridge/game is an alias of /bridge/georgeland (the design doc's wording).
#
# Localhost/LAN dev surface only, like the DRAM bridge; not for the published game.
import http.server
import json
import os
import sys
import threading
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8218
SAVE_DIR = 'georgelands'
MAX_BODY = 8 * 1024 * 1024

STATE = {'rev': 0, 'doc': None, 'by': None, 'at': None}
CMDS = []          # [{'n':1,'cmd':'…','at':'…','result':None}]
LOCK = threading.Lock()


def stamp():
    return datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, fmt, *args):   # quiet the poll chatter
        if '/bridge/' in (args[0] if args else ''):
            return
        super().log_message(fmt, *args)

    # ---- helpers
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length', 0))
        if n > MAX_BODY:
            raise ValueError('body too large')
        raw = self.rfile.read(n).decode('utf-8')
        return json.loads(raw) if raw else {}

    def _route(self):
        path, _, qs = self.path.partition('?')
        if path == '/bridge/game':
            path = '/bridge/georgeland'
        q = {}
        for kv in qs.split('&'):
            if '=' in kv:
                k, v = kv.split('=', 1)
                q[k] = v
        return path, q

    # ---- GET
    def do_GET(self):
        path, q = self._route()
        if path == '/bridge/georgeland':
            with LOCK:
                if q.get('since') is not None and q.get('since').isdigit() and int(q['since']) == STATE['rev']:
                    self.send_response(204)
                    self.end_headers()
                    return
                self._json(200, {'rev': STATE['rev'], 'doc': STATE['doc'], 'by': STATE['by'], 'at': STATE['at']})
            return
        if path == '/bridge/command':
            since = int(q['since']) if q.get('since', '').isdigit() else 0
            with LOCK:
                self._json(200, {'commands': [c for c in CMDS if c['n'] > since], 'last': CMDS[-1]['n'] if CMDS else 0})
            return
        if path == '/georgeland/list':
            os.makedirs(SAVE_DIR, exist_ok=True)
            names = sorted(f[:-5] for f in os.listdir(SAVE_DIR) if f.endswith('.json'))
            self._json(200, names)
            return
        if path == '/bridge/status':
            with LOCK:
                self._json(200, {'ok': True, 'rev': STATE['rev'], 'hasDoc': STATE['doc'] is not None,
                                 'commands': len(CMDS), 'port': PORT, 'at': stamp()})
            return
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    # ---- PUT
    def do_PUT(self):
        path, _ = self._route()
        if path != '/bridge/georgeland':
            self.send_error(404)
            return
        try:
            b = self._body()
            doc = b.get('doc') if isinstance(b, dict) and 'doc' in b else b
            if not isinstance(doc, dict) or doc.get('format') != 'georgeland/1':
                raise ValueError('body must be {"doc": <georgeland/1 document>}')
            with LOCK:
                base = b.get('baseRev') if isinstance(b, dict) else None
                if base is not None and int(base) != STATE['rev']:
                    self._json(409, {'error': 'stale baseRev', 'rev': STATE['rev'], 'doc': STATE['doc']})
                    return
                STATE['rev'] += 1
                STATE['doc'] = doc
                STATE['by'] = (b.get('by') if isinstance(b, dict) else None) or 'unknown'
                STATE['at'] = stamp()
                self._json(200, {'ok': True, 'rev': STATE['rev']})
        except Exception as e:
            self._json(400, {'ok': False, 'error': str(e)})

    # ---- POST
    def do_POST(self):
        path, _ = self._route()
        try:
            if path == '/bridge/command':
                b = self._body()
                cmd = (b.get('cmd') or '').strip()
                if not cmd:
                    raise ValueError('cmd required')
                with LOCK:
                    n = (CMDS[-1]['n'] + 1) if CMDS else 1
                    CMDS.append({'n': n, 'cmd': cmd, 'at': stamp(), 'result': None, 'by': b.get('by') or 'claude'})
                    del CMDS[:-200]
                self._json(200, {'ok': True, 'n': n})
                return
            if path == '/bridge/command/result':
                b = self._body()
                with LOCK:
                    for c in CMDS:
                        if c['n'] == int(b.get('n', -1)):
                            c['result'] = b.get('result')
                self._json(200, {'ok': True})
                return
            if path == '/shot':
                # a PNG capture from the page ({"name": "...", "png": "data:image/png;base64,..."}) -> captures/<name>.png
                import base64
                b = self._body()
                data = b.get('png') or ''
                if not data.startswith('data:image/png;base64,'):
                    raise ValueError('png must be a data:image/png;base64 URL')
                name = ''.join(ch for ch in str(b.get('name') or 'capture') if ch.isalnum() or ch in '-_') or 'capture'
                os.makedirs('captures', exist_ok=True)
                fn = os.path.join('captures', name + '_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.png')
                with open(fn, 'wb') as f:
                    f.write(base64.b64decode(data.split(',', 1)[1]))
                self._json(200, {'ok': True, 'file': os.path.abspath(fn), 'bytes': os.path.getsize(fn)})
                return
            if path == '/georgeland/save':
                b = self._body()
                doc = b.get('doc') if 'doc' in b else b
                if not isinstance(doc, dict) or doc.get('format') != 'georgeland/1':
                    raise ValueError('body must be {"doc": <georgeland/1 document>}')
                gid = str(doc.get('id') or '').lower()
                if not gid or any(ch not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for ch in gid):
                    raise ValueError('doc.id must be a slug [a-z0-9-]')
                os.makedirs(SAVE_DIR, exist_ok=True)
                fn = os.path.join(SAVE_DIR, gid + '.json')
                with open(fn, 'w', encoding='utf-8', newline='\n') as f:
                    json.dump(doc, f, ensure_ascii=False, indent=1)
                    f.write('\n')
                self._json(200, {'ok': True, 'file': fn.replace(os.sep, '/'), 'bytes': os.path.getsize(fn), 'at': stamp()})
                return
            self.send_error(404)
        except Exception as e:
            self._json(400, {'ok': False, 'error': str(e)})


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(SAVE_DIR, exist_ok=True)
    print(f'Georgeland Editor server: {os.getcwd()} on 0.0.0.0:{PORT} (no-cache; bridge at /bridge/georgeland, saves in {SAVE_DIR}/)')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
