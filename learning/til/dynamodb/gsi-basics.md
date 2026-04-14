---
created: 2026-04-14
last_reviewed: 2026-04-14
review_interval: 1
confidence: 1
tags: [dynamodb, gsi]
---

# GSIs let you query DynamoDB by different keys

## What
A Global Secondary Index (GSI) is like creating an alternate "view" of your table with a different partition key and sort key. Your base table might be keyed by `MOVIE#id`, but a GSI can be keyed by `GENRE#Action` so you can query "all action movies" without scanning the whole table.

## Why
DynamoDB only lets you query by partition key (and optionally sort key). Without GSIs, the only way to find "all movies in the Action genre" would be a full table scan - slow and expensive. A GSI pre-organizes the data by genre so that query is instant.

## Example
Our MovieCatalog table has 2 GSIs:
- **GSI1-EntityLookup**: query movies by genre, person filmography, movies by decade
- **GSI2-RatingSort**: query top-rated movies sorted by rating

Each GSI only projects the fields it needs (title, year, rating, poster) to save storage.

## Source
- [AWS DynamoDB GSI Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
