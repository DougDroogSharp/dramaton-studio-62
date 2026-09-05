# George World prototype server (default port 8201) — filed 2026-08-30; notes endpoint added 2026-09-01 19:05 PDT;
# notes MERGE + lock + cap 2026-09-04 18:5x PDT (code dive: stage notes were last-writer-wins across devices).
# Same as `python -m http.server` but sends no-store headers on every response,
# so a plain browser refresh ALWAYS fetches the latest build. Stale-cache-proof.
#
# POST /stage-notes  — the HvB Asset Stage sends Doug's per-item critique notes
# (a JSON object {file: {label, text, ts}}). The server MERGES them into
# stage_notes.json item by item (the newer `ts` wins; items the sender never
# saw are kept, so the phone's notes and the laptop's notes converge instead
# of erasing each other), rewrites STAGE_NOTES.md (readable), and answers with
# the merged object so the page can adopt it. One lock around the
# read-merge-write; bodies over 1 MB refused; the JSON is written whole then
# swapped in. GET /stage_notes.json is served by the static handler as before.
import http.server
import json
import os
import sys
import threading
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8201
NOTES_JSON = 'stage_notes.json'
NOTES_MD = 'STAGE_NOTES.md'
NOTES_LOCK = threading.Lock()
MAX_NOTES_BYTES = 1 << 20


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


def read_notes():
    try:
        with open(NOTES_JSON, 'r', encoding='utf-8') as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def clean_entry(v):
    """One note as the stage writes it: label, text, ts — strings, bounded."""
    if not isinstance(v, dict):
        return None
    return {'label': str(v.get('label') or '')[:200],
            'text': str(v.get('text') or '')[:20000],
            'ts': str(v.get('ts') or '')[:40]}


def merge_notes(have, incoming):
    """Per item, the newer stamp wins (a tie goes to the sender, who is
    typing now); items the sender never saw stay as they are."""
    out = dict(have)
    for k, v in incoming.items():
        e = clean_entry(v)
        if e is None or not isinstance(k, str) or not k or len(k) > 300:
            continue
        cur = out.get(k)
        if not isinstance(cur, dict) or e['ts'] >= str(cur.get('ts') or ''):
            out[k] = e
    return out


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
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0:
                raise ValueError('no body')
            if n > MAX_NOTES_BYTES:
                raise ValueError('notes body too large')
            incoming = json.loads(self.rfile.read(n).decode('utf-8'))
            if not isinstance(incoming, dict):
                raise ValueError('notes must be an object')
            with NOTES_LOCK:
                notes = merge_notes(read_notes(), incoming)
                tmp = NOTES_JSON + '.tmp'
                with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
                    json.dump(notes, f, ensure_ascii=False, indent=1)
                os.replace(tmp, NOTES_JSON)
                write_notes_md(notes)
            body = json.dumps({'ok': True, 'count': len(notes), 'notes': notes},
                              ensure_ascii=False).encode('utf-8')
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
    print(f'serving {os.getcwd()} on 0.0.0.0:{PORT} (no-cache; POST /stage-notes merges into {NOTES_JSON} + {NOTES_MD})')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCacheHandler).serve_forever()
