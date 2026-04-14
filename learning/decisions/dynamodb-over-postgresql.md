---
created: 2026-04-14
tags: [architecture, database]
status: active
---

# Decision: DynamoDB over PostgreSQL

## Context
The project started with PostgreSQL (normalized schema, SQL queries). Needed to choose a database for the full-stack app.

## Options Considered
1. **PostgreSQL** - Already had a working schema. Full SQL support, JOINs, full-text search. Free on Supabase/Railway. But: doesn't teach anything new, no AWS integration learning.
2. **DynamoDB** - Single-table design, no JOINs, no full-text search. Requires rethinking data modeling. But: used heavily at AWS work, free tier is generous, forces learning access pattern thinking.

## Decision
DynamoDB. The whole point of this project is learning. DynamoDB single-table design is a skill that directly transfers to work at AWS. The constraints (no JOINs, no text search) push us toward creative solutions (embeddings for search, denormalized data for fast reads).

## Consequences
- Need to learn single-table design, GSIs, access pattern thinking
- No full-text search - using AI embeddings instead (turned a limitation into a feature)
- ETL pipeline needs to be rewritten from SQL inserts to DynamoDB batch writes
- Data modeling is harder upfront but queries are simpler and faster
