# George World prototype server (default port 8201) — filed 2026-08-30; notes endpoint added 2026-09-01 19:05 PDT
# Same as `python -m http.server` but sends no-store headers on every response,
# so a plain browser refresh ALWAYS fetches the latest build. Stale-cache-proof.
#
# POST /stage-notes  — the HvB Asset Stage sends Doug's per-item critique notes
# (a JSON object {file: {label, text, ts}}); the server writes stage_notes.json
# (the data) and STAGE_NOTES.md (readable) next to the studies so any session
# can read what Doug thought of each asset. GET /stage_notes.json is served by
# the static handler like any other file.
import http.server
import json
import os
import sys
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8201
NOTES_JSON = 'stage_notes.json'
NOTES_MD = 'STAGE_NOTES.md'


def write_notes_md(notes):
    stamp = datetime.now().strftime('%Y-%m-%d %H:%M')
    lines = ['# HvB ASSET STAGE — Doug\'s notes per item',
             f'Regenerated {stamp} by serve_nocache.py from stage_notes.json (written by the stage\'s notes box). Newest edits first.',
             '']
    items = sorted(notes.items(), key=lambda kv: kv[1].get('ts', ''), reverse=True)
    for fname, n in items:
        text = (n.get('text') or '').strip()
        if not text:
            continue
        lines.append(f"## {n.get('label') or fname}  `{fname}`")
        lines.append(f"_{n.get('ts', '')}_")
        lines.append('')
        lines.append(text)
        lines.append('')
    with open(NOTES_MD, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))


MODEL_EXT = ('.glb', '.gltf', '.bin', '.fbx')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 2026-09-03 19:55 -07:00: MODEL files revalidate instead of never caching.
        # no-store made every stage visit re-download 15-21 MB of GLBs per scene
        # over the phone's Wi-Fi. no-cache still asks the server every time
        # (If-Modified-Since -> 304 when the file is unchanged, which
        # SimpleHTTPRequestHandler already answers), so a fresh build is never
        # missed, but an unchanged model costs one round trip, not 8 MB.
        # Pages, scripts and JSON keep no-store exactly as before.
        if self.command in ('GET', 'HEAD') and self.path.split('?')[0].lower().endswith(MODEL_EXT):
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        else:
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path.split('?')[0] != '/stage-notes':
            self.send_error(404)
            return
        try:
            n = int(self.headers.get('Content-Length', 0))
            notes = json.loads(self.rfile.read(n).decode('utf-8'))
            if not isinstance(notes, dict):
                raise ValueError('notes must be an object')
            with open(NOTES_JSON, 'w', encoding='utf-8', newline='\n') as f:
                json.dump(notes, f, ensure_ascii=False, indent=1)
            write_notes_md(notes)
            body = json.dumps({'ok': True, 'count': len(notes)}).encode('utf-8')
            self.send_response(200)
        except Exception as e:  # report, never crash the server
            body = json.dumps({'ok': False, 'error': str(e)}).encode('utf-8')
            self.send_response(400)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'serving {os.getcwd()} on 0.0.0.0:{PORT} (no-cache; POST /stage-notes writes {NOTES_JSON} + {NOTES_MD})')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCacheHandler).serve_forever()
