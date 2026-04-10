# Task Breakdown Review

## Missing Tasks

**1. No task for user lookup by email (auth dependency)**
F8.2 (login) needs to find a user by email, but the DDB schema only has `PK=USER#<id>`. Task 8.1.2 creates the register endpoint but doesn't mention creating a GSI for email lookup.
- Add task: **8.0.1** "Add GSI4 on UserActivity for email lookup" (S) before 8.1.2

**2. No task for health check endpoint**
Missing from requirements too, but critical for deployment (Phase 12).
- Add task: **3.1.4** "Add GET /health endpoint with DDB connectivity check" (S)

**3. No task for environment/secret management**
No task covers setting up `.env` files, documenting required env vars, or configuring secrets for deployment.
- Add task: **1.2.4** "Create .env.example with all required env vars (DB endpoint, OpenAI key, TMDB key, JWT secret)" (S)
- Add task: **12.2.5** "Configure Render/Vercel environment variables for production" (S)

**4. No task for structured logging**
No logging configuration task anywhere. Spring Boot defaults are fine for dev but production needs structured JSON logs.
- Add task: **12.2.6** "Configure structured JSON logging (logback-spring.xml) with request ID correlation" (S)

**5. No task for error boundaries (frontend)**
No task for React error boundaries, which prevent full-app crashes.
- Add task: **4.1.4** "Add React ErrorBoundary at app and feature level" (S)

**6. No task for 404 page**
- Add task: **4.4.4** "Create 404 catch-all route with search bar and popular movies" (S)

**7. No task for OpenAI spending limit**
- Add task: **6.0.1** "Set OpenAI API spending limit ($20/month hard cap) and configure alerts" (S)

**8. Requirement F3.10 (error handling) has a task (3.1.2) but F3.12 (rate limiting) has no task**
- Add task: **3.1.5** "Add rate limiting filter (bucket4j or Spring filter) with per-endpoint limits" (M)

## Estimate Accuracy Issues

**Task 7.1.1 "Chat endpoint with SSE streaming" (L = 6-10 hrs)**
This is underestimated. SSE streaming from Spring Boot with Spring AI, including error handling, timeout management, and proper event formatting, is complex. First time doing SSE in Java adds learning overhead.
- Recommendation: Split into two tasks:
  - 7.1.1a "Basic SSE streaming endpoint with hardcoded response" (M) - get the plumbing working
  - 7.1.1b "Integrate Spring AI ChatClient with streaming" (M) - connect to OpenAI

**Task 7.1.2 "RAG pipeline" (L = 6-10 hrs)**
Also underestimated. RAG involves: query embedding, vector search, context assembly, prompt construction, response parsing for movie IDs. Each step has edge cases.
- Recommendation: Keep as L but note it could stretch to 12-15 hrs. Consider splitting context assembly from the full pipeline.

**Task 4.3.1 "Movie detail page" (L = 6-10 hrs)**
Reasonable for a first pass, but this is the most complex frontend page (hero section, metadata, cast carousel, crew list, genre tags, action buttons). Could stretch.
- Recommendation: Keep as L, but if it goes over 10 hrs, split cast/crew into a separate task.

**Task 6.1.2 "Batch embed via OpenAI API" (M = 3-5 hrs)**
Underestimated. Handling 600K items in batches of 2048, with rate limiting, progress tracking, resume-on-failure, and error handling is more than 5 hours.
- Recommendation: Upgrade to L (6-10 hrs)

**Task 1.3.2 "Create DDB entity Java classes" (M = 3-5 hrs)**
With 6+ entity types, each needing `@DynamoDbBean` annotations, GSI key attributes, and proper type mapping, this is closer to L.
- Recommendation: Upgrade to L, or split into "Movie entities" (M) and "User entities" (S)

**Task 8.3.4 "Rating stars component" (M = 3-5 hrs)**
Half-star rating with hover preview, click-to-save, optimistic update, and login prompt is actually complex UI work.
- Recommendation: Keep as M but note it's on the high end.

## Dependency Gaps

**Task 3.2.5 (MovieController) depends on 3.2.1-3.2.4 AND 3.2.6**
But 3.2.6 (DTOs) is listed after 3.2.5. DTOs should be created first since the repository and service layers use them.
- Fix: Move 3.2.6 before 3.2.1, or at least mark it as a dependency of 3.2.1.

**Task 5.1.1 (Title search endpoint) has no dependency on search index setup**
If using an in-memory trie, it needs to be populated from DDB on startup. If using a DDB GSI on title, that GSI needs to exist (should be in Phase 1 table creation).
- Fix: Add dependency on 1.2.2 (table init script) and note that the title GSI must be included.

**Task 6.2.1 (Semantic search endpoint) depends on 6.1.3 AND Spring AI config**
But there's no task for configuring Spring AI (adding OpenAI API key config, creating the ChatClient/EmbeddingClient beans).
- Fix: Add task **6.0.2** "Configure Spring AI with OpenAI API key and embedding client bean" (S) as a dependency for 6.2.1.

**Task 8.3.1 (Auth context) depends on 8.1.1-8.1.4 (backend auth)**
This is correctly implied but not explicitly listed. The frontend auth can't be tested without the backend auth endpoints.
- Fix: Make the dependency explicit.

**Task 9.1 (Stats aggregation) depends on 8.2.1-8.2.3 but also needs test data**
You can't test stats without having some ratings/watchlist/diary entries. Either seed test data or depend on the E2E auth flow.
- Fix: Add a note that test data seeding is needed, or add a task for a data seeding script.

## Acceptance Criteria Quality

**Task 2.2.2** "loads all movies, cast, crew, genres, persons into LocalStack DDB"
- Too vague. Add: "Verification script (task 2.2.3) passes. Console output shows item counts per entity type matching expected values."

**Task 3.5.2** "Load test data, verify all query patterns"
- Which query patterns? List them: "AP1 (movie by ID), AP2 (movies by genre), AP3 (person filmography), AP4 (movie cast), AP5 (movies by decade)"

**Task 7.2.2** "Tokens appear as they arrive"
- How to verify streaming works? Add: "Open browser DevTools Network tab, observe SSE events arriving incrementally (not all at once)"

**Task 11.1** "Fill gaps in service layer tests. Target 80%+ line coverage"
- How to measure? Add: "JaCoCo coverage report generated by `mvn test`. Report shows >80% line coverage on `*Service.java` classes"

**Task 12.8** "Architecture diagram (mermaid), demo GIF, 'Try it live' link"
- This is 3 separate deliverables crammed into one task. Split:
  - 12.8a "Create mermaid architecture diagram for README" (S)
  - 12.8b "Record demo GIF showing search, chat, and watchlist flows" (S)
  - 12.8c "Add 'Try it live' link, tech stack badges, setup instructions to README" (S)

## Task Granularity Issues

**Too big - should split:**
- 7.1.1 "Chat endpoint with SSE streaming" (L) - split into plumbing + AI integration (see above)
- 12.8 "README overhaul" (M) - split into 3 tasks (see above)
- 11.1 "Backend unit test coverage pass" (L) - split by feature: movie tests, auth tests, AI tests

**Could merge:**
- 1.1.1 + 1.1.4 (monorepo structure + gitignore/editorconfig) - these take 30 min combined, not 2 separate tasks
- 3.1.2 + 3.1.3 (exception handler + pagination utils) - both are small shared utilities, do them together
- 10.6 + 10.7 (trailer embed + watch providers) - both are small additions to the detail page

## Ordering Issues

**Phase 3: DTOs should come first**
Task 3.2.6 (MovieResponse DTOs) is listed last but should be first in Story 3.2. The repository and service layers need these types to compile.
- Fix: Reorder to 3.2.6 -> 3.2.1 -> 3.2.2 -> 3.2.3 -> 3.2.4 -> 3.2.5

**Phase 8: Backend auth should complete before any frontend auth work**
This is implied by the phase ordering but within Phase 8, Story 8.1 (backend) should be fully done before Story 8.3 (frontend) starts. Story 8.2 (user data endpoints) can parallel with 8.3.
- Fix: Make this explicit in the parallelization notes.

## Additional Parallelization Opportunities

**Phase 5 backend + Phase 6 embedding generation**
Task 6.1.1-6.1.2 (build embedding text, batch embed) are Python scripts that don't depend on the search backend. Start embedding generation while building Phase 5 search.

**Phase 8 backend auth + Phase 9 stats backend**
Stats endpoints (9.1-9.3) depend on user data existing but not on the frontend auth flow. The backend work for Phase 9 can start as soon as Phase 8 backend (Story 8.1-8.2) is done, while Phase 8 frontend (Story 8.3) continues in parallel.

**Phase 10 TMDB enrichment is fully independent**
TMDB enrichment (10.1-10.4) only depends on having movies in DDB (Phase 2). It could start as early as Phase 3 and run in the background. The frontend tasks (10.5-10.7) depend on Phase 4.

**Phase 11 testing should be continuous**
Rather than a dedicated testing phase, tests should be written alongside each phase. The Phase 11 tasks are really "fill coverage gaps" tasks. Note this in the doc.

## Missing Infrastructure Tasks

1. **1.2.4** ".env.example with all required environment variables" (S)
2. **3.1.4** "Health check endpoint" (S)
3. **3.1.5** "Rate limiting configuration" (M)
4. **6.0.1** "OpenAI spending limit and alerts" (S)
5. **6.0.2** "Spring AI configuration (beans, API key)" (S)
6. **8.0.1** "GSI4 for email lookup on UserActivity" (S)
7. **12.2.5** "Production environment variable configuration" (S)
8. **12.2.6** "Structured logging configuration" (S)

These add ~8 tasks and ~12 hours. Revised total: **~119 tasks, ~405 hours.**

## Summary of Changes

| Category | Count | Impact |
|----------|-------|--------|
| Missing tasks to add | 8 | +12 hrs |
| Estimates to increase | 3 | +8 hrs |
| Tasks to split | 3 | +4 tasks, same hours |
| Tasks to merge | 3 pairs | -3 tasks |
| Dependency fixes | 5 | No hour change |
| Reordering fixes | 2 | No hour change |
| Acceptance criteria to sharpen | 4 | No hour change |

Net change: ~119 tasks, ~405 hours (from 111 tasks, 393 hours).
