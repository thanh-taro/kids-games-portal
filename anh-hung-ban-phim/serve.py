#!/usr/bin/env python3
"""Tiny dev server that disables caching so module edits always reload.

Usage: python3 serve.py [port]   (default port 8177)
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8177
    print(f"Serving http://localhost:{port} (no-cache)")
    HTTPServer(("", port), NoCacheHandler).serve_forever()
