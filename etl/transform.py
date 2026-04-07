"""Transform raw movie data into normalized tables.

Handles deduplication, type casting, JSON column parsing (genres, cast, crew),
and normalization into separate entity tables.
"""

import ast
import logging

import pandas as pd

logger = logging.getLogger(__name__)


def safe_literal_eval(val):
    """Safely parse stringified Python literals (lists/dicts) from CSV."""
    try:
        return ast.literal_eval(val)
    except (ValueError, SyntaxError):
        return []


def transform_movies(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalize the movies table."""
    cols = ["id", "title", "overview", "release_date", "budget", "revenue",
            "runtime", "status", "popularity", "vote_average", "vote_count", "tagline"]
    df = df[cols].copy()
    df = df.drop_duplicates(subset=["id"])

    df["budget"] = pd.to_numeric(df["budget"], errors="coerce").fillna(0).astype(int)
    df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0).astype(int)
    df["runtime"] = pd.to_numeric(df["runtime"], errors="coerce")
    df["popularity"] = pd.to_numeric(df["popularity"], errors="coerce").fillna(0)
    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce")

    logger.info("Transformed %d movies", len(df))
    return df


def extract_genres(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Extract unique genres and movie-genre mappings from the genres JSON column."""
    records = []
    for _, row in df.iterrows():
        genres = safe_literal_eval(row.get("genres", "[]"))
        for g in genres:
            records.append({"movie_id": row["id"], "genre_id": g["id"], "genre_name": g["name"]})

    mapping_df = pd.DataFrame(records)
    genres_df = mapping_df[["genre_id", "genre_name"]].drop_duplicates().rename(
        columns={"genre_id": "id", "genre_name": "name"}
    )
    junction_df = mapping_df[["movie_id", "genre_id"]].drop_duplicates()

    logger.info("Extracted %d genres, %d mappings", len(genres_df), len(junction_df))
    return genres_df, junction_df


def extract_cast(credits_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Extract persons and movie_cast from credits."""
    persons = {}
    cast_records = []

    for _, row in credits_df.iterrows():
        cast_list = safe_literal_eval(row.get("cast", "[]"))
        for member in cast_list[:20]:  # top 20 cast per movie
            pid = member["id"]
            persons[pid] = {"id": pid, "name": member["name"]}
            cast_records.append({
                "movie_id": row["id"],
                "person_id": pid,
                "character_name": member.get("character", ""),
                "cast_order": member.get("order", 0),
            })

    persons_df = pd.DataFrame(persons.values()).drop_duplicates(subset=["id"])
    cast_df = pd.DataFrame(cast_records)

    logger.info("Extracted %d persons, %d cast records", len(persons_df), len(cast_df))
    return persons_df, cast_df


def extract_crew(credits_df: pd.DataFrame, persons_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Extract crew records (directors, writers, producers)."""
    persons = {row["id"]: row for _, row in persons_df.iterrows()}
    crew_records = []

    for _, row in credits_df.iterrows():
        crew_list = safe_literal_eval(row.get("crew", "[]"))
        for member in crew_list:
            if member.get("job") in ("Director", "Writer", "Producer", "Screenplay"):
                pid = member["id"]
                persons[pid] = {"id": pid, "name": member["name"]}
                crew_records.append({
                    "movie_id": row["id"],
                    "person_id": pid,
                    "department": member.get("department", ""),
                    "job": member.get("job", ""),
                })

    updated_persons = pd.DataFrame(persons.values()).drop_duplicates(subset=["id"])
    crew_df = pd.DataFrame(crew_records)

    logger.info("Extracted %d crew records", len(crew_df))
    return updated_persons, crew_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from extract import extract_all
    data = extract_all()
    movies = transform_movies(data["movies"])
    print(f"Movies: {len(movies)}")
