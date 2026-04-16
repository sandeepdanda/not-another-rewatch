# Movie Database - Phase Plan

## Vision

A full-stack movie discovery and tracking platform with AI-powered search, recommendations, and conversational movie discovery. Built with React/TypeScript, Java/Spring Boot, and DynamoDB - the same stack used at work, so every hour spent here compounds into professional growth.

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + TypeScript + Vite | TanStack Query + Router, Tailwind + shadcn/ui |
| Backend | Java 21 + Spring Boot 3.5 | Virtual threads, records, Spring AI |
| Database | DynamoDB (single-table design) | Hybrid 2-table: MovieCatalog + UserActivity |
| Vector Search | Amazon S3 Vectors (or Pinecone free tier) | For AI-powered semantic search |
| AI | OpenAI API (embeddings + chat) | text-embedding-3-small + gpt-4o-mini |
| Data Pipeline | Python (existing ETL, retargeted to DDB) | Pandas + boto3 |
| Cache | Caffeine (in-process) | Upgrade to Redis later if needed |
| Auth | JWT (Spring Security + jjwt) | Stateless, simple |
| Containerization | Docker Compose | LocalStack for DDB, Spring Boot, React dev server |
| CI/CD | GitHub Actions | Build, test (LocalStack), deploy |
| Deploy | Render (backend) + Vercel (frontend) + AWS DDB free tier | ~$0-5/month |

## AI Cost Estimate

| Item | Cost |
|------|------|
| Embed 600K movies (text-embedding-3-small, ~120M tokens) | ~$2.40 one-time |
| Chat queries (gpt-4o-mini, ~$0.15/1M input tokens) | ~$1-3/month |
| S3 Vectors storage (600K vectors, 1536 dims) | ~$2-5/month |
| Total ongoing | ~$3-8/month |

---

## Phase 1: Project Setup & DynamoDB Design (week 1) ✅

**Status:** Complete (2026-04-14)

**Goal:** Solid foundation - monorepo structure, Docker dev environment, DynamoDB table design.

**Tasks:**
- [x] Set up monorepo structure: `/backend` (Spring Boot), `/frontend` (React+TS), `/etl` (existing Python), `/infra` (Docker, IaC)
- [x] Initialize Spring Boot project (Java 21, Spring Web, Spring AI, AWS SDK v2)
- [x] Initialize React+TS project with Vite, TanStack Query, Tailwind, shadcn/ui
- [x] Docker Compose: LocalStack (DynamoDB), Spring Boot, React dev server
- [x] Design DynamoDB schema:
  - **MovieCatalog table** (single-table): movies, genres, persons, cast, crew, companies, countries
  - **UserActivity table**: watchlist, ratings, viewing diary
  - 3 GSIs: entity lookup (genre/person/decade browsing), popularity/rating sorting, user-movie reverse lookup
  - Document all access patterns and key designs

**Deliverable:** `docker compose up` starts the full dev environment. DynamoDB tables created via LocalStack.

**Notes:**
- Spring Boot 3.5.0 (3.4.x no longer on Spring Initializr)
- LocalStack pinned to 3.8 (latest requires paid license now)
- Java 21 managed via mise, scoped to project (.mise.toml)

**Learning focus:** DynamoDB single-table design, access pattern thinking, adjacency list pattern for many-to-many relationships.

---

## Phase 2: Data Pipeline - ETL to DynamoDB (week 2) ✅

**Status:** Complete (2026-04-14). Full load pending (~2hrs against LocalStack).

**Goal:** Get 600K+ movies loaded into DynamoDB with the denormalized schema.

**Tasks:**
- [x] Modify Python ETL `load.py` to write to DynamoDB (boto3 batch_write_item)
- [x] Transform relational data into DynamoDB items:
  - Movie metadata: `PK=MOVIE#<id>, SK=METADATA`
  - Cast: `PK=MOVIE#<id>, SK=CAST#<order>#<personId>`
  - Crew: `PK=MOVIE#<id>, SK=CREW#<dept>#<personId>`
  - Genre mapping: `PK=MOVIE#<id>, SK=GENRE#<name>`
  - Person reverse index: `PK=PERSON#<id>, SK=MOVIE#<movieId>`
  - Genre reverse index: `PK=GENRE#<name>, SK=MOVIE#<movieId>`
- [x] Handle batch write limits (25 items per batch, dedup per batch)
- [x] Validate data integrity: count checks, spot-check queries
- [x] Write a simple verification script that queries each access pattern

**Deliverable:** 45K movies → 758K DynamoDB items. All 6 access patterns verified on test data. Full load runs clean (70K items loaded before timeout, no errors).

**Notes:**
- LocalStack is slow (~10K items/100s). Full load takes ~2hrs. Run with `nohup`.
- Fixed pandas compat bug in transform.py (Series vs dict in extract_crew)
- Fixed batch dedup: crew members with same person+department caused duplicate keys (777 caught)
- Swapped requirements: sqlalchemy/psycopg2 → boto3

**Learning focus:** DynamoDB batch operations, write throughput management, denormalization in practice (same data written multiple ways).

---

## Phase 3: Java API Foundation (weeks 3-4) ✅

**Status:** Complete (2026-04-16). Cursor pagination, Swagger, and tests deferred to Phase 3b.

**Goal:** Core REST API serving movie data from DynamoDB.

**Tasks:**
- [x] Project structure: package-by-feature (`movie/`, `config/`)
- [x] DynamoDB Enhanced Client setup with `@DynamoDbBean` entity classes
- [x] Repository layer wrapping DynamoDbTable operations
- [x] Core endpoints:
  - [x] `GET /api/v1/movies/{id}` - movie details with cast, crew, genres (single Query on PK)
  - [x] `GET /api/v1/movies?genre={name}` - filter by genre (GSI1 query)
  - [x] `GET /api/v1/movies?decade={decade}` - filter by decade (GSI1 query)
  - [x] `GET /api/v1/movies?sort=rating|popularity` - sorted lists (GSI2 query)
  - [x] `GET /api/v1/persons/{id}` - person details with filmography (GSI1 query)
  - [x] `GET /api/v1/genres` - list all genres
- [x] Global exception handler with consistent error responses
- [x] Caffeine cache for hot movie data (30min TTL, 10K max entries)
- [ ] `GET /api/v1/movies` - cursor-based pagination (deferred)
- [ ] OpenAPI docs via springdoc-openapi (deferred)
- [ ] Unit tests / integration tests (deferred)

**Notes:**
- Spring Boot 3.5.0 with Java 21 virtual threads
- Fixed @DynamoDbAttribute case mismatch (PK vs pk) - Enhanced Client defaults to lowercase
- Added personName to GSI1 projection for person filmography lookup
- AWS SDK BOM 2.31.1 for version management

**Learning focus:** Spring Boot REST patterns, AWS SDK v2 Enhanced Client, cursor-based pagination with DynamoDB, Testcontainers.

---

## Phase 4: React Frontend Foundation (weeks 5-6) - IN PROGRESS

**Goal:** Movie browsing UI - the visual layer that makes the project demoable.

### Phase 4a: Setup & API Layer ✅
- [x] Tailwind CSS + Vite plugin setup
- [x] React Router for page routing
- [x] TanStack Query for data fetching
- [x] Typed API client layer (fetch calls matching backend endpoints)

### Phase 4b: Core Pages ✅
- [x] App shell: layout, navigation bar, routing
- [x] Home page: top rated movies grid
- [x] Movie detail page: overview, cast, crew, genres, stats
- [x] Browse page: genre filter chips, decade filter, sort toggle
- [x] Person page: filmography grid

### Phase 4c: TMDB Posters & Visual Polish
- TMDB API integration (poster URLs, backdrops, trailers)
- Real poster images replacing colored placeholders
- Movie backdrop on detail page
- Responsive design: mobile-first grid layout
- Skeleton loading states
- Dark mode toggle

**Deliverable:** Browsable movie app with real posters, filtering, sorting. Looks good on mobile and desktop.

**Learning focus:** React component architecture, TypeScript with React, TanStack Query patterns, responsive Tailwind layouts, third-party API integration.

---

## Phase 5: Search & Filtering (week 7)

**Goal:** Users can find movies by title, with smart filtering and sorting.

**Tasks:**
- Backend: `GET /api/v1/search?q={query}` endpoint (DynamoDB prefix search on title)
- Frontend: search bar in header with instant results dropdown
- Debounced search with minimum 2 characters
- Advanced filters: genre (multi-select), year range, rating range
- Search results page with removable filter chips
- Recent searches in localStorage

**Deliverable:** Working search and multi-filter browsing.

**Learning focus:** DynamoDB query vs scan vs filter expressions, debouncing in React, URL state management.

---

## Phase 6: AI - Embeddings & Semantic Search (weeks 8-9)

**Goal:** "Movies about loneliness in space" actually works.

**Tasks:**
- Python script: generate embeddings for all movies (OpenAI text-embedding-3-small)
- Backend: semantic search endpoint `GET /api/v1/search/semantic?q={query}`
- Backend: similar movies endpoint `GET /api/v1/movies/{id}/similar`
- Frontend: toggle between "Title search" and "AI search"
- Frontend: "Similar Movies" section on movie detail page
- Hybrid search: combine title prefix match + semantic results

**Deliverable:** Semantic search that understands natural language. Similar movies on every detail page.

**Learning focus:** Embeddings, vector similarity search, Spring AI, batch processing at scale.

---

## Phase 7: AI - Movie Discovery Chat (weeks 10-11)

**Goal:** Conversational AI that helps users discover movies.

**Tasks:**
- Backend: chat endpoint `POST /api/v1/chat` with SSE streaming
- RAG pipeline: user message → semantic search → LLM response grounded in real data
- Conversation memory (last 10 messages)
- Frontend: chat panel with streaming messages and inline movie cards
- Suggested prompts: "Movies like Inception but funnier"

**Deliverable:** Working movie chatbot with grounded recommendations. Streaming responses.

**Learning focus:** RAG architecture, prompt engineering, SSE streaming in Spring Boot, chat UX.

---

## Phase 8: User Features - Auth, Watchlist, Ratings (weeks 12-13)

**Goal:** Personal movie tracking.

**Tasks:**
- Backend: JWT authentication (Spring Security 6)
- DynamoDB UserActivity table: watchlist, ratings, diary entries
- Frontend: auth flow, watchlist button, star rating, diary modal, profile page

**Deliverable:** Users can create accounts, build watchlists, rate movies, log watches.

**Learning focus:** Spring Security with JWT, DynamoDB user data patterns, React auth, optimistic UI.

---

## Phase 9: Personal Stats & AI Insights (week 14)

**Goal:** "Your year in movies" - personalized analytics.

**Tasks:**
- Backend: stats aggregation (genre breakdown, rating distribution, streaks)
- AI taste profile from user's ratings
- Frontend: stats dashboard with charts
- Letterboxd CSV import

**Deliverable:** Rich personal stats. AI understands your taste.

**Learning focus:** Data aggregation in DynamoDB, data visualization, personalization with embeddings.

---

## Phase 10: Testing & Quality (week 15)

**Goal:** Confidence that everything works.

**Tasks:**
- Backend: unit tests (JUnit 5 + Mockito), integration tests (Testcontainers + LocalStack)
- Frontend: component tests (Vitest), E2E tests (Playwright)
- ETL: pytest for transform functions
- Target: 80%+ service layer coverage, 3-5 E2E scenarios

**Deliverable:** Comprehensive test suite. CI runs all tests.

**Learning focus:** Testing strategy, Testcontainers, Playwright.

---

## Phase 11: Deploy, CI/CD & Portfolio Polish (weeks 16-17)

**Goal:** Live on the internet with a polished README.

**Tasks:**
- CI/CD: GitHub Actions (build, test, deploy on merge)
- Deploy: Render (backend), Vercel (frontend), AWS DynamoDB free tier
- AWS CDK for DynamoDB tables
- README: demo GIF, "try it live" link, architecture diagram, setup instructions
- Performance: Lighthouse audit, API benchmarks
- Security review

**Deliverable:** Live demo at a public URL. Polished README. One-command local setup.

**Learning focus:** CI/CD, Docker, JVM tuning, CDK, production deployment.

---

## Summary Timeline

| Phase | What | Weeks | Key Learning |
|-------|------|-------|-------------|
| 1 ✅ | Project Setup & DDB Design | 1 | DynamoDB single-table design |
| 2 ✅ | ETL to DynamoDB | 2 | Batch writes, denormalization |
| 3 ✅ | Java API Foundation | 3-4 | Spring Boot, AWS SDK v2 |
| 4 | React Frontend + TMDB Posters | 5-6 | React+TS, TanStack Query, Tailwind, API integration |
| 5 | Search & Filtering | 7 | DDB queries, debouncing, URL state |
| 6 | AI Embeddings & Semantic Search | 8-9 | Embeddings, vector search, Spring AI |
| 7 | AI Chat & Discovery | 10-11 | RAG, streaming, prompt engineering |
| 8 | Auth, Watchlist, Ratings | 12-13 | Spring Security, JWT, user data in DDB |
| 9 | Personal Stats & AI Insights | 14 | Aggregation, visualization, personalization |
| 10 | Testing & Quality | 15 | Testing strategy, Testcontainers, Playwright |
| 11 | Deploy, CI/CD & Portfolio Polish | 16-17 | CI/CD, Docker, CDK, production deployment |
| 12 | Deploy & Portfolio Polish | 18-19 | CI/CD, Docker, CDK, production ops |

**Total: ~19 weeks** (at personal project pace, evenings/weekends - adjust as needed)

---

## What This Becomes

When done, a user visits your site and can:
- Browse 600K+ movies with real posters, ratings, cast info
- Search by title OR natural language ("heist movies with dark humor")
- Chat with an AI movie expert for personalized recommendations
- See "similar movies" on every detail page
- Create an account, rate movies, build a watchlist, log a diary
- View personal stats: genre breakdown, rating distribution, taste profile
- Import their Letterboxd history
- Watch trailers and see where to stream each movie

And when a hiring manager looks at the GitHub repo, they see:
- Clean architecture (Spring Boot + React, not a tutorial copy)
- DynamoDB single-table design (shows you understand NoSQL)
- AI integration that's grounded and useful (not a gimmick)
- Full test suite with real integration tests
- Docker one-liner setup
- Live demo link
- Architecture diagram
- CI/CD pipeline
