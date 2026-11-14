#!/usr/bin/env python3
"""Local preview server that behaves more like the production host than `python3 -m http.server`:
gzip for text assets and cache headers for /assets/. Use it when measuring with Lighthouse.

Usage: python3 _tools/serve.py [port]     (serves the site root, default port 8766)
"""
import gzip
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TEXT = (".html", ".css", ".js", ".svg", ".json", ".webmanifest", ".txt")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        if self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000")
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if path.endswith(TEXT) and os.path.isfile(path) and "gzip" in self.headers.get("Accept-Encoding", ""):
            with open(path, "rb") as f:
                body = gzip.compress(f.read(), 6)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
