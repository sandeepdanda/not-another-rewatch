---
created: 2026-04-14
last_reviewed: 2026-04-14
review_interval: 1
confidence: 1
tags: [dynamodb, design-pattern]
---

# DynamoDB uses a single table instead of multiple tables

## What
In SQL you'd have separate tables for movies, genres, cast, crew and JOIN them. In DynamoDB, you put all of these in ONE table. You tell them apart using key prefixes: `MOVIE#123` for movies, `GENRE#Action` for genres, `PERSON#456` for people. The sort key adds a second dimension: `PK=MOVIE#123, SK=CAST#0#456` means "the lead actor in movie 123."

## Why
DynamoDB doesn't support JOINs. If you had separate tables, getting a movie with its cast would require multiple round trips. With single-table design, one query (`PK = MOVIE#123`) returns the movie AND all its cast, crew, and genres in a single request.

## Example
```
PK=MOVIE#123, SK=#METADATA     → title, overview, runtime
PK=MOVIE#123, SK=CAST#0#456    → lead actor info
PK=MOVIE#123, SK=CAST#1#789    → second actor
PK=MOVIE#123, SK=GENRE#Action  → genre mapping
```
Query `PK = MOVIE#123` returns all 4 items in one call.

## Source
- [AWS DynamoDB Developer Guide - Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- Project design doc: docs/design.md
