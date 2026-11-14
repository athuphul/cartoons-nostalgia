#!/usr/bin/env python3
"""
Nostalgia TV - Local Web Server
Serves static assets and provides lightweight API for video playlist data.
"""

import http.server
import socketserver
import os
import json
import urllib.parse
import sys

DEFAULT_PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class NostalgiaServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable cache during development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'app': 'cartoons-nostalgia'}).encode())
            return
        elif parsed.path == '/api/videos':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {
                'intros': self._read_json_file('data/intros.json'),
                'ads': self._read_json_file('data/ads.json'),
                'episodes': self._read_json_file('data/episodes.json')
            }
            self.wfile.write(json.dumps(data, indent=2).encode())
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/videos':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                category = payload.get('category') # 'intro', 'ad', 'episode'
                video_item = payload.get('video')
                if category and video_item:
                    file_map = {
                        'intro': 'data/intros.json',
                        'ad': 'data/ads.json',
                        'episode': 'data/episodes.json'
                    }
                    target_file = file_map.get(category)
                    if target_file:
                        current_list = self._read_json_file(target_file)
                        current_list.insert(0, video_item)
                        with open(os.path.join(DIRECTORY, target_file), 'w', encoding='utf-8') as f:
                            json.dump(current_list, f, indent=2)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'success': True, 'count': len(current_list)}).encode())
                        return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
                return
        self.send_response(404)
        self.end_headers()

    def _read_json_file(self, rel_path):
        full_path = os.path.join(DIRECTORY, rel_path)
        if os.path.exists(full_path):
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return []
        return []

def run_server():
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    # Find open port if busy
    max_tries = 10
    httpd = None
    for p in range(port, port + max_tries):
        try:
            httpd = socketserver.TCPServer(('', p), NostalgiaServerHandler)
            port = p
            break
        except OSError:
            continue

    if not httpd:
        print(f"Could not bind to any port between {port} and {port + max_tries}")
        sys.exit(1)

    print("=" * 60)
    print("📺  NOSTALGIA TV - 90s CARTOON & COMMERCIAL SIMULATOR")
    print("=" * 60)
    print(f" Server running at: http://localhost:{port}")
    print(f" Root Directory:   {DIRECTORY}")
    print(f" Video Data:       {os.path.join(DIRECTORY, 'data')}")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Nostalgia TV server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
