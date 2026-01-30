"""
Simple HTTP server for serving Next.js static build in Electron
This runs when Node.js is not available
"""

import http.server
import socketserver
import os
import sys
import json
from pathlib import Path
from urllib.parse import urlparse, unquote

PORT = 3000
HOSTNAME = "127.0.0.1"


class NextJSStaticHandler(http.server.SimpleHTTPRequestHandler):
    """Handler that serves Next.js .next/static files and routes to index.html"""

    # Directory to serve from
    base_path = None

    def do_GET(self):
        """Handle GET requests with Next.js SPA routing"""
        # Parse the path
        path = unquote(urlparse(self.path).path)

        # Remove leading slash
        if path.startswith("/"):
            path = path[1:]
        
        # Default to index
        if path == "":
            path = "index.html"

        # Build full file path
        full_path = os.path.join(self.base_path, path)

        # If it's a file and exists, serve it
        if os.path.isfile(full_path):
            self.serve_file(full_path)
            return

        # Check in .next/static for static assets
        if path.startswith(".next/static/") or path.startswith("_next/static/"):
            static_path = os.path.join(self.base_path, ".next", "static", path.replace(".next/static/", "").replace("_next/static/", ""))
            if os.path.isfile(static_path):
                self.serve_file(static_path)
                return

        # Check in public folder
        public_path = os.path.join(self.base_path, "public", path)
        if os.path.isfile(public_path):
            self.serve_file(public_path)
            return

        # For any other route, try to find an HTML file
        # This handles Next.js static export pages
        possible_paths = [
            os.path.join(self.base_path, path, "index.html"),
            os.path.join(self.base_path, path + ".html"),
            os.path.join(self.base_path, "index.html"),
        ]

        for try_path in possible_paths:
            if os.path.isfile(try_path):
                self.serve_file(try_path)
                return

        # 404 if nothing found
        self.send_error(404)

    def serve_file(self, file_path):
        """Serve a specific file"""
        try:
            with open(file_path, "rb") as f:
                content = f.read()

            # Set appropriate content type
            content_type = self.guess_type(file_path)
            self.send_response(200)
            self.send_header("Content-Type", content_type[0] or "application/octet-stream")
            self.send_header("Content-Length", len(content))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            print(f"Error serving file {file_path}: {e}")
            self.send_error(500)

    def log_message(self, format, *args):
        """Log messages to stdout"""
        print(f"[Frontend] {format % args}", flush=True)


def start_server(static_dir):
    """Start the HTTP server"""
    global PORT, HOSTNAME

    # Validate directory
    if not os.path.isdir(static_dir):
        print(f"Error: Directory not found: {static_dir}")
        sys.exit(1)

    NextJSStaticHandler.base_path = static_dir

    try:
        with socketserver.TCPServer((HOSTNAME, PORT), NextJSStaticHandler) as httpd:
            print(f"[Frontend] Serving from: {static_dir}")
            print(f"[Frontend] Server running on http://{HOSTNAME}:{PORT}")
            sys.stdout.flush()
            httpd.serve_forever()
    except OSError as e:
        print(f"Error: Could not start server on {HOSTNAME}:{PORT}")
        print(f"Error details: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python frontend_server.py <static_dir>")
        sys.exit(1)

    static_dir = sys.argv[1]
    if len(sys.argv) > 2:
        PORT = int(sys.argv[2])
    if len(sys.argv) > 3:
        HOSTNAME = sys.argv[3]

    start_server(static_dir)
