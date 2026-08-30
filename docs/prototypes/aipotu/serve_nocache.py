# AIPOTU prototype server (port 8201) — filed 2026-08-30 (see git log for time)
# Same as `python -m http.server` but sends no-store headers on every response,
# so a plain browser refresh ALWAYS fetches the latest build. Stale-cache-proof.
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8201


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'serving {os.getcwd()} on 0.0.0.0:{PORT} (no-cache)')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCacheHandler).serve_forever()
