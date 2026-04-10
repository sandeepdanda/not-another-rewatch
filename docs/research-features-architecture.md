# Movie Application: Features & Architecture Research

> Research date: 2026-04-09

## Executive Summary

This document covers four areas: (1) feature analysis of leading movie platforms, (2) API design patterns for media databases, (3) recommendation system approaches feasible for a personal project with ~600K movies and no live users, and (4) TMDB API capabilities for real-time data enrichment.

The key takeaway: Letterboxd's diary/list/social model is the gold standard for personal movie tracking. For a solo project, a REST API with cursor pagination and content-based recommendations (TF-IDF or embeddings over metadata) is the most practical starting point. TMDB's free API is generous enough to enrich your entire 600K catalog over time.

---

## 1. Platform Feature Analysis

### TMDB (The Movie Database)

What they do well:
- Community-driven data - anyone can contribute edits, translations, images
- Rich metadata: genres, keywords, cast/crew, production companies, release dates by country, certifications, watch providers
- Multi-language support (translations for titles, overviews, taglines)
- Daily ID exports for bulk data bootstrapping
- `append_to_response` lets you fetch movie details + credits + images + videos in a single API call
- Discover endpoint with 30+ filters (genre, year, rating, cast, keywords, watch providers, runtime, etc.)
- Popularity and trending algorithms built in

What's missing:
- No user reviews ecosystem (ratings exist but community is thin)
- No social features
- No personal tracking/diary features - it's a data platform, not a consumer app

### Letterboxd

What they do well (17M+ members as of 2024):
- **Diary** - log films with date watched, rewatch flag, review, rating (0.5-5.0 stars in half-star increments = 10-point scale)
- **Lists** - curated, ranked or unranked, collaborative. Users made 6.8M lists in 2024. Lists are a core discovery mechanism
- **Reviews** - range from analytical essays to one-liners. 96.4M reviews written in 2024
- **Statistics** (Pro feature) - viewing habits by year, genre, country, decade, director, rating distribution
- **Social** - follow users, like reviews, comment threads, activity feed
- **Watchlist** - simple "want to watch" queue
- **Favorites** - pin 4 favorite films to your profile (the "Four Favorites" concept went viral)
- **Tags** - user-defined text tags on diary entries
- **Year in Review** - annual stats summary (similar to Spotify Wrapped)
- **Film pages** - aggregate ratings, popular reviews, where to watch, cast/crew, related films
- **Taste-based discovery** - "films your friends liked" and similar social signals

Why it works:
- Film as social object - the app treats movies as conversation starters, not just data
- Beautiful, editorial design - poster-heavy, minimal UI
- No algorithmic feed manipulation - chronological, honest
- Community tone is genuine (not engagement-bait)

### IMDb

What they do well:
- **Comprehensive data** - the most complete movie database (cast, crew, trivia, goofs, quotes, soundtracks, filming locations, box office, parents guide)
- **Advanced search** - filter by title type, genre, year, rating, votes, runtime, country, language, awards, filming location
- **User ratings** - weighted average system, demographic breakdowns (by age, gender)
- **Top 250 / Bottom 100** - canonical ranked lists
- **TSV data exports** - free non-commercial datasets (title.basics, title.ratings, title.crew, title.principals, name.basics, title.akas, title.episode)
- **Watchlist and ratings** - basic personal tracking
- **STARmeter** - popularity ranking for people
- **Box office tracking** - weekend/cumulative grosses

What's missing:
- Social features are weak (no diary, no activity feed, no meaningful community)
- UI is cluttered and ad-heavy
- Lists exist but aren't a core feature
- No real discovery beyond "more like this"

### Trakt.tv

What they do well:
- **Automatic scrobbling** - syncs with Plex, Kodi, Emby, Jellyfin, media centers to auto-track what you watch
- **Data portability** - open API, import/export from IMDb, Letterboxd, TV Time, Plex
- **TV episode tracking** - granular per-episode progress (their strongest differentiator)
- **Calendar** - upcoming episodes for shows you're tracking
- **History** - detailed chronological watch history with timestamps
- **Statistics** - time spent watching, genre breakdowns, network/studio stats
- **VIP features** - custom lists, advanced filtering, yearly stats
- **Streaming service integration** - automatic tracking from Netflix, Disney+, etc.
- **Recommendations** - based on watch history

What's missing:
- Community/social is thin compared to Letterboxd
- Reviews aren't a focus
- UI is functional but not beautiful
- Discovery is basic

### Feature Matrix - What to Steal

| Feature | TMDB | Letterboxd | IMDb | Trakt | Priority for Personal App |
|---------|------|------------|------|-------|--------------------------|
| Rich metadata | ★★★ | ★★ | ★★★ | ★★ | Must have (via TMDB API) |
| Diary/watch log | - | ★★★ | ★ | ★★★ | Must have |
| Ratings (half-star) | ★ | ★★★ | ★★ | ★★ | Must have |
| Reviews/notes | - | ★★★ | ★★ | ★ | Nice to have |
| Lists (curated) | - | ★★★ | ★★ | ★★ | Must have |
| Watchlist | - | ★★★ | ★★ | ★★ | Must have |
| Statistics/insights | - | ★★★ | ★ | ★★★ | High value |
| Discovery/filters | ★★★ | ★★ | ★★★ | ★★ | Must have |
| Recommendations | ★ | ★★ | ★ | ★★ | High value |
| Social features | - | ★★★ | ★ | ★ | Skip (single user) |
| Scrobbling/auto-track | - | - | - | ★★★ | Future (nice to have) |
| Data import/export | - | ★★ | ★★ | ★★★ | Must have |
| Where to watch | ★★★ | ★★ | ★★ | ★★ | Nice to have |

---

## 2. API Design Patterns for Movie/Media Databases

### REST vs GraphQL

For a personal movie database project, REST is the clear winner:

| Aspect | REST | GraphQL |
|--------|------|---------|
| Complexity | Low - standard HTTP verbs, easy to debug | Higher - schema definition, resolvers, query complexity |
| Tooling | Mature, universal | Good but more setup (Apollo, Relay, etc.) |
| Caching | HTTP caching works out of the box (ETags, Cache-Control) | Harder - POST requests, need normalized cache |
| Over-fetching | Can be an issue, mitigated with `fields` param | Solved - client picks exactly what it needs |
| N+1 problem | Solved with `include`/`embed` params | Solved with DataLoader, but you have to build it |
| Learning curve | Low | Medium |
| Best for | CRUD-heavy, resource-oriented, cacheable | Complex nested data, multiple client types |

**Recommendation**: REST with a few GraphQL-inspired patterns:
- Sparse fieldsets: `GET /movies/123?fields=title,year,rating,poster_path`
- Includes: `GET /movies/123?include=credits,genres,keywords`
- This gives you 80% of GraphQL's flexibility with 20% of the complexity

### Pagination Strategy

For 600K movies, pagination matters. Three options:

**Offset-based** (`?page=5&per_page=20`)
- Pros: Simple, supports "jump to page N", easy to implement
- Cons: Performance degrades at high offsets (DB scans all skipped rows), inconsistent under writes
- Verdict: Fine for < 100K records or shallow browsing (first ~50 pages)

**Cursor-based** (`?cursor=eyJpZCI6MTIzfQ&limit=20`)
- Pros: Consistent O(1) performance regardless of position, stable under writes
- Cons: No "jump to page N", slightly more complex to implement
- Verdict: Best for infinite scroll, large datasets, real-time feeds

**Keyset** (`?after_id=12345&limit=20`)
- Pros: Same performance as cursor but transparent (no opaque token)
- Cons: Requires deterministic sort order, harder with complex sorts
- Verdict: Good middle ground

**Recommendation**: Hybrid approach
- Cursor-based for browse/discover endpoints (infinite scroll through 600K movies)
- Offset-based for search results (users expect page numbers in search)
- Include `total_count` in response headers for UI pagination controls

### Filtering & Search

Two separate concerns:

**Filtering** (structured, exact match or range):
```
GET /movies?genre=28&year_gte=2020&year_lte=2025&rating_gte=7.0&sort=popularity.desc
```
- Use query parameters for filters
- Support operators: `_gte`, `_lte`, `_in`, `_not`
- Combine with AND logic (comma-separated for OR within a field)
- Mirror TMDB's discover endpoint pattern - it's well-designed

**Search** (full-text, fuzzy):
```
GET /search/movies?q=inception&year=2010
```
- Separate `/search` namespace from `/movies` browse
- Use a search engine (PostgreSQL full-text search, Meilisearch, or Typesense)
- Support autocomplete/typeahead with a dedicated endpoint
- Return relevance-scored results

### Suggested API Structure

```
# Core resources
GET    /movies                    # Browse/discover with filters
GET    /movies/:id                # Movie details (with ?include=)
GET    /movies/:id/credits        # Cast and crew
GET    /movies/:id/similar        # Similar movies (recommendations)
GET    /movies/:id/images         # Posters, backdrops

# Search
GET    /search/movies             # Full-text search
GET    /search/autocomplete       # Typeahead suggestions

# Personal tracking
GET    /diary                     # Watch log (paginated, filterable)
POST   /diary                     # Log a watch
PUT    /diary/:id                 # Update entry
DELETE /diary/:id                 # Remove entry

GET    /ratings                   # All user ratings
PUT    /movies/:id/rating         # Rate a movie

GET    /watchlist                 # Want to watch
POST   /watchlist                 # Add to watchlist
DELETE /watchlist/:movie_id       # Remove from watchlist

GET    /lists                     # All user lists
POST   /lists                     # Create list
GET    /lists/:id                 # List details with movies
PUT    /lists/:id                 # Update list
DELETE /lists/:id                 # Delete list
POST   /lists/:id/movies          # Add movie to list
DELETE /lists/:id/movies/:movie_id # Remove movie from list

# Statistics
GET    /stats                     # Overall viewing stats
GET    /stats/by-year             # Stats grouped by year
GET    /stats/by-genre            # Stats grouped by genre
GET    /stats/by-decade           # Stats grouped by decade

# Data management
POST   /import                    # Import from Letterboxd/IMDb CSV
GET    /export                    # Export data

# TMDB enrichment
POST   /admin/enrich              # Trigger enrichment for a batch
GET    /admin/enrich/status       # Enrichment job status
```

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTIzfQ",
    "has_next": true,
    "total_count": 612345
  },
  "meta": {
    "request_id": "abc-123",
    "took_ms": 42
  }
}
```

---

## 3. Recommendation System Approaches

### The Challenge

600K movies, single user (you), no collaborative signal from other users. This rules out traditional collaborative filtering but opens up several content-based approaches.

### Approach Comparison

| Approach | Feasibility | Quality | Complexity | Cold Start? |
|----------|-------------|---------|------------|-------------|
| Content-based (TF-IDF) | ★★★ | ★★ | Low | No - works on metadata alone |
| Content-based (embeddings) | ★★★ | ★★★ | Medium | No - works on metadata alone |
| Collaborative filtering | ★ | ★★★ | High | Yes - needs many users |
| Knowledge graph | ★★ | ★★★ | High | No |
| Hybrid (content + your ratings) | ★★★ | ★★★ | Medium | Partially - improves with ratings |

### Recommended: Tiered Approach

#### Tier 1 - Content-Based with TF-IDF (Start Here)

How it works:
1. Combine movie metadata into a "soup" string: genres + keywords + director + top cast + overview
2. Vectorize with TF-IDF (scikit-learn's `TfidfVectorizer`)
3. Compute cosine similarity between movies
4. "Movies similar to X" = top N by cosine similarity

Pros:
- Dead simple to implement
- Works with zero user data
- Fast for 600K movies if you precompute the similarity matrix (or use sparse matrices)

Cons:
- Similarity is shallow (genre/keyword overlap, not semantic understanding)
- Can't learn your personal taste

Memory consideration for 600K movies:
- Full 600K x 600K similarity matrix won't fit in memory (~2.8TB dense)
- Solutions: only compute top-K neighbors per movie (sparse), or compute on-demand
- Precompute top 50 similar movies per film, store in DB (~30M rows)

```python
# Pseudocode
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Build metadata soup per movie
movies['soup'] = movies['genres'] + ' ' + movies['keywords'] + ' ' + movies['director'] + ' ' + movies['cast_top3']

tfidf = TfidfVectorizer(stop_words='english', max_features=20000)
tfidf_matrix = tfidf.fit_transform(movies['soup'])

# For a given movie, find similar ones
def get_similar(movie_idx, top_n=20):
    sim_scores = cosine_similarity(tfidf_matrix[movie_idx], tfidf_matrix).flatten()
    top_indices = sim_scores.argsort()[-top_n-1:-1][::-1]
    return movies.iloc[top_indices]
```

#### Tier 2 - Embedding-Based Similarity (Better Quality)

How it works:
1. Generate embeddings for each movie using a sentence transformer model
2. Encode: `f"{title} ({year}). {overview}. Genres: {genres}. Directed by {director}."`
3. Store embeddings in a vector index (FAISS, Annoy, or pgvector)
4. Nearest-neighbor search for "similar to X"

Pros:
- Semantic understanding (catches thematic similarity, not just keyword overlap)
- Fast retrieval with approximate nearest neighbor (ANN) indexes
- Can combine with your ratings for personalized recommendations

Cons:
- Requires generating embeddings (one-time cost, ~hours for 600K movies)
- Needs a vector store

Practical setup:
- Model: `all-MiniLM-L6-v2` (384 dimensions, fast, good quality)
- Storage: FAISS flat index for 600K x 384 dims = ~900MB in memory, or use pgvector in PostgreSQL
- Batch embed: ~600K movies at ~1000/sec on CPU = ~10 minutes

```python
# Pseudocode
from sentence_transformers import SentenceTransformer
import faiss

model = SentenceTransformer('all-MiniLM-L6-v2')

descriptions = [f"{m.title} ({m.year}). {m.overview}. Genres: {m.genres}" for m in movies]
embeddings = model.encode(descriptions, batch_size=256, show_progress_bar=True)

# Build FAISS index
index = faiss.IndexFlatIP(384)  # inner product (cosine sim on normalized vectors)
faiss.normalize_L2(embeddings)
index.add(embeddings)

# Query
def get_similar(movie_idx, top_n=20):
    query = embeddings[movie_idx].reshape(1, -1)
    distances, indices = index.search(query, top_n + 1)
    return indices[0][1:]  # skip self
```

#### Tier 3 - Personalized Recommendations (After You Have Ratings)

Once you've rated 50-100+ movies, you can build a personal taste profile:

1. **Weighted genre/keyword profile**: Average the TF-IDF or embedding vectors of your highly-rated movies, weighted by rating. Find movies closest to this "taste centroid."

2. **Simple matrix factorization**: Even with one user, you can use implicit feedback (watched = positive, not watched = unknown) with a library like LightFM or Implicit.

3. **LLM-powered recommendations**: Feed your top-rated movies + a candidate list to an LLM and ask for recommendations with reasoning. Expensive per-query but surprisingly good for personal use.

4. **Leverage MovieLens data**: The MovieLens 25M dataset has 25M ratings from 162K users on 62K movies. You can train a collaborative model on this data, then use your own ratings to find your "nearest neighbor" users in that space.

### Recommendation: Implementation Order

1. Start with precomputed TF-IDF similarity (Tier 1) - ship in a weekend
2. Add embedding-based similarity (Tier 2) when you want better quality
3. Add personalized taste profile (Tier 3) after you've logged 100+ ratings
4. Consider MovieLens hybrid approach as a stretch goal

---

## 4. TMDB API - Real-Time Data Enrichment

### Pricing & Access

- **Free** for all non-commercial use. Register at themoviedb.org/settings/api
- No paid tiers for API access - it's free or nothing
- Attribution required: must display "This product uses the TMDB API but is not endorsed or certified by TMDB" and show the TMDB logo

### Rate Limits

- Legacy 40 req/10 sec limit was removed in December 2019
- Current soft limit: ~40 requests per second
- No daily limit
- Respect HTTP 429 responses (back off and retry)
- For bulk operations: throttle to ~30 req/sec to be safe

### Data Available Per Movie

A single call to `/movie/{id}?append_to_response=credits,keywords,images,videos,watch/providers,release_dates,similar,recommendations` returns:

| Data | What You Get |
|------|-------------|
| **Core details** | title, original_title, overview, tagline, status, release_date, runtime, budget, revenue, homepage |
| **Classification** | genres (id + name), adult flag, original_language, spoken_languages, production_countries |
| **Metrics** | vote_average, vote_count, popularity score |
| **Credits** | Full cast (name, character, order, profile_path) + full crew (name, job, department) |
| **Keywords** | Thematic tags (e.g., "time travel", "dystopia", "based on novel") |
| **Images** | Posters, backdrops, logos - multiple sizes, multiple languages |
| **Videos** | Trailers, teasers, featurettes (YouTube/Vimeo links) |
| **Watch providers** | Where to stream/rent/buy by country (powered by JustWatch data) |
| **Release dates** | Per-country release dates with certification (PG-13, R, etc.) |
| **Similar** | 20 similar movies (TMDB's own algorithm) |
| **Recommendations** | 20 recommended movies |
| **Collections** | If part of a franchise (e.g., "The Dark Knight Collection") |

### Bulk Data Strategy

For 600K movies, you can't call the API for each one upfront. Strategy:

**Phase 1 - Bootstrap with daily exports**
- Download `movie_ids_MM_DD_YYYY.json.gz` from `files.tmdb.org/p/exports/`
- Each line: `{"id": 123, "original_title": "...", "popularity": 45.2, "adult": false, "video": false}`
- Filter by popularity > 1.0 to get ~100K-150K "real" movies (many of the 600K are obscure/unreleased)
- Available daily, no auth required, kept for 3 months

**Phase 2 - Prioritized enrichment**
- Enrich popular movies first (sort by popularity descending)
- At 30 req/sec with `append_to_response`: ~100K movies in ~55 minutes
- Store raw JSON responses, parse into your schema
- Run as a background job, resumable

**Phase 3 - On-demand enrichment**
- When a user views a movie not yet enriched, fetch from TMDB in real-time
- Cache the response, mark as enriched
- Lazy enrichment means you only pay API calls for movies someone actually looks at

**Phase 4 - Incremental updates**
- Use TMDB's `/movie/changes` endpoint to find recently updated movies
- Run daily to keep your data fresh
- Only re-fetch movies that changed

### Enrichment Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Daily Export │────>│ Import Job   │────>│ Movies DB   │
│ (bootstrap) │     │ (filter/load)│     │ (basic data)│
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐             │
                    │ Enrichment   │<────────────┘
                    │ Queue        │  (priority: popularity)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────┐
                    │ TMDB Fetcher │────>│ Movies DB   │
                    │ (30 req/sec) │     │ (full data) │
                    └──────────────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │ Change Sync  │  (daily, incremental)
                    └──────────────┘
```

### TMDB API Gotchas

- `append_to_response` counts as 1 request regardless of how many sub-requests you append - use it aggressively
- Image URLs need a base URL from `/configuration` endpoint: `https://image.tmdb.org/t/p/{size}/{path}`
- Available poster sizes: w92, w154, w185, w342, w500, w780, original
- Watch provider data is powered by JustWatch and varies by country
- Some movies have minimal data (no overview, no poster) - handle gracefully
- TMDB IDs are not stable across merges (rare but happens) - store your own primary key
- The `popularity` field is recalculated daily and is useful for prioritizing enrichment

### Useful Endpoints Beyond Movie Details

| Endpoint | Use Case |
|----------|----------|
| `/discover/movie` | Browse with 30+ filters (genre, year, rating, cast, keywords, etc.) |
| `/search/movie` | Full-text search by title |
| `/trending/movie/{time_window}` | What's trending (day/week) |
| `/movie/{id}/similar` | Content-similar movies |
| `/movie/{id}/recommendations` | TMDB's recommendation algorithm |
| `/genre/movie/list` | All genre IDs and names |
| `/configuration` | Image base URLs, sizes |
| `/movie/changes` | Recently changed movie IDs (for sync) |
| `/find/{external_id}` | Find by IMDb ID, Facebook ID, etc. |

---

## 5. Architecture Recommendations Summary

### For a Personal Project - Keep It Simple

```
Frontend:  React/Next.js (or whatever you prefer)
API:       REST with cursor pagination, sparse fieldsets
Database:  PostgreSQL (movies, diary, lists, ratings)
           + pgvector extension (for embedding-based recommendations)
Search:    PostgreSQL full-text search (start here)
           → Meilisearch or Typesense (upgrade if needed)
Cache:     Redis (TMDB responses, computed recommendations)
Queue:     Simple job queue (BullMQ, or just cron + DB flags)
Recs:      TF-IDF precomputed → embeddings in pgvector → personal taste profile
```

### Data Model Core

```
movies          - id, tmdb_id, imdb_id, title, year, overview, poster_path, 
                  popularity, vote_average, runtime, status, enriched_at
genres          - id, tmdb_id, name
movie_genres    - movie_id, genre_id
credits         - id, movie_id, person_id, character, job, department, order
people          - id, tmdb_id, name, profile_path
keywords        - id, tmdb_id, name
movie_keywords  - movie_id, keyword_id

diary_entries   - id, movie_id, watched_at, rating, review, is_rewatch, created_at
watchlist       - id, movie_id, added_at, notes
lists           - id, name, description, ranked, created_at
list_items      - id, list_id, movie_id, position, notes

movie_embeddings - movie_id, embedding (vector(384))
movie_similarities - movie_id, similar_movie_id, score (precomputed top-N)
```

---

## Sources

- [TMDB API Getting Started](https://developer.themoviedb.org/docs/getting-started) - accessed 2026-04-09
- [TMDB Rate Limiting](https://developer.themoviedb.org/docs/rate-limiting) - accessed 2026-04-09
- [TMDB Daily ID Exports](https://developer.themoviedb.org/docs/daily-id-exports) - accessed 2026-04-09
- [TMDB Append To Response](https://developer.themoviedb.org/docs/append-to-response) - accessed 2026-04-09
- [TMDB Discover Movie Reference](https://developer.themoviedb.org/reference/discover-movie) - accessed 2026-04-09
- [Letterboxd Wikipedia](https://en.wikipedia.org/wiki/Letterboxd) - accessed 2026-04-09
- [Letterboxd 2024 Year Stats - Deadline](https://deadline.com/2025/01/letterboxd-indie-films-members-surge-in-2024-favorite-films-1236251217/) - accessed 2026-04-09
- [The Guardian - How Letterboxd became a review haven](https://theguardian.com/film/2025/dec/10/letterboxd-app-movie-review-social-media) - accessed 2026-04-09
- [Trakt.tv About](https://trakt.tv/about) - accessed 2026-04-09
- [IMDb Wikipedia](https://en.wikipedia.org/wiki/IMDb) - accessed 2026-04-09
- [Contentful - Cursor-based pagination](https://www.contentful.com/blog/cursor-based-pagination/) - accessed 2026-04-09
- [Recommender system Wikipedia](https://en.wikipedia.org/wiki/Recommender_system) - accessed 2026-04-09
- ⚠️ External link - [TF-IDF Movie Recommendation Paper](https://www.researchgate.net/publication/360575583) - accessed 2026-04-09
- ⚠️ External link - [MovieLens Recommendation System](https://towardsdatascience.com/movie-recommendation-system-based-on-movielens-ef0df580cd0e/) - accessed 2026-04-09
