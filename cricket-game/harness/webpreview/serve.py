#!/usr/bin/env python3
"""Preview server: THREADED (a stalled connection can't block the page) and
no-cache (browsers always load the latest preview.js instead of a cached
stale copy — stale cache was the cause of the "hanging preview")."""
import http.server
import os


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the log quiet
        pass


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    http.server.ThreadingHTTPServer(("0.0.0.0", 4000), NoCacheHandler).serve_forever()
