# Movie Database Management System 🎬

A data engineering project featuring a normalized relational database with 600,000+ movie records, SQL analytics, Python ETL pipeline, and Power BI dashboards.

## Features

- **Normalized Database** — 3NF schema with ER modeling for movies, actors, directors, genres, and ratings
- **SQL Analytics** — Complex queries for revenue analysis, genre trends, rating distributions
- **Python ETL** — Automated data ingestion and preprocessing pipeline
- **Power BI Dashboard** — Interactive visualizations for box office performance and audience insights

## Tech Stack

| Component     | Technology                                 |
| ------------- | ------------------------------------------ |
| Database      | PostgreSQL                                 |
| ETL           | Python, Pandas, SQLAlchemy                 |
| Analytics     | SQL (window functions, CTEs, aggregations) |
| Visualization | Power BI                                   |

## Getting Started

```bash
pip install -r requirements.txt
psql -U postgres -f sql/schema.sql
python etl/extract.py
python etl/transform.py
python etl/load.py
```

## Results

- 20% improvement in query performance through proper normalization and indexing
- Interactive dashboard integrating data from multiple sources

## License

MIT
