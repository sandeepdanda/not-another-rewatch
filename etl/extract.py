"""Extract movie data from CSV source files.

Reads raw CSV files (movies_metadata.csv, credits.csv, ratings.csv, keywords.csv)
and returns cleaned DataFrames ready for transformation.

Data source: https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset
"""

import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

EXPECTED_FILES = [
    "movies_metadata.csv",
    "credits.csv",
    "ratings.csv",
    "keywords.csv",
    "links.csv",
]


def extract_movies(path: Path = DATA_DIR / "movies_metadata.csv") -> pd.DataFrame:
    """Load movies metadata, dropping corrupt rows."""
    logger.info("Extracting movies from %s", path)
    df = pd.read_csv(path, low_memory=False)

    # Drop rows where 'id' is not numeric (corrupt rows in this dataset)
    df = df[df["id"].apply(lambda x: str(x).isdigit())]
    df["id"] = df["id"].astype(int)

    logger.info("Extracted %d movies", len(df))
    return df


def extract_credits(path: Path = DATA_DIR / "credits.csv") -> pd.DataFrame:
    """Load cast and crew credits."""
    logger.info("Extracting credits from %s", path)
    df = pd.read_csv(path)
    df["id"] = df["id"].astype(int)
    logger.info("Extracted credits for %d movies", len(df))
    return df


def extract_ratings(path: Path = DATA_DIR / "ratings.csv") -> pd.DataFrame:
    """Load user ratings."""
    logger.info("Extracting ratings from %s", path)
    df = pd.read_csv(path)
    logger.info("Extracted %d ratings", len(df))
    return df


def extract_all() -> dict[str, pd.DataFrame]:
    """Extract all source files and return as a dict of DataFrames."""
    return {
        "movies": extract_movies(),
        "credits": extract_credits(),
        "ratings": extract_ratings(),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = extract_all()
    for name, df in data.items():
        print(f"{name}: {len(df)} rows, {list(df.columns)[:5]}...")
