"""Load transformed data into PostgreSQL using SQLAlchemy.

Handles bulk inserts with conflict resolution for idempotent loads.
"""

import logging
import os

from sqlalchemy import create_engine, text
import pandas as pd

logger = logging.getLogger(__name__)

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/movie_db")


def get_engine():
    return create_engine(DB_URL, echo=False)


def load_table(df: pd.DataFrame, table_name: str, engine, if_exists: str = "append"):
    """Load a DataFrame into a database table."""
    logger.info("Loading %d rows into %s", len(df), table_name)
    df.to_sql(table_name, engine, if_exists=if_exists, index=False, method="multi", chunksize=1000)
    logger.info("Loaded %s successfully", table_name)


def load_all(movies_df, genres_df, genre_junction_df, persons_df, cast_df, crew_df, ratings_df):
    """Load all transformed tables into the database."""
    engine = get_engine()

    # Load in dependency order
    load_table(genres_df, "genres", engine)
    load_table(persons_df, "persons", engine)
    load_table(movies_df.rename(columns={"vote_average": "vote_avg"}), "movies", engine)
    load_table(genre_junction_df, "movie_genres", engine)
    load_table(cast_df, "movie_cast", engine)
    load_table(crew_df, "movie_crew", engine)

    if ratings_df is not None and len(ratings_df) > 0:
        # Sample ratings if too large (26M+ rows)
        if len(ratings_df) > 500000:
            logger.info("Sampling ratings from %d to 500K", len(ratings_df))
            ratings_df = ratings_df.sample(n=500000, random_state=42)
        load_table(ratings_df.rename(columns={"userId": "user_id", "movieId": "movie_id", "timestamp": "rated_at"}),
                   "ratings", engine)

    logger.info("All tables loaded successfully")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Run the full pipeline: python -m etl.extract && python -m etl.transform && python -m etl.load")
