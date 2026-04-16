"""Enrich DynamoDB movies with TMDB poster URLs.

Fetches poster_path from TMDB API and updates the posterUrl field
on all items for each movie (metadata + genre + cast + crew items
all need posterUrl for GSI projections).

Usage:
  TMDB_API_KEY=your_key python enrich_posters.py

TMDB API docs: https://developer.themoviedb.org/reference/movie-details
"""

import logging
import os
import time

import boto3
import requests
from botocore.config import Config

logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
ENDPOINT_URL = os.getenv("DYNAMODB_ENDPOINT", "http://localhost:4566")
REGION = os.getenv("AWS_REGION", "us-west-2")
TABLE_NAME = "MovieCatalog"


def get_table():
    dynamodb = boto3.resource(
        "dynamodb", endpoint_url=ENDPOINT_URL, region_name=REGION,
        config=Config(retries={"max_attempts": 5, "mode": "adaptive"}),
    )
    return dynamodb.Table(TABLE_NAME)


def fetch_poster(movie_id: str) -> str | None:
    """Fetch poster_path from TMDB for a given movie ID."""
    try:
        resp = requests.get(
            f"{TMDB_BASE}/movie/{movie_id}",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("poster_path")
        if resp.status_code == 404:
            return None
        if resp.status_code == 429:
            time.sleep(2)  # rate limited, back off
            return fetch_poster(movie_id)
    except requests.RequestException as e:
        logger.warning("TMDB request failed for %s: %s", movie_id, e)
    return None


def enrich_all():
    if not TMDB_API_KEY:
        print("Set TMDB_API_KEY environment variable. Get one at https://www.themoviedb.org/settings/api")
        return

    table = get_table()

    # Scan for all #METADATA items to get movie IDs
    items = []
    scan_kwargs = {"FilterExpression": boto3.dynamodb.conditions.Attr("SK").eq("#METADATA")}
    while True:
        resp = table.scan(**scan_kwargs)
        items.extend(resp["Items"])
        if "LastEvaluatedKey" not in resp:
            break
        scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    logger.info("Found %d movies to enrich", len(items))
    enriched = 0
    skipped = 0

    for item in items:
        movie_id = item["PK"].replace("MOVIE#", "")

        # Skip if already has poster
        if item.get("posterUrl"):
            skipped += 1
            continue

        poster_path = fetch_poster(movie_id)
        if not poster_path:
            continue

        # Update all items for this movie (metadata, genres, cast, crew all need posterUrl for GSI)
        movie_items = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq(f"MOVIE#{movie_id}")
        )["Items"]

        with table.batch_writer() as writer:
            for mi in movie_items:
                mi["posterUrl"] = poster_path
                writer.put_item(Item=mi)

        enriched += 1
        if enriched % 50 == 0:
            logger.info("Enriched %d / %d movies", enriched, len(items))
            time.sleep(0.5)  # stay under TMDB rate limit

    logger.info("Done: %d enriched, %d already had posters, %d total", enriched, skipped, len(items))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    enrich_all()
