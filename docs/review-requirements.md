# Requirements Review

## Missing Requirements

**1. Graceful degradation when AI is down (CRITICAL)**
No requirement covers what happens when OpenAI API is unavailable or over budget. Add:
- F6.6 (P0): When AI is unavailable, semantic search falls back to title search with a banner "AI search temporarily unavailable"
- F7.6 (P0): When chat is unavailable, show a message instead of a broken UI
- F9.8 (P1): Taste profile and personalized recs degrade to "popular in your top genres" when AI is down

**2. Error, empty, and loading states**
F4.5 covers skeleton loading, but there's no requirement for:
- Empty states: "No movies match your filters", "Your watchlist is empty - start adding movies!", "No results for your search"
- Error states: API timeout, network error, 500 from backend
- Add F4.9 (P1): All data-fetching pages have error state (retry button) and empty state (helpful message + CTA)

**3. Health check endpoint**
No requirement for `GET /health` or `GET /api/v1/health`. Render and other platforms need this for deployment health checks.
- Add F3.11 (P0): Health check endpoint returns 200 with DDB connectivity status

**4. Data export**
Requirements mention Letterboxd import (F9.4) but no export. Users should own their data.
- Add F9.8 (P2): Export ratings, watchlist, and diary as CSV

**5. API rate limiting**
The NFR table mentions rate limits but no requirement implements them.
- Add F3.12 (P1): Rate limiting on all endpoints (values from design doc's security section)

**6. Logging and observability**
No requirement for structured logging, request tracing, or error tracking.
- Add F12.6 (P1): Structured JSON logging with request IDs, Sentry free tier for error tracking

**7. 404 page**
No requirement for handling unknown routes.
- Add F4.10 (P1): Custom 404 page with search bar and "popular movies" suggestions

## Contradictions

**1. F8.7 vs F7.1 auth scope**
F8.7 says "AI Chat" is public (no auth required), but the design doc's security section says chat is rate-limited at 10 req/min for unauthenticated users. This isn't contradictory but needs clarification - add to F7.1 acceptance criteria: "Unauthenticated users limited to 10 chat messages/min. Authenticated users get 30/min."

**2. NFR cost target vs AI cost estimate**
NFR says "<$10/month infrastructure" and "<$5/month AI". But the phase plan estimates $3-8/month for AI alone, and Render backend could be $7/month. Total could hit $15-20. Either raise the budget target to $20/month or specify that the free tier (Render free, DDB free tier) is the baseline.

## Acceptance Criteria Gaps

**F2.1** "All movies from Kaggle dataset loaded" - How many is "all"? Add: "Verification script confirms 45,000+ movies loaded (after filtering corrupt rows from the 600K raw dataset)"

**F3.1** "<50ms" - Is this p50, p95, or p99? Specify: "p95 response time <50ms for cached, <200ms for DDB query"

**F6.1** "600K embeddings generated" - Same issue as F2.1. The actual movie count after dedup/filtering will be less. Specify the verification method.

**F7.3** "RAG pipeline retrieves actual movie data" - How do you verify grounding? Add: "Every movie mentioned in chat response has a valid movie ID that exists in the database"

**F8.1** "BCrypt hashing" - Add: "Password minimum 8 characters. Email format validated. Duplicate email returns 409 Conflict."

**F11.1** "80%+ coverage on service layer" - Good, but add: "Coverage report generated and viewable in CI artifacts"

## Priority Issues

**F3.9 Caching (P2) should be P1.** Without caching, every movie detail page hits DDB. With 600K movies and any real traffic, you'll burn through RCUs fast. Caffeine is trivial to add and should be in the initial API.

**F4.7 Dark mode (P2) is correctly P2.** Don't spend time on this early.

**F5.4 Recent searches (P2) is correctly P2.** Nice polish but not essential.

**F12.5 Performance audit (P2) should be P1.** If the demo is slow, hiring managers bounce. Lighthouse audit should be part of the deploy checklist.

## Persona Gaps

**Hiring Manager persona needs more requirements:**
- F12.3 (architecture diagram) covers the README, but add:
- F12.7 (P0): README includes "Key Technical Decisions" section explaining why DDB single-table, why Spring AI, why cursor pagination - shows the developer thinks about tradeoffs
- F12.8 (P1): Code has meaningful comments on non-obvious decisions (not "// get movie" but "// Single DDB query returns all movie data via adjacency list pattern")

## Risk Gaps

**1. DynamoDB hot partitions (MEDIUM)**
Popular movies (Avengers, Godfather) will get disproportionate reads. With provisioned capacity, this could throttle.
Mitigation: Caffeine cache absorbs hot key reads. DDB adaptive capacity handles moderate skew. Monitor with CloudWatch.

**2. OpenAI API key exposure (HIGH)**
If the API key leaks via frontend or git, someone could run up a massive bill.
Mitigation: Key only in backend env vars, never in frontend. Set OpenAI spending limit ($20/month hard cap). Add to requirements.

**3. Embedding model deprecation (LOW)**
OpenAI could deprecate text-embedding-3-small. Re-embedding 600K movies costs $2.40 but takes time.
Mitigation: Store model version in metadata. Document the re-embedding process.

**4. TMDB API terms change (LOW)**
TMDB could restrict API access or change terms.
Mitigation: Cache all TMDB data in DDB. The app works without TMDB (just no posters/trailers).

**5. Scope creep on chat (HIGH)**
F7.1-F7.5 is the most complex feature. "Conversation memory", "tool use", "grounded responses" can each take weeks.
Mitigation: Ship a minimal chat first (no memory, no tool use, just RAG + streaming). Iterate.

## Recommendations

1. Add a "Phase 0.5" requirement: **F0.1 - Kaggle data audit.** Before building anything, verify the actual data quality. How many movies have complete metadata? How many have cast/crew? This affects every downstream estimate.
2. Add **graceful degradation requirements** for every AI feature (semantic search, chat, taste profile, recommendations). The app should be fully functional without AI - AI is an enhancement, not a dependency.
3. Bump caching (F3.9) to P1 and performance audit (F12.5) to P1.
4. Add an explicit **OpenAI spending limit** requirement and **API key security** requirement.
5. Clarify the actual movie count after filtering. "600K" is the raw CSV - the usable count is likely 45-50K after removing corrupt/incomplete rows.
