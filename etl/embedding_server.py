"""Tiny embedding server for the Spring Boot backend to call.

Usage:
  python embedding_server.py
  # Runs on port 8081

API:
  POST /embed  {"text": "movies about space"}  →  {"embedding": [0.1, 0.2, ...]}
"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)
MODEL_NAME = "all-MiniLM-L6-v2"

model = None


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/embed":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "empty body"}).encode())
            return

        raw = self.rfile.read(length)
        logger.info("Received %d bytes: %s", length, raw[:100])

        body = json.loads(raw)
        text = body.get("text", "")

        vector = model.encode(text).tolist()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"embedding": vector}).encode())

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            return
        self.send_error(404)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logger.info("Loading model: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info("Model loaded. Starting server on port 8081")
    HTTPServer(("", 8081), Handler).serve_forever()
