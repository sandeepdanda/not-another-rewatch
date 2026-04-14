# Not Another Rewatch - Product Requirements

## 1. Vision

Movie discovery is broken. You open Netflix, scroll for 20 minutes, and end up rewatching The Office. IMDb has data but no personality. Letterboxd has community but no AI. Nobody combines rich movie data, smart recommendations, and personal tracking in one place.

Not Another Rewatch is a movie discovery and tracking platform that uses AI to help you find something new to watch. It knows ~45,000 movies (cleaned from a 600K raw dataset), understands natural language ("heist movies with dark humor"), learns your taste, and keeps a diary of everything you've watched.

It's also a learning vehicle: built with React/TypeScript, Java/Spring Boot, and DynamoDB - the same stack used at work.

## 2. User Personas

**The Casual Watcher** - Watches 2-3 movies a week. Spends more time browsing than watching. Wants: "just tell me what to watch tonight." Uses the AI chat and recommendations. Doesn't care about stats.

**The Film Enthusiast** - Watches 5+ movies a week. Tracks everything. Wants: diary, ratings, stats, lists. Imports their Letterboxd history. Cares about the "year in review" stats page. Uses search and filters heavily.

**The Data Nerd** - Wants to explore the dataset. Interested in trends: "which decade had the best sci-fi?" Likes the analytics and stats features. Appreciates the API docs and architecture.

**The Hiring Manager** - Visits the GitHub repo. Wants to see: clean architecture, real tests, live demo, architecture diagram, and a "Key Technical Decisions" section that shows the developer thinks about tradeoffs. Spends 2 minutes on the README, maybe clicks the demo link.

## 3. Feature Requirements by Phase

### Phase 1: Project Setup & DynamoDB Design

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F1.1 | Monorepo structure | As a developer, I can work on frontend and backend in one repo | `/backend`, `/frontend`, `/etl`, `/infra` directories exist with build configs | P0 |
| F1.2 | Docker dev environment | As a developer, I can start the full stack with one command | `docker compose up` starts LocalStack (DDB), Spring Boot API, React dev server | P0 |
| F1.3 | DynamoDB tables | As a developer, I have tables ready for movie data | MovieCatalog and UserActivity tables created in LocalStack with all GSIs (including email lookup GSI) | P0 |
| F1.4 | DDB schema documentation | As a developer, I can reference the data model | Access pattern matrix, PK/SK design, GSI definitions documented | P1 |
| F1.5 | Environment config | As a developer, I know what env vars are needed | `.env.example` lists all required variables (DB endpoint, OpenAI key, TMDB key, JWT secret) | P0 |

### Phase 2: ETL to DynamoDB

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F2.1 | Movie data load | As a developer, I have movies in DynamoDB | Verification script confirms 45,000+ movies loaded (after filtering corrupt/incomplete rows from raw dataset) with metadata, genres, cast, crew | P0 |
| F2.2 | Batch write pipeline | As a developer, the ETL handles DDB limits | Batch writes with 25-item limit, exponential backoff on throttling | P0 |
| F2.3 | Data verification | As a developer, I can verify the load was correct | Verification script checks item counts per entity type and spot-checks each access pattern | P1 |

### Phase 3: Java API Foundation

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F3.1 | Get movie by ID | As a user, I can view a movie's full details | `GET /api/v1/movies/{id}` returns title, overview, cast, crew, genres, stats. p95 <200ms | P0 |
| F3.2 | Browse movies | As a user, I can browse movies with pagination | `GET /api/v1/movies` returns cursor-paginated results (20 per page default) | P0 |
| F3.3 | Filter by genre | As a user, I can see movies in a specific genre | `GET /api/v1/movies?genre=Action` returns genre-filtered results via GSI | P0 |
| F3.4 | Filter by decade | As a user, I can browse movies by decade | `GET /api/v1/movies?decade=1990` returns decade-filtered results | P1 |
| F3.5 | Sort by rating/popularity | As a user, I can see top-rated or most popular movies | `GET /api/v1/movies?sort=rating` and `sort=popularity` work | P1 |
| F3.6 | Person filmography | As a user, I can see an actor's or director's movies | `GET /api/v1/persons/{id}` returns person info + filmography | P1 |
| F3.7 | List genres | As a user, I can see all available genres | `GET /api/v1/genres` returns genre list | P1 |
| F3.8 | API documentation | As a developer, I can explore the API | Swagger UI at `/swagger-ui.html` with all endpoints documented | P1 |
| F3.9 | Caching | As a user, repeated requests are fast | Caffeine cache on movie details, 30min TTL, <10ms for cached responses | P1 |
| F3.10 | Error handling | As a developer, errors are consistent | Global exception handler returns `{error, message, status}` JSON for all errors | P0 |
| F3.11 | Health check | As a deployer, I can verify the app is running | `GET /health` returns 200 with DDB connectivity status | P0 |

### Phase 4: React Frontend Foundation

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F4.1 | Home page | As a user, I see popular movies when I land on the site | Home page shows popular movies grid with poster placeholders | P0 |
| F4.2 | Movie detail page | As a user, I can view full movie info | Detail page shows overview, cast, crew, genres, rating, runtime, revenue | P0 |
| F4.3 | Browse page | As a user, I can browse and filter movies | Genre chips, decade filter, sort dropdown, results grid | P0 |
| F4.4 | Infinite scroll | As a user, more movies load as I scroll | `useInfiniteQuery` loads next page when scrolling near bottom | P0 |
| F4.5 | Skeleton loading | As a user, I see loading placeholders (not spinners) | Skeleton components for movie cards and detail page | P1 |
| F4.6 | Responsive design | As a user, the app works on mobile | Grid adapts: 1 col mobile, 2 col tablet, 4-5 col desktop | P0 |
| F4.7 | Dark mode | As a user, I can toggle dark mode | Theme toggle in header, preference saved to localStorage | P2 |
| F4.8 | Typed API client | As a developer, API calls are type-safe | API client with TypeScript interfaces matching backend DTOs | P1 |
| F4.9 | Error and empty states | As a user, I see helpful messages when things go wrong or are empty | All pages have: error state (retry button), empty state (helpful message + CTA), 404 page | P1 |

### Phase 5: Search & Filtering

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F5.1 | Title search | As a user, I can search movies by title | Search bar with debounced input, results appear as I type | P0 |
| F5.2 | Search results page | As a user, I see search results with filters | Results page with count, applied filters as removable chips | P0 |
| F5.3 | Combined filters | As a user, I can combine genre + year + rating filters | Multiple filters applied simultaneously, URL reflects filter state | P1 |
| F5.4 | Recent searches | As a user, I see my recent searches | Last 10 searches stored in localStorage, shown in search dropdown | P2 |

### Phase 6: AI Embeddings & Semantic Search

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F6.1 | Movie embeddings | As a system, all movies have vector embeddings | All usable movies embedded via OpenAI, stored in vector store. OpenAI spending limit set to $20/month | P0 |
| F6.2 | Semantic search | As a user, I can search by meaning, not just title | "movies about loneliness in space" returns relevant results | P0 |
| F6.3 | Similar movies | As a user, I see similar movies on every detail page | "Similar Movies" section shows 10 related movies | P0 |
| F6.4 | Search mode toggle | As a user, I can switch between title and AI search | Toggle in search bar between "Title" and "AI" modes | P1 |
| F6.5 | AI fallback | As a user, the app still works when AI is unavailable | Semantic search falls back to title search with a banner. Similar movies falls back to "popular in same genre" | P0 |

### Phase 7: AI Chat & Discovery

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F7.1 | Chat endpoint | As a user, I can chat with an AI movie expert | `POST /api/v1/chat` with SSE streaming returns grounded recommendations | P0 |
| F7.2 | Chat UI | As a user, I have a chat panel accessible from any page | Slide-out panel with message history, streaming display, movie cards inline | P0 |
| F7.3 | Grounded responses | As a user, the AI references real movies from the database | Every movie mentioned in chat has a valid movie ID that exists in the database | P0 |
| F7.4 | Suggested prompts | As a user, I see example prompts to get started | 4-5 starter prompts shown in empty chat state | P1 |
| F7.5 | Conversation memory | As a user, the chat remembers context within a session | Last 10 messages maintained in conversation context | P1 |
| F7.6 | Chat fallback | As a user, I see a message when chat is unavailable | When OpenAI is down, chat shows "Movie chat is temporarily unavailable. Try searching instead!" | P0 |

### Phase 8: Auth, Watchlist, Ratings

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F8.1 | Registration | As a user, I can create an account | `POST /api/v1/auth/register` with email + password. BCrypt hashing. Min 8 char password. Duplicate email returns 409 | P0 |
| F8.2 | Login | As a user, I can log in | `POST /api/v1/auth/login` returns JWT access (1h) + refresh (7d) tokens | P0 |
| F8.3 | Watchlist | As a user, I can add/remove movies from my watchlist | Watchlist button on movie cards and detail page, persisted in DDB | P0 |
| F8.4 | Ratings | As a user, I can rate movies (0.5-10 scale) | Star rating component on detail page, rating saved to DDB | P0 |
| F8.5 | Diary | As a user, I can log "I watched this on this date" | Diary entry modal with date picker and optional notes. Can delete entries | P1 |
| F8.6 | Profile page | As a user, I can see my watchlist, ratings, and diary | Tabbed profile page with all personal data | P1 |
| F8.7 | Public browsing | As a visitor, I can browse without logging in | Search, browse, movie details work without auth. Watchlist/ratings require login | P0 |

### Phase 9: Personal Stats & AI Insights

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F9.1 | Stats dashboard | As a user, I see my watching stats | Total watched, avg rating, genre breakdown, rating distribution | P0 |
| F9.2 | AI taste profile | As a user, the AI describes my taste | "You lean toward 90s sci-fi with ensemble casts" generated from ratings. Falls back to genre summary when AI is down | P1 |
| F9.3 | Personalized recs | As a user, I get recommendations based on my taste | "Recommended for you" section using taste embedding. Falls back to "popular in your top genres" when AI is down | P1 |
| F9.4 | Letterboxd import | As a user, I can import my Letterboxd history | CSV upload parses Letterboxd export, creates diary + rating entries in DDB | P2 |

### Phase 10: TMDB Enrichment

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F10.1 | Poster images | As a user, I see real movie posters | TMDB poster URLs stored in DDB, displayed on cards and detail pages. Fallback to colored placeholder | P0 |
| F10.2 | Trailers | As a user, I can watch trailers | YouTube trailer embed on movie detail page | P1 |
| F10.3 | Watch providers | As a user, I see where to stream a movie | "Watch on Netflix/Prime/etc." section from TMDB data | P1 |
| F10.4 | Background enrichment | As a system, data stays fresh | Daily scheduled job syncs popular movies from TMDB | P1 |

### Phase 11: Testing & Quality

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F11.1 | Backend unit tests | As a developer, service logic is tested | 80%+ line coverage on service layer (JaCoCo report). JUnit 5 + Mockito | P0 |
| F11.2 | Backend integration tests | As a developer, DDB access is tested | Repository tests with Testcontainers + LocalStack covering AP1-AP5 | P0 |
| F11.3 | Frontend component tests | As a developer, key components are tested | Vitest + RTL tests for MovieCard, SearchBar, RatingStars | P1 |
| F11.4 | E2E tests | As a developer, critical flows work end-to-end | 3-5 Playwright scenarios: search, detail, auth, watchlist | P1 |

### Phase 12: Deploy & Polish

| ID | Feature | User Story | Acceptance Criteria | Priority |
|----|---------|-----------|-------------------|----------|
| F12.1 | CI/CD pipeline | As a developer, PRs are automatically tested | GitHub Actions: build, test, deploy on merge to main | P0 |
| F12.2 | Live deployment | As a visitor, I can access the app online | Backend on Render, frontend on Vercel, DDB on AWS free tier | P0 |
| F12.3 | Architecture diagram | As a visitor, I understand the system at a glance | Mermaid diagram in README showing all components | P0 |
| F12.4 | Demo content | As a visitor, I can try the app without signing up | Public browse/search works without auth | P1 |
| F12.5 | Performance audit | As a developer, the app is fast | Lighthouse score >90, API p95 <500ms for non-AI endpoints | P1 |
| F12.6 | Key decisions in README | As a hiring manager, I see the developer thinks about tradeoffs | README has "Technical Decisions" section explaining DDB single-table, Spring AI, cursor pagination choices | P0 |

## 4. Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| Performance | API response (cached) | <50ms |
| Performance | API response (DDB query) | p95 <200ms |
| Performance | AI search/chat response | <3s (streaming starts <500ms) |
| Performance | Frontend initial load | <2s on 3G |
| Performance | Lighthouse performance score | >90 |
| Cost | Monthly total (infra + AI) | <$20/month |
| Accessibility | WCAG compliance | 2.1 AA |
| Responsiveness | Mobile support | Fully responsive, mobile-first |
| Data | Usable movie catalog size | ~45,000 movies (after cleaning) |
| Security | Password storage | BCrypt with salt, min 8 chars |
| Security | Auth tokens | JWT access (1h) in memory, refresh (7d) in httpOnly cookie |
| Security | API secrets | Environment variables only, never in code |
| Resilience | AI unavailable | All features degrade gracefully with non-AI fallbacks |

## 5. Out of Scope

- Social features (following users, activity feed, comments)
- TV show tracking (movies only)
- Mobile native apps (web only, responsive)
- User-generated reviews (personal notes only)
- Multi-language support (English only)
- Real-time collaborative features
- Payment/subscription features
- Data export (future consideration)
- Scrobbling from media players

## 6. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| OpenAI API costs spike | Budget exceeded | Low | Set $20/month hard spending limit in OpenAI dashboard. Cache AI responses. Use gpt-4o-mini |
| OpenAI API key exposure | Unauthorized charges | Medium | Key only in backend env vars, never in frontend. Set spending limit. Rotate key if exposed |
| DynamoDB single-table design is too complex | Slow development | Medium | Start with research doc's proven patterns. Fall back to simpler multi-table if stuck |
| Actual usable movie count is lower than expected | Thinner catalog | Medium | Audit data in Phase 2. Supplement with TMDB API enrichment in Phase 10 |
| TMDB API rate limits block enrichment | Phase 10 delayed | Low | Respect 40 req/sec limit, prioritize popular movies, enrich incrementally |
| Scope creep (especially on chat) | Project never finishes | High | Ship minimal chat first (no memory, just RAG + streaming). Iterate. Each phase has a clear "done" |
| Free tier limits hit | App goes down | Medium | Monitor usage. Disable AI features if budget exceeded. App works fully without AI |
