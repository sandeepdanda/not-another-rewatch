# Movie Database - Phase Plan

## Vision

A full-stack movie discovery and tracking platform with AI-powered search, recommendations, and conversational movie discovery. Built with React/TypeScript, Java/Spring Boot, and DynamoDB - the same stack used at work, so every hour spent here compounds into professional growth.

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + TypeScript + Vite | TanStack Query + Router, Tailwind + shadcn/ui |
| Backend | Java 21 + Spring Boot 3.5 | Virtual threads, records, Spring AI |
| Database | DynamoDB (single-table design) | Hybrid 2-table: MovieCatalog + UserActivity |
| Vector Search | In-memory cosine similarity (embeddings in JSON) | Upgrade to pgvector/Pinecone later if needed |
| AI | sentence-transformers all-MiniLM-L6-v2 (free, local) | 384-dim embeddings, PyTorch on CPU |
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

## Phase 4: React Frontend Foundation (weeks 5-6) ✅

**Status:** Complete (2026-04-16). Skeleton loading, dark mode, responsive polish deferred.

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

### Phase 4c: TMDB Posters & Visual Polish ✅

**Status:** Complete (2026-04-16). Skeleton loading, dark mode, responsive polish deferred.

- [x] TMDB API integration (poster URLs via enrich_posters.py)
- [x] Real poster images replacing colored placeholders
- [x] Movie detail page: poster + details side-by-side layout
- [x] Lazy loading on poster images
- [ ] Responsive polish, skeleton loading, dark mode (deferred)

**Deliverable:** Browsable movie app with real posters, filtering, sorting. Looks good on mobile and desktop.

**Learning focus:** React component architecture, TypeScript with React, TanStack Query patterns, responsive Tailwind layouts, third-party API integration.

---

## Phase 5: Search & Filtering (week 7) ✅

**Status:** Complete (2026-04-16). Advanced filters and recent searches deferred.

**Tasks:**
- [x] Backend: `GET /api/v1/search?q={query}` endpoint (in-memory title index)
- [x] In-memory title index loaded at startup (prefix + contains search, sorted by popularity)
- [x] Frontend: search bar in header with instant results dropdown
- [x] Debounced search (300ms) with minimum 2 characters
- [x] Dropdown shows poster thumbnails, title, year, rating
- [ ] Advanced filters: genre multi-select, year range, rating range (deferred)
- [ ] Recent searches in localStorage (deferred)

**Notes:**
- Used in-memory index instead of DynamoDB scan - loads all #METADATA items at startup (~5MB for 45K movies)
- Contains search (not just prefix) sorted by popularity for better results
- Phase 6 semantic search will replace this for natural language queries

**Learning focus:** DynamoDB query vs scan vs filter expressions, debouncing in React, URL state management.

---

## Phase 6: AI - Embeddings & Semantic Search (weeks 8-9) ✅

**Status:** Complete (2026-04-16). Hybrid search deferred.

**Goal:** "Movies about loneliness in space" actually works.

**Tasks:**
- [x] Python script: generate embeddings for all movies (sentence-transformers all-MiniLM-L6-v2, free, local)
- [x] Backend: semantic search endpoint `GET /api/v1/search/semantic?q={query}`
- [x] Backend: VectorSearchIndex - in-memory cosine similarity search
- [x] Backend: embedding_server.py - Python HTTP server for query embedding (port 8081)
- [x] Frontend: toggle between "Title search" and "AI search"
- [ ] Backend: similar movies endpoint `GET /api/v1/movies/{id}/similar` (deferred)
- [ ] Hybrid search: combine title prefix match + semantic results (deferred)

**Notes:**
- Spring AI ONNX approach failed: AL2 has GLIBC 2.26, ONNX runtime needs 2.27+
- Switched to Python embedding server (sentence-transformers uses PyTorch, no GLIBC issue)
- 384-dim embeddings, ~80MB model, runs on CPU
- Tested: "space exploration" → Interstellar #1, "dark crime thriller" → Dark Knight #1
- Only 10 test movies embedded; full 45K dataset embedding pending

**Deliverable:** Semantic search that understands natural language queries.

**Learning focus:** Embeddings, vector similarity search, cosine similarity, model selection (ONNX vs PyTorch), GLIBC compatibility.

---

## Phase 7: AI - Movie Discovery Chat (weeks 10-11) ✅

**Status:** Complete (2026-04-16). Real LLM integration deferred (swap in Groq/OpenAI later).

**Goal:** Conversational AI that helps users discover movies.

### Phase 7a: Similar Movies ✅
- [x] Backend: `GET /api/v1/movies/{id}/similar` - cosine similarity on pre-computed embeddings
- [x] Frontend: "Similar Movies" section on movie detail page

### Phase 7b: Chat Backend with RAG ✅
- [x] Backend: `POST /api/v1/chat` endpoint with SSE streaming
- [x] RAG pipeline: user message → embed query → semantic search → build response with movie context
- [x] Template-based response (no LLM - swap in Groq/OpenAI as drop-in later)

### Phase 7c: Chat Frontend ✅
- [x] Chat panel UI with streaming word-by-word display
- [x] Inline movie poster cards (clickable → movie detail page)
- [x] Suggested prompt chips on empty state

**Notes:**
- No LLM needed for v1 - template builds structured response from semantic search results
- SSE streaming plumbing ready for real LLM (just replace buildResponse() with API call)
- Ollama won't run on AL2 (GLIBC 2.26 too old) - use Groq free tier when ready
- etl/setup.sh created to run all data loading steps in one shot

**Deliverable:** Working movie chatbot with streaming responses and clickable movie cards.

---

## Phase 8: User Features - Auth, Watchlist, Ratings (weeks 12-13) ✅

**Status:** Complete (2026-04-17). Diary modal and profile page deferred.

**Goal:** Personal movie tracking.

### Phase 8a: Auth Backend ✅
- [x] Spring Security + JWT (jjwt 0.12.6, BCrypt, 7-day tokens)
- [x] `POST /api/v1/auth/register` and `POST /api/v1/auth/login`
- [x] JwtAuthFilter on protected endpoints, public endpoints still open
- [x] UserActivity DynamoDB table: USER#id/#PROFILE with GSI3 email lookup

### Phase 8b: Auth Frontend ✅
- [x] AuthContext (localStorage token, login/register/logout)
- [x] Login/Register page with toggle
- [x] Conditional nav (Sign In vs username + Logout + Watchlist)

### Phase 8c: Watchlist & Ratings ✅
- [x] `POST/DELETE /api/v1/watchlist/{movieId}`, `GET /api/v1/watchlist`
- [x] `POST /api/v1/ratings/{movieId}`, `GET /api/v1/ratings`
- [x] Watchlist toggle button + 5-star rating on movie detail page
- [x] Watchlist page showing saved movies

**Deliverable:** Users can register, login, save movies to watchlist, and rate them.

---

## Phase 9: Personal Stats & UI Polish (week 14) ✅

**Status:** Complete (2026-04-17). AI taste profile and Letterboxd import deferred.

**Goal:** "Your year in movies" - personalized analytics.

**Tasks:**
- [x] Backend: `GET /api/v1/stats` - aggregates ratings, watchlist, genre breakdown
- [x] Frontend: stats dashboard with summary cards and bar charts
- [x] Watchlist remove button with instant refresh
- [x] Dark/Light mode toggle (☀️/🌙)
- [x] Loading spinners replacing "Loading..." text
- [x] Toast notifications for watchlist/rating actions
- [x] Fixed all frontend route links (standardized to /movie/)
- [ ] AI taste profile from user's ratings (deferred)
- [ ] Letterboxd CSV import (deferred)

**Deliverable:** Stats dashboard, polished UI with dark mode, toasts, and spinners.

---

## Phase 10: Testing & Quality (week 15)

**Goal:** Confidence that everything works.

### Phase 10a: Backend Unit Tests
- MovieService tests (JUnit 5 + Mockito)
- AuthController tests (register, login, duplicate email)
- JwtUtil tests (generate, validate, expired)

### Phase 10b: API Integration Tests
- Full endpoint tests with MockMvc (movies, search, auth, watchlist)

### Phase 10c: Frontend Tests (deferred)
- Component tests (Vitest)
- E2E tests (Playwright)

**Deliverable:** Backend test suite with service + API coverage.

**Learning focus:** Testing strategy, Testcontainers, Playwright.

---

## Phase 11: Deploy, CI/CD & Portfolio Polish (weeks 16-17) ✅

**Status:** Complete (2026-04-17). Cloud deploy (Render/Vercel) and CDK deferred.

**Goal:** CI pipeline, Docker, polished README.

**Tasks:**
- [x] GitHub Actions CI: backend build+test, frontend build (parallel jobs)
- [x] Backend Dockerfile (multi-stage, Corretto 21 Alpine)
- [x] README rewrite: architecture diagram, features list, getting started
- [ ] Deploy to Render/Vercel (deferred)
- [ ] AWS CDK for DynamoDB tables (deferred)
- [ ] Demo GIF (deferred)

**Deliverable:** CI pipeline, Docker-ready backend, polished README.

---

## Summary Timeline

| Phase | What | Weeks | Key Learning |
|-------|------|-------|-------------|
| 1 ✅ | Project Setup & DDB Design | 1 | DynamoDB single-table design |
| 2 ✅ | ETL to DynamoDB | 2 | Batch writes, denormalization |
| 3 ✅ | Java API Foundation | 3-4 | Spring Boot, AWS SDK v2 |
| 4 ✅ | React Frontend + TMDB Posters | 5-6 | React+TS, TanStack Query, Tailwind, API integration |
| 5 ✅ | Search & Filtering | 7 | DDB queries, debouncing, URL state |
| 6 ✅ | AI Embeddings & Semantic Search | 8-9 | Embeddings, vector search, cosine similarity |
| 7 ✅ | AI Chat & Discovery | 10-11 | RAG, SSE streaming, chat UX |
| 8 ✅ | Auth, Watchlist, Ratings | 12-13 | Spring Security, JWT, DDB user data |
| 9 ✅ | Personal Stats & UI Polish | 14 | Aggregation, dark mode, toasts, spinners |
| 10 ✅ | Testing & Quality | 15 | JUnit 5, Mockito, unit tests |
| 11 ✅ | Deploy, CI/CD & Polish | 16-17 | GitHub Actions, Docker, README |
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
