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

## Phase 4: React Frontend Foundation (weeks 5-6)

**Goal:** Movie browsing UI - the visual layer that makes the project demoable.

**Tasks:**
- App shell: layout, navigation, routing (TanStack Router)
- Home page: featured/popular movies grid with poster images
- Movie detail page: poster, overview, cast list, crew, genres, stats (rating, revenue, runtime)
- Browse page: genre filter chips, decade filter, sort by rating/popularity
- Infinite scroll for movie lists (TanStack Query `useInfiniteQuery`)
- Skeleton loading states for all data-fetching components
- Responsive design: mobile-first grid layout
- Image handling: lazy loading, fallback placeholders (no TMDB posters yet - use colored placeholders with movie initials)
- Dark mode toggle (Tailwind dark mode)
- API client layer with typed responses (generated from OpenAPI spec or hand-written)

**Deliverable:** Browsable movie app with filtering, sorting, infinite scroll. Looks good on mobile and desktop.

**Learning focus:** React component architecture, TypeScript with React (generics, discriminated unions), TanStack Query patterns, responsive Tailwind layouts.

---

## Phase 5: Search & Filtering (week 7)

**Goal:** Users can find movies by title, with smart filtering and sorting.

**Tasks:**
- Backend: `GET /api/v1/search?q={query}` endpoint
  - Start with DynamoDB prefix search on title (GSI on title field)
  - Debounced search with minimum 2 characters
- Frontend: search bar in header with instant results dropdown
- Advanced filters panel: genre (multi-select), year range, rating range, runtime range
- Combined filter + sort queries (DynamoDB filter expressions on GSI queries)
- Search results page with result count, applied filters shown as removable chips
- Recent searches stored in localStorage
- "No results" state with suggestions

**Deliverable:** Working search and multi-filter browsing. Fast prefix search on titles.

**Learning focus:** DynamoDB query vs scan vs filter expressions, debouncing in React, URL state management for filters.

---

## Phase 6: AI - Embeddings & Semantic Search (weeks 8-9)

**Goal:** "Movies about loneliness in space" actually works. AI-powered search that understands meaning, not just keywords.

**Tasks:**
- Python script: generate embeddings for all 600K movies
  - Input per movie: title + overview + genres + top cast + director
  - Model: OpenAI text-embedding-3-small (1536 dimensions)
  - Batch API for cost efficiency (~$2.40 total)
  - Store vectors in S3 Vectors (or Pinecone free tier)
- Backend: semantic search endpoint `GET /api/v1/search/semantic?q={query}`
  - Embed user query -> query vector store -> return top-N movie IDs -> batch-get from DDB
  - Spring AI integration for OpenAI calls
- Backend: similar movies endpoint `GET /api/v1/movies/{id}/similar`
  - Get movie's embedding -> find nearest neighbors -> return results
  - Precompute top-20 similar movies per movie and cache in DDB for fast reads
- Frontend: toggle between "Title search" and "AI search" in search bar
- Frontend: "Similar Movies" section on movie detail page
- Hybrid search: combine title prefix match + semantic results, deduplicate

**Deliverable:** Semantic search that understands natural language queries. "Similar movies" on every detail page.

**Learning focus:** Embeddings, vector similarity search, hybrid search ranking, Spring AI, batch processing at scale.

---

## Phase 7: AI - Movie Discovery Chat (weeks 10-11)

**Goal:** Conversational AI that helps users discover movies based on mood, preferences, and natural language.

**Tasks:**
- Backend: chat endpoint `POST /api/v1/chat` with SSE streaming
  - RAG pipeline: user message -> extract intent -> semantic search for relevant movies -> build context -> LLM generates response grounded in real movie data
  - System prompt: movie expert persona, always references actual movies from the database
  - Conversation memory (last 10 messages in session)
  - Tool use: LLM can call search/filter functions to find specific movies
- Frontend: chat UI (assistant-ui library or custom)
  - Slide-out chat panel accessible from any page
  - Streaming message display
  - Movie cards inline in chat responses (clickable, link to detail page)
  - Suggested prompts: "Movies like Inception but funnier", "Best sci-fi from the 90s", "Something to watch on a rainy day"
- AI-generated movie insights on detail page:
  - "Why you might like this" (based on movie attributes)
  - "Movies in conversation with this one" (thematic connections)

**Deliverable:** Working movie chatbot that gives grounded recommendations with real movie data. Streaming responses.

**Learning focus:** RAG architecture, prompt engineering, SSE streaming in Spring Boot, chat UX patterns, grounding AI responses in structured data.

---

## Phase 8: User Features - Auth, Watchlist, Ratings (weeks 12-13)

**Goal:** Personal movie tracking - the feature that makes users come back.

**Tasks:**
- Backend: JWT authentication (Spring Security 6)
  - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
  - Password hashing with BCrypt
  - Stateless JWT validation on protected endpoints
  - Public endpoints (browse, search) remain unauthenticated
- DynamoDB UserActivity table operations:
  - Watchlist: add/remove movies, list user's watchlist
  - Ratings: rate a movie (0.5-10 scale), update rating, list user's ratings
  - Diary: "I watched this on this date" entries with optional review text
- Backend endpoints:
  - `POST/DELETE /api/v1/watchlist/{movieId}`
  - `POST/PUT /api/v1/ratings/{movieId}`
  - `POST /api/v1/diary` (log a watch)
  - `GET /api/v1/me/watchlist`, `/me/ratings`, `/me/diary`
- Frontend: auth flow (login/register pages, auth context, protected routes)
- Frontend: watchlist button on movie cards and detail page
- Frontend: star rating component on movie detail page
- Frontend: diary entry modal ("I watched this today")
- Frontend: profile page with watchlist, ratings, diary tabs

**Deliverable:** Users can create accounts, build watchlists, rate movies, and log what they've watched.

**Learning focus:** Spring Security with JWT, DynamoDB for user-specific data (PK=USER#id patterns), React auth patterns, optimistic UI updates.

---

## Phase 9: Personal Stats & AI Insights (week 14)

**Goal:** "Your year in movies" - personalized analytics that make tracking feel rewarding.

**Tasks:**
- Backend: stats aggregation endpoint `GET /api/v1/me/stats`
  - Total movies watched, average rating, total runtime
  - Genre breakdown (pie chart data)
  - Rating distribution (histogram data)
  - Most-watched directors/actors
  - Watching streak (consecutive days/weeks)
  - Monthly activity heatmap data
- AI-powered taste profile:
  - Analyze user's ratings to build a taste embedding (weighted average of rated movie embeddings)
  - "Your taste profile: You lean toward 90s sci-fi with ensemble casts and dark humor"
  - Personalized recommendations based on taste profile (not just similar-to-last-watched)
- Frontend: stats dashboard page with charts (recharts or chart.js)
  - Genre pie chart, rating histogram, monthly activity heatmap
  - "Your taste" card with AI-generated description
  - "Recommended for you" section powered by taste profile
- Import from Letterboxd: CSV upload that parses Letterboxd export format and creates diary/rating entries

**Deliverable:** Rich personal stats dashboard. AI understands your taste. Letterboxd import works.

**Learning focus:** Data aggregation patterns in DynamoDB (precompute vs query-time), data visualization in React, personalization with embeddings.

---

## Phase 10: TMDB Enrichment & Media (weeks 15-16)

**Goal:** Real posters, trailers, and fresh data from TMDB API.

**Tasks:**
- Backend: TMDB API integration service
  - Map Kaggle movie IDs to TMDB IDs (via links.csv or TMDB search)
  - Fetch: poster URLs, backdrop URLs, trailer YouTube IDs, watch providers, updated ratings
  - `append_to_response` for efficient single-request fetching
  - Rate limiting: respect 40 req/sec soft limit
- Background enrichment job (Spring @Scheduled):
  - Priority queue: enrich popular movies first
  - Daily incremental sync via TMDB `/movie/changes` endpoint
  - Store enriched data in DDB (add attributes to existing movie items)
- Frontend updates:
  - Real poster images (TMDB image CDN)
  - Movie backdrop on detail page
  - "Watch on" section (streaming providers from TMDB)
  - Trailer embed (YouTube) on detail page
- Image optimization: responsive image sizes, blur-up placeholder loading

**Deliverable:** Movies have real posters, trailers, and streaming provider info. Data stays fresh via daily sync.

**Learning focus:** Third-party API integration, background job scheduling, rate limiting, image optimization.

---

## Phase 11: Testing & Quality (week 17)

**Goal:** Confidence that everything works. Test coverage that impresses reviewers.

**Tasks:**
- Backend:
  - Unit tests for all service classes (JUnit 5 + Mockito)
  - Integration tests for DDB repositories (Testcontainers + LocalStack)
  - Controller slice tests (@WebMvcTest)
  - AI integration tests (mock OpenAI responses)
  - Target: 80%+ line coverage on service layer
- Frontend:
  - Component tests for key UI components (Vitest + React Testing Library)
  - Hook tests for custom hooks (TanStack Query wrappers)
  - MSW (Mock Service Worker) for API mocking in tests
  - E2E tests for critical flows: search, movie detail, auth, watchlist (Playwright)
  - Target: 3-5 E2E scenarios covering the happy paths
- Data pipeline:
  - pytest for ETL transform functions
  - Validation checks on DDB load output

**Deliverable:** Comprehensive test suite. CI runs all tests on every PR.

**Learning focus:** Testing strategy (unit vs integration vs E2E), Testcontainers, MSW, Playwright, test-driven confidence.

---

## Phase 12: Deploy, CI/CD & Portfolio Polish (weeks 18-19)

**Goal:** Live on the internet. README that makes people want to try it.

**Tasks:**
- CI/CD (GitHub Actions):
  - Backend: build Java, run tests with LocalStack service container, build Docker image
  - Frontend: build, run Vitest, run Playwright
  - Deploy on merge to main
- Deployment:
  - Backend: Render (Docker deploy, JVM tuned with `-Xmx256m -XX:+UseZGC`)
  - Frontend: Vercel (auto-deploy from GitHub)
  - DynamoDB: AWS free tier (25GB storage, 25 RCU/WCU)
  - S3 Vectors: AWS (pay-per-use, minimal cost)
- Infrastructure as Code: AWS CDK (Java) for DynamoDB tables, S3 Vectors bucket
- README overhaul:
  - Architecture diagram (mermaid)
  - Demo GIF/video showing key features
  - "Try it live" link
  - Tech stack badges
  - Setup instructions (docker compose up)
  - API documentation link (Swagger)
- Performance: Lighthouse audit on frontend, API response time benchmarks
- Security review: no secrets in code, environment variables for all config, CORS configured

**Deliverable:** Live demo at a public URL. Polished README. One-command local setup.

**Learning focus:** CI/CD pipelines, Docker multi-stage builds, JVM tuning for containers, CDK (Java), production deployment.

---

## Summary Timeline

| Phase | What | Weeks | Key Learning |
|-------|------|-------|-------------|
| 1 | Project Setup & DDB Design | 1 | DynamoDB single-table design |
| 2 | ETL to DynamoDB | 2 | Batch writes, denormalization |
| 3 | Java API Foundation | 3-4 | Spring Boot, AWS SDK v2, Testcontainers |
| 4 | React Frontend Foundation | 5-6 | React+TS, TanStack Query, Tailwind |
| 5 | Search & Filtering | 7 | DDB queries, debouncing, URL state |
| 6 | AI Embeddings & Semantic Search | 8-9 | Embeddings, vector search, Spring AI |
| 7 | AI Chat & Discovery | 10-11 | RAG, streaming, prompt engineering |
| 8 | Auth, Watchlist, Ratings | 12-13 | Spring Security, JWT, user data in DDB |
| 9 | Personal Stats & AI Insights | 14 | Aggregation, visualization, personalization |
| 10 | TMDB Enrichment & Media | 15-16 | API integration, background jobs |
| 11 | Testing & Quality | 17 | Testing strategy, Testcontainers, Playwright |
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
