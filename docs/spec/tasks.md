# Not Another Rewatch - Task Breakdown

Estimates: S = 1-2 hrs, M = 3-5 hrs, L = 6-10 hrs

---

## Epic 1: Project Setup & DynamoDB Design

### Story 1.1: Monorepo & Project Init

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 1.1.1 | Create monorepo structure, .gitignore, .editorconfig | S | - | `/backend`, `/frontend`, `/etl`, `/infra` dirs. Ignores target/, node_modules/, .env |
| 1.1.2 | Init Spring Boot project | M | 1.1.1 | `./gradlew build` passes. Java 21, Spring Boot 3.5, Spring Web, AWS SDK v2, springdoc-openapi in build.gradle. Virtual threads enabled in application.yml |
| 1.1.3 | Init React+TS project with Vite | S | 1.1.1 | `npm run dev` starts. TypeScript strict mode, TanStack Query + Router, Tailwind + shadcn/ui configured |
| 1.1.4 | Create .env.example | S | 1.1.2 | Lists all required env vars: AWS_ENDPOINT, OPENAI_API_KEY, TMDB_API_KEY, JWT_SECRET, DATABASE_URL |

### Story 1.2: Docker Dev Environment

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 1.2.1 | Write Docker Compose with LocalStack | M | 1.1.2, 1.1.3 | `docker compose up` starts LocalStack (DDB), Spring Boot, React dev server |
| 1.2.2 | Create DDB table init script | S | 1.2.1 | Shell script creates MovieCatalog (with GSI1, GSI2) + UserActivity (with GSI3 email lookup) tables in LocalStack |
| 1.2.3 | Configure Spring Boot for LocalStack | S | 1.2.1 | `application-dev.yml` points to LocalStack endpoint. Profile auto-activates in Docker |

### Story 1.3: DynamoDB Schema

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 1.3.1 | Document access patterns and key design | M | - | Markdown doc with PK/SK patterns, GSI definitions (including projections), item examples |
| 1.3.2 | Create DDB entity Java classes - Movie entities | M | 1.1.2 | `@DynamoDbBean` classes for Movie, MovieGenre, MovieCast, MovieCrew, Person with all GSI key annotations |
| 1.3.3 | Create DDB entity Java classes - User entities | S | 1.1.2 | `@DynamoDbBean` classes for UserProfile, UserRating, WatchlistItem, DiaryEntry |

**Phase 1 total: 10 tasks, ~24 hrs**

---

## Epic 2: ETL to DynamoDB

### Story 2.1: Transform for DynamoDB

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 2.1.1 | Write DDB item builder for movies + genres | M | 1.3.1 | Python function takes a movie row, returns list of DDB items (metadata item + genre items) with all GSI attributes |
| 2.1.2 | Write DDB item builder for cast/crew/persons | M | 1.3.1 | Python function takes credits row, returns cast items + crew items + person metadata items with GSI1 attributes |

### Story 2.2: Batch Load

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 2.2.1 | Implement batch_write_item with backoff | M | 2.1.1 | Handles 25-item batch limit, retries unprocessed items with exponential backoff, logs progress every 1000 movies |
| 2.2.2 | Write full ETL pipeline script | M | 2.2.1, 2.1.1, 2.1.2 | `python etl/load_dynamodb.py` loads all movies into LocalStack DDB. Console shows final counts |
| 2.2.3 | Write verification script | S | 2.2.2 | Checks: total movie count >45K, spot-checks 5 movies with full Query(PK=MOVIE#id), verifies GSI1 returns results for 3 genres and 2 persons |

**Phase 2 total: 5 tasks, ~18 hrs**

---

## Epic 3: Java API Foundation

### Story 3.1: Core Setup

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 3.1.1 | DynamoDB config and client beans | S | 1.3.2 | `DynamoDbConfig.java` creates Enhanced Client bean, configurable endpoint (LocalStack vs AWS) |
| 3.1.2 | Global exception handler + pagination utils | S | 1.1.2 | `@ControllerAdvice` returns `{error, message, status}`. `PagedResponse<T>` record with cursor helpers |
| 3.1.3 | Health check endpoint | S | 3.1.1 | `GET /health` returns 200 with `{"status": "ok", "dynamodb": "connected"}`. Returns 503 if DDB unreachable |

### Story 3.2: Movie Endpoints

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 3.2.1 | MovieResponse DTOs | S | - | Java records: `MovieResponse`, `MovieSummary`, `CastMember`, `CrewMember`, `GenreInfo` |
| 3.2.2 | MovieRepository - getById | M | 3.1.1, 3.2.1 | `Query(PK=MOVIE#id)` returns all items, assembles into MovieResponse with cast, crew, genres |
| 3.2.3 | MovieRepository - browse with pagination | M | 3.1.1, 3.1.2 | Queries GSI2 for top-rated movies, returns cursor-paginated MovieSummary list |
| 3.2.4 | MovieRepository - filter by genre | M | 3.1.1 | Queries GSI1 with `GENRE#name` partition, returns paginated MovieSummary list |
| 3.2.5 | MovieRepository - filter by decade | S | 3.1.1 | Queries GSI1 with `DECADE#d` partition |
| 3.2.6 | MovieController + MovieService | M | 3.2.2-3.2.5 | `GET /api/v1/movies/{id}`, `GET /api/v1/movies?genre=&decade=&sort=&cursor=&limit=` all working |

### Story 3.3: Person & Genre Endpoints

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 3.3.1 | PersonRepository + endpoint | M | 3.1.1 | `GET /api/v1/persons/{id}` returns person info + filmography from GSI1 |
| 3.3.2 | Genre list endpoint | S | 3.1.1 | `GET /api/v1/genres` returns all genres |

### Story 3.4: Caching & Docs

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 3.4.1 | Caffeine cache configuration | S | 3.2.6 | `@Cacheable` on getMovieById, 30min TTL, max 10K entries |
| 3.4.2 | SpringDoc OpenAPI setup | S | 3.2.6 | Swagger UI at `/swagger-ui.html` shows all endpoints with request/response schemas |

### Story 3.5: Tests

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 3.5.1 | MovieService unit tests | M | 3.2.6 | JUnit 5 + Mockito tests for getById, browse, filter. Mock repository. All pass |
| 3.5.2 | MovieRepository integration test | M | 3.2.2 | Testcontainers + LocalStack. Load 10 test movies, verify AP1, AP2, AP3, AP4, AP5 queries |
| 3.5.3 | MovieController slice test | S | 3.2.6 | `@WebMvcTest` tests for 200 (happy path), 404 (not found), 400 (bad params) |

**Phase 3 total: 16 tasks, ~44 hrs**

---

## Epic 4: React Frontend Foundation

*Can be parallelized with Phase 3 after API contract (DTOs) is defined.*

### Story 4.1: App Shell

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 4.1.1 | Layout, header, routing, error boundary | M | 1.1.3 | TanStack Router setup, header with logo + nav + search placeholder, responsive layout, top-level ErrorBoundary |
| 4.1.2 | API client with TypeScript types | M | - | Typed fetch wrapper, MovieResponse/MovieSummary/PagedResponse types matching backend DTOs |
| 4.1.3 | shadcn/ui base components | S | 1.1.3 | Install Button, Card, Input, Skeleton, Badge, Dialog, Tabs from shadcn/ui |

### Story 4.2: Movie Browsing

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 4.2.1 | MovieCard component | M | 4.1.3 | Poster placeholder (colored with initials), title, year, rating badge. Responsive sizing |
| 4.2.2 | MovieGrid with infinite scroll | M | 4.2.1, 4.1.2 | `useInfiniteQuery` loads pages on scroll. Intersection Observer triggers next page. Shows skeleton during load |
| 4.2.3 | Home page | M | 4.2.2 | Popular movies grid, genre quick-links section |
| 4.2.4 | Browse page with filters | M | 4.2.2 | Genre chips (multi-select), decade dropdown, sort dropdown. Filters reflected in URL params |

### Story 4.3: Movie Detail & Person

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 4.3.1 | Movie detail page | L | 4.1.2 | Overview, metadata (year, runtime, rating, revenue), genre tags, cast list, crew list. Loading/error/empty states |
| 4.3.2 | Person page | M | 4.1.2 | Person name, filmography as movie grid |

### Story 4.4: Polish

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 4.4.1 | Skeleton loading states | S | 4.2.1 | SkeletonCard and SkeletonDetail components shown during loading |
| 4.4.2 | Responsive design pass | M | 4.2.3, 4.3.1 | Test on 375px, 768px, 1280px widths. Grid adapts: 1/2/4 columns |
| 4.4.3 | 404 page and error/empty states | S | 4.1.1 | 404 catch-all route with search bar. All pages have error (retry) and empty (helpful message) states |
| 4.4.4 | Dark mode toggle | S | 4.1.1 | Theme toggle in header, Tailwind dark mode, preference in localStorage |

**Phase 4 total: 13 tasks, ~43 hrs**

---

## Epic 5: Search & Filtering

### Story 5.1: Backend Search

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 5.1.1 | Title search endpoint | M | 3.2.6 | `GET /api/v1/search?q=god` returns movies with title prefix match. In-memory index loaded on startup |
| 5.1.2 | Combined filter support | S | 3.2.4 | Genre + decade filters can be combined in a single query |

### Story 5.2: Frontend Search

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 5.2.1 | Search bar with debounce | M | 4.1.1 | Search input in header, 300ms debounce, instant dropdown with top 5 results |
| 5.2.2 | Search results page | M | 5.2.1 | Full results grid, result count, applied filters as removable chips |
| 5.2.3 | URL state for filters | S | 5.2.2 | All filter state in URL search params. Shareable URLs. Back button works |

**Phase 5 total: 5 tasks, ~15 hrs**

---

## Epic 6: AI Embeddings & Semantic Search

### Story 6.1: Setup & Generation

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 6.1.0 | Set OpenAI spending limit + configure Spring AI | S | 1.1.2 | $20/month hard cap in OpenAI dashboard. Spring AI dependency + EmbeddingClient bean configured in application.yml |
| 6.1.1 | Build embedding input text per movie | M | 2.2.2 | Python script reads DDB, builds "title. overview. Genres: ... Director: ... Cast: ..." per movie |
| 6.1.2 | Batch embed via OpenAI API | L | 6.1.1 | Process all movies in batches of 2048, handle rate limits, save progress for resume, log progress |
| 6.1.3 | Store vectors in S3 Vectors or Pinecone | M | 6.1.2 | All vectors stored with metadata (genre, year, rating, title). Verify with a test similarity query |

### Story 6.2: Semantic Search

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 6.2.1 | Semantic search endpoint | M | 6.1.3, 6.1.0 | `GET /api/v1/search/semantic?q=...` embeds query, searches vectors, returns movies. Falls back to title search on failure |
| 6.2.2 | Similar movies endpoint | M | 6.1.3 | `GET /api/v1/movies/{id}/similar` returns 10 nearest neighbors. Falls back to "popular in same genre" on failure |

### Story 6.3: Frontend Integration

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 6.3.1 | Search mode toggle (Title / AI) | S | 5.2.1 | Toggle in search bar switches between `/search` and `/search/semantic`. Shows "AI unavailable" banner on fallback |
| 6.3.2 | Similar Movies section on detail page | S | 4.3.1, 6.2.2 | "Similar Movies" grid below movie details |

**Phase 6 total: 8 tasks, ~30 hrs**

---

## Epic 7: AI Chat & Discovery

### Story 7.1: Chat Backend

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 7.1.1 | Basic SSE streaming endpoint | M | 6.1.0 | `POST /api/v1/chat` accepts message, returns SSE stream. Test with hardcoded response first |
| 7.1.2 | RAG pipeline + OpenAI integration | L | 7.1.1, 6.2.1 | User message -> semantic search -> build context -> OpenAI chat completion -> streaming tokens with movie IDs |
| 7.1.3 | System prompt template | M | - | Prompt file in `resources/prompts/`. Movie expert persona, must reference real movies with IDs, only discuss movies |
| 7.1.4 | Conversation memory | S | 7.1.1 | In-memory map, keeps last 10 messages per sessionId, 1h TTL. Simple - no persistence |
| 7.1.5 | Chat fallback on AI failure | S | 7.1.1 | When OpenAI fails, return SSE error event: `{"message": "Movie chat is temporarily unavailable"}` |

### Story 7.2: Chat Frontend

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 7.2.1 | Chat panel UI | L | 4.1.1 | Slide-out panel from right, message bubbles (user/assistant), input bar, close button |
| 7.2.2 | SSE streaming display | M | 7.2.1 | Tokens appear incrementally (verify in DevTools Network tab). Auto-scroll. Shows error message on failure |
| 7.2.3 | Inline movie cards in chat | M | 7.2.1, 4.2.1 | When AI mentions a movie with an ID, render a clickable MovieCard inline |
| 7.2.4 | Suggested prompts | S | 7.2.1 | 4-5 starter prompts in empty chat state. Clicking one sends it |

**Phase 7 total: 9 tasks, ~40 hrs**

---

## Epic 8: Auth, Watchlist, Ratings

### Story 8.1: Authentication Backend

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 8.1.1 | Spring Security + JWT config | M | 3.1.1 | SecurityConfig with public/protected endpoint rules, JWT filter, stateless sessions. Access token in header, refresh in httpOnly cookie |
| 8.1.2 | Register endpoint | M | 8.1.1 | `POST /auth/register` creates user in DDB (UserActivity table, with GSI3 email entry), BCrypt password, returns tokens. 409 on duplicate email. Min 8 char password |
| 8.1.3 | Login + refresh endpoints | M | 8.1.1 | `POST /auth/login` verifies credentials via GSI3 email lookup, returns tokens. `POST /auth/refresh` validates cookie, returns new access token |

### Story 8.2: User Data Backend

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 8.2.1 | Watchlist endpoints | M | 8.1.1 | `POST/DELETE /me/watchlist/{movieId}`, `GET /me/watchlist` with pagination |
| 8.2.2 | Rating endpoints | M | 8.1.1 | `POST/PUT /me/ratings/{movieId}`, `GET /me/ratings` with pagination |
| 8.2.3 | Diary endpoints | M | 8.1.1 | `POST /me/diary`, `DELETE /me/diary/{entryId}`, `GET /me/diary` with date-sorted pagination |

### Story 8.3: Auth Frontend

*Depends on Story 8.1 being complete.*

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 8.3.1 | Auth context and token management | M | 4.1.2, 8.1.1 | React context stores user + access token in memory. Auto-refresh via httpOnly cookie before expiry. Redirect to login on 401 |
| 8.3.2 | Login and register pages | M | 8.3.1 | Form validation, error display, redirect to home on success |
| 8.3.3 | Watchlist button component | S | 8.3.1, 4.2.1 | Heart/bookmark icon on MovieCard and detail page. Optimistic toggle. Shows login prompt if not authed |
| 8.3.4 | Rating stars component | M | 8.3.1 | Half-star rating (0.5-10) on detail page. Hover preview. Saves on click |
| 8.3.5 | Profile page with tabs | M | 8.3.1 | Watchlist tab (movie grid), Ratings tab (grid with star overlay), Diary tab (chronological list) |

**Phase 8 total: 11 tasks, ~38 hrs**

---

## Epic 9: Personal Stats & AI Insights

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 9.1 | Stats aggregation endpoint | M | 8.2.1, 8.2.2, 8.2.3 | `GET /me/stats` returns total watched, avg rating, genre counts, rating distribution |
| 9.2 | AI taste profile endpoint | M | 6.1.3, 8.2.2 | `GET /me/taste` computes taste from rated movies, sends to OpenAI for description. Falls back to "Your top genres: Action, Sci-Fi" |
| 9.3 | Personalized recommendations | M | 9.2 | `GET /me/recommendations` uses taste embedding to find nearest unseen movies. Falls back to popular in top genres |
| 9.4 | Stats dashboard page | L | 9.1 | Genre pie chart, rating histogram, total stats cards (recharts or chart.js) |
| 9.5 | Taste + recs on stats page | S | 9.2, 9.3 | "Your Taste" card + "Recommended for You" movie row on stats page |
| 9.6 | Letterboxd CSV import | M | 8.2.2, 8.2.3 | Upload endpoint parses Letterboxd diary.csv, creates rating + diary entries in DDB |

**Phase 9 total: 6 tasks, ~25 hrs**

---

## Epic 10: TMDB Enrichment

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 10.1 | TMDB API client | M | 3.1.1 | Java HTTP client for TMDB. `getMovie(id)` with `append_to_response=images,videos,watch/providers`. Respects 40 req/sec |
| 10.2 | Movie ID mapping (Kaggle to TMDB) | M | 2.2.2 | Script maps Kaggle movie IDs to TMDB IDs using links.csv |
| 10.3 | Enrichment service | M | 10.1, 10.2 | Fetches poster, backdrop, trailer, watch providers. Updates DDB movie items |
| 10.4 | Background enrichment scheduler | S | 10.3 | `@Scheduled` daily at 2 AM. Popular movies first. Logs progress |
| 10.5 | Frontend: poster images | M | 10.3, 4.2.1 | MovieCard and detail page show TMDB poster (w185 for grid, w342 for detail). Fallback to colored placeholder |
| 10.6 | Frontend: trailer + watch providers | M | 10.3, 4.3.1 | YouTube embed on detail page. "Watch on" section with provider logos |

**Phase 10 total: 6 tasks, ~22 hrs**

---

## Epic 11: Testing & Quality

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 11.1 | Backend unit test coverage - movie + person | M | All backend | JaCoCo report shows >80% line coverage on MovieService, PersonService |
| 11.2 | Backend unit test coverage - auth + AI | M | All backend | JaCoCo report shows >80% line coverage on AuthService, AiService (mocked OpenAI) |
| 11.3 | Backend integration tests | M | All backend | Testcontainers + LocalStack tests for all repository query patterns (AP1-AP7, AP10) |
| 11.4 | Frontend component tests | M | All frontend | Vitest + RTL for MovieCard, SearchBar, RatingStars, WatchlistButton |
| 11.5 | E2E: search and browse flow | M | All | Playwright: home -> search -> results -> movie detail |
| 11.6 | E2E: auth and watchlist flow | M | 8.3.2 | Playwright: register -> login -> add to watchlist -> view profile |
| 11.7 | ETL tests | S | 2.1.1 | pytest for transform functions (genre extraction, cast parsing, item building) |

**Phase 11 total: 7 tasks, ~28 hrs**

---

## Epic 12: Deploy & Portfolio Polish

| # | Task | Size | Deps | Acceptance Criteria |
|---|------|------|------|-------------------|
| 12.1 | Backend Dockerfile (multi-stage) | M | All backend | Build stage + runtime stage. JVM tuned: `-Xmx256m -XX:+UseZGC` |
| 12.2 | GitHub Actions CI pipeline | M | 11.4 | Backend + frontend jobs in parallel. LocalStack service container for tests |
| 12.3 | Deploy backend to Render | M | 12.1 | Auto-deploy from main. Health check passes. Env vars configured |
| 12.4 | Deploy frontend to Vercel | S | All frontend | Auto-deploy from main. `VITE_API_URL` set to Render backend URL |
| 12.5 | Provision AWS DynamoDB tables + run production load | L | 2.2.2 | Production tables created. Movies loaded. Embeddings generated and stored |
| 12.6 | README: architecture diagram | S | All | Mermaid diagram in README showing all components and data flows |
| 12.7 | README: demo GIF + live link | S | 12.3, 12.4 | Screen recording showing search, chat, watchlist. "Try it live" link |
| 12.8 | README: technical decisions + setup instructions | S | All | "Technical Decisions" section explaining DDB, Spring AI, cursor pagination tradeoffs. `docker compose up` instructions |
| 12.9 | Performance audit | S | 12.3, 12.4 | Lighthouse >90 on frontend. API p95 <500ms for non-AI endpoints |

**Phase 12 total: 9 tasks, ~27 hrs**

---

## Summary

| Phase | Epic | Tasks | Estimated Hours | Cumulative Hours |
|-------|------|-------|----------------|-----------------|
| 1 | Project Setup & DDB Design | 10 | 24 | 24 |
| 2 | ETL to DynamoDB | 5 | 18 | 42 |
| 3 | Java API Foundation | 16 | 44 | 86 |
| 4 | React Frontend Foundation | 13 | 43 | 129 |
| 5 | Search & Filtering | 5 | 15 | 144 |
| 6 | AI Embeddings & Semantic Search | 8 | 30 | 174 |
| 7 | AI Chat & Discovery | 9 | 40 | 214 |
| 8 | Auth, Watchlist, Ratings | 11 | 38 | 252 |
| 9 | Personal Stats & AI Insights | 6 | 25 | 277 |
| 10 | TMDB Enrichment | 6 | 22 | 299 |
| 11 | Testing & Quality | 7 | 28 | 327 |
| 12 | Deploy & Portfolio Polish | 9 | 27 | 354 |
| **Total** | | **105 tasks** | **~354 hrs** | |

At ~10 hrs/week (evenings + weekends): ~35 weeks / ~8 months
At ~20 hrs/week (dedicated push): ~18 weeks / ~4.5 months

### Parallelization Opportunities

- **Phases 3 + 4**: Backend and frontend can overlap once API contract (DTOs) is defined
- **Phase 5 + 6.1**: Start embedding generation (Python batch job, runs overnight) while building search UI
- **Phase 8 backend + Phase 9 backend**: Stats endpoints can start once user data endpoints are done, while frontend auth continues
- **Phase 10 TMDB enrichment**: Backend tasks (10.1-10.4) can start as early as Phase 3 and run in background
- **Phase 11 testing**: Best done incrementally during each phase, not all at the end. Phase 11 tasks are "fill gaps"
