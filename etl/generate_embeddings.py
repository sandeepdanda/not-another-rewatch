"""Generate embeddings for movies using a free local model.

Uses sentence-transformers all-MiniLM-L6-v2 (runs on CPU, no API key needed).
Creates a vector for each movie from: title + overview + genres + director.

Usage:
  python generate_embeddings.py

Output: data/embeddings.json - {movie_id: [384 floats], ...}
"""

import json
import logging
import os
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Attr, Key
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

ENDPOINT_URL = os.getenv("DYNAMODB_ENDPOINT", "http://localhost:4566")
REGION = os.getenv("AWS_REGION", "us-west-2")
TABLE_NAME = "MovieCatalog"
OUTPUT = Path(__file__).parent.parent / "data" / "embeddings.json"
MODEL_NAME = "all-MiniLM-L6-v2"  # 80MB, 384 dimensions, runs on CPU


def get_table():
    dynamodb = boto3.resource("dynamodb", endpoint_url=ENDPOINT_URL, region_name=REGION)
    return dynamodb.Table(TABLE_NAME)


def build_text(movie_items: list[dict]) -> str:
    """Build embedding input text from a movie's DynamoDB items."""
    meta = next((i for i in movie_items if i["SK"] == "#METADATA"), None)
    if not meta or not meta.get("title"):
        return ""

    genres = [i.get("genreName", "") for i in movie_items if i["SK"].startswith("GENRE#")]
    director = next((i.get("personName", "") for i in movie_items
                      if i["SK"].startswith("CREW#") and i.get("job") == "Director"), "")

    parts = [
        meta.get("title", ""),
        meta.get("overview", "") or "",
        f"Genres: {', '.join(genres)}" if genres else "",
        f"Director: {director}" if director else "",
    ]
    return " ".join(p for p in parts if p).strip()


def generate():
    table = get_table()

    logger.info("Loading model: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)

    # Get all movie IDs
    metadata_items = []
    scan_kwargs = {"FilterExpression": Attr("SK").eq("#METADATA")}
    while True:
        resp = table.scan(**scan_kwargs)
        metadata_items.extend(resp["Items"])
        if "LastEvaluatedKey" not in resp:
            break
        scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    logger.info("Found %d movies", len(metadata_items))

    # Load existing embeddings to skip already-done movies
    existing = {}
    if OUTPUT.exists():
        existing = json.loads(OUTPUT.read_text())
        logger.info("Loaded %d existing embeddings", len(existing))

    # Build texts for movies that need embeddings
    texts = {}
    for meta in metadata_items:
        movie_id = meta["PK"].replace("MOVIE#", "")
        if movie_id in existing:
            continue

        items = table.query(KeyConditionExpression=Key("PK").eq(meta["PK"]))["Items"]
        text = build_text(items)
        if text:
            texts[movie_id] = text

    if not texts:
        logger.info("All movies already have embeddings")
        return

    logger.info("Generating embeddings for %d movies", len(texts))

    ids = list(texts.keys())
    input_texts = [texts[mid] for mid in ids]

    # sentence-transformers handles batching internally
    vectors = model.encode(input_texts, show_progress_bar=True, batch_size=64)

    for i, mid in enumerate(ids):
        existing[mid] = vectors[i].tolist()

    OUTPUT.write_text(json.dumps(existing))
    logger.info("Saved %d total embeddings to %s (dimensions: %d)", len(existing), OUTPUT, len(vectors[0]))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    generate()
