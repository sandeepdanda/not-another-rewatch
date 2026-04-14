# Tech Stack Research: Movie Database Full-Stack Evolution

> Research date: 2026-04-09
> Current state: PostgreSQL + Python (Pandas/SQLAlchemy) ETL pipeline, 600K+ movie records, SQL analytics, Power BI dashboards
> Goal: Evolve into a modern full-stack web app that's portfolio-impressive and solo-buildable

## Summary

| Layer | Recommendation | Runner-up | Why |
|-------|---------------|-----------|-----|
| API | **FastAPI** | Django REST | Async, auto-docs, Pydantic validation, best Python perf |
| Frontend | **Next.js (App Router)** | SvelteKit | React ecosystem, SSR/SSG, Vercel deployment, job market |
| Search | **Meilisearch** (Phase 2) | PostgreSQL FTS (Phase 1) | Start with PG FTS, add Meilisearch when search UX matters |
| Caching | **Redis** (cache-aside) | None | Simple, proven, great Docker Compose story |
| Containerization | **Docker Compose** | None | Industry standard for local multi-service dev |
| CI/CD | **GitHub Actions** | None | Free for public repos, tight GitHub integration |
| Backend Testing | **pytest + httpx** | None | FastAPI's native test story |
| Frontend Testing | **Vitest + React Testing Library** | Jest + RTL | Vitest is faster, native ESM, Vite-aligned |
| Deployment | **Render** (backend) + **Vercel** (frontend) | Railway | Best free tier balance for a split deployment |

---

## 1. API Layer: FastAPI vs Django REST vs Flask

### Comparison

| Criteria | FastAPI | Django REST | Flask |
|----------|---------|-------------|-------|
| Performance | ~3,000+ RPS (async native, ASGI) | ~800-1,200 RPS (sync default) | ~600-900 RPS (sync, WSGI) |
| Auto API docs | Yes (Swagger + ReDoc built-in) | Yes (via drf-spectacular) | No (needs flask-restx) |
| Data validation | Pydantic v2 (built-in) | Serializers (verbose) | Manual or marshmallow |
| Async support | Native | Added in Django 4.1+ but not idiomatic | Limited (via quart) |
| Learning curve | Low (if you know Python type hints) | Medium (ORM, serializers, viewsets) | Low |
| Ecosystem size | Growing fast | Massive (mature) | Massive (mature) |
| Auth/Admin | DIY or fastapi-users | Built-in (admin panel, auth, permissions) | DIY |
| SQLAlchemy compat | Excellent (you already use it) | Uses Django ORM instead | Excellent |

### Verdict: FastAPI

- You already use SQLAlchemy and Pandas - FastAPI works with both natively, no ORM migration needed.
- Auto-generated OpenAPI docs are a portfolio differentiator (reviewers can interact with your API immediately).
- Pydantic v2 validation is fast and type-safe - catches bugs at the boundary.
- Async support means you can do concurrent DB queries and external API calls (TMDB, OMDB) without blocking.
- Django REST would force you to abandon SQLAlchemy for Django ORM - unnecessary migration cost for a solo project.

### Key libraries

```
fastapi>=0.115
uvicorn[standard]>=0.30
sqlalchemy>=2.0 (already have)
alembic>=1.13 (DB migrations)
pydantic>=2.0
python-jose[cryptography] (JWT auth)
passlib[bcrypt] (password hashing)
httpx (async HTTP client for external APIs)
```

---

## 2. Frontend: React vs Next.js vs SvelteKit

### Comparison

| Criteria | React (Vite) | Next.js 15+ | SvelteKit 2 |
|----------|-------------|-------------|-------------|
| Rendering | CSR only | SSR, SSG, ISR, RSC | SSR, SSG, CSR |
| Bundle size | Medium | Medium-large | Small (compiled) |
| SEO | Poor (CSR) | Excellent (SSR/SSG) | Excellent |
| Job market | Huge | Huge (subset of React) | Small but growing |
| Learning curve | Low | Medium | Low |
| Deployment | Any static host | Vercel (optimized), others work | Any (Vercel, Netlify, Node) |
| State management | Redux/Zustand/Jotai | Built-in (Server Components) | Built-in (stores) |
| Portfolio signal | "Knows React" | "Knows React + production patterns" | "Explores modern tools" |

### Verdict: Next.js (App Router)

- SSR/SSG means movie pages are SEO-friendly and fast on first load - critical for a content-heavy app.
- Server Components reduce client-side JS - movie detail pages can fetch data server-side with zero client bundle cost.
- Image optimization built-in (`next/image`) - important for movie posters.
- Vercel deployment is free and zero-config for Next.js.
- React ecosystem means access to thousands of UI libraries (shadcn/ui, Radix, Framer Motion).
- Job market relevance: Next.js is the most in-demand React framework in 2025-2026.

SvelteKit is technically superior in bundle size and DX, but the React ecosystem and job market make Next.js the pragmatic choice for a portfolio project.

### Key libraries

```
next@15
react@19
tailwindcss@4 (utility-first CSS)
shadcn/ui (accessible component library, not a dependency - copies components into your project)
@tanstack/react-query (client-side data fetching + caching)
zustand (lightweight state management if needed)
```

---

## 3. Search: PostgreSQL FTS vs Elasticsearch vs Meilisearch

### Comparison

| Criteria | PostgreSQL FTS | Elasticsearch | Meilisearch |
|----------|---------------|---------------|-------------|
| Setup complexity | Zero (already have PG) | High (JVM, cluster config) | Low (single binary, Docker) |
| Memory usage | Minimal (uses PG) | 2-4 GB minimum | 100-500 MB |
| Typo tolerance | No | Yes (fuzzy queries) | Yes (built-in, excellent) |
| Faceted search | Manual (GROUP BY) | Yes (aggregations) | Yes (built-in) |
| Relevance tuning | Limited (ts_rank) | Extensive (BM25, boosting) | Good (ranking rules) |
| Real-time indexing | Yes (triggers) | Near real-time | Near real-time |
| Scale needed | Any | 1M+ documents | 10M+ documents |
| Portfolio signal | "Knows PG deeply" | "Enterprise search" | "Modern search UX" |

### Verdict: Two-phase approach

**Phase 1 - PostgreSQL FTS (start here)**
- Zero additional infrastructure. You already have PostgreSQL.
- For 600K movies, PG FTS with GIN indexes handles search in <50ms.
- Demonstrates deep PostgreSQL knowledge.

```sql
-- Add tsvector column and GIN index
ALTER TABLE movies ADD COLUMN search_vector tsvector;
UPDATE movies SET search_vector = to_tsvector('english', title || ' ' || COALESCE(overview, ''));
CREATE INDEX idx_movies_search ON movies USING GIN(search_vector);

-- Query with ranking
SELECT title, ts_rank(search_vector, query) AS rank
FROM movies, to_tsquery('english', 'inception') query
WHERE search_vector @@ query
ORDER BY rank DESC LIMIT 20;
```

**Phase 2 - Meilisearch (when you want search UX polish)**
- Typo tolerance out of the box ("Incpetion" still finds "Inception").
- Faceted filtering by genre, year, rating - built-in, no custom code.
- Sub-50ms search with instant results as you type.
- Runs as a single Docker container, ~200MB RAM for 600K docs.
- Their official demo dataset IS a movie database - perfect fit.
- Python SDK: `meilisearch-python`.

Skip Elasticsearch entirely. It's overkill for this scale and eats 2-4GB RAM just idling. Meilisearch gives you a better search UX with 1/10th the operational burden.

---

## 4. Redis Caching Strategies

### Recommended pattern: Cache-aside (lazy loading)

Best fit for a movie database because:
- Movie data is read-heavy, write-light (movies don't change often).
- Cache misses are acceptable (first request hits DB, subsequent ones hit cache).
- Simple to implement and reason about.

### What to cache

| Data | TTL | Key pattern | Why |
|------|-----|-------------|-----|
| Movie detail | 24h | `movie:{id}` | Rarely changes, frequently accessed |
| Search results | 1h | `search:{hash(query+filters)}` | Same searches repeat often |
| Genre list | 24h | `genres:all` | Static reference data |
| Top movies (by rating/revenue) | 6h | `top:{category}:{limit}` | Expensive aggregation query |
| User session | 30min | `session:{token}` | Auth state |

### Implementation with FastAPI

```python
import redis.asyncio as redis
import json
import hashlib

redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

async def get_movie(movie_id: int) -> dict:
    cache_key = f"movie:{movie_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    movie = await db.fetch_movie(movie_id)  # DB query
    await redis_client.setex(cache_key, 86400, json.dumps(movie))
    return movie
```

### Cache invalidation

- Use TTL-based expiration for most data (simple, good enough for a movie DB).
- For admin updates (adding/editing movies), explicitly delete the cache key after write.
- Don't cache paginated list endpoints - the combinatorial explosion of page+sort+filter makes cache hit rates too low.

### Redis memory estimate for 600K movies

- Average movie JSON: ~2KB
- If 10% are "hot" (60K movies cached): ~120MB
- Search result cache (1000 queries): ~5MB
- Total: ~125MB - well within a free Redis tier or small container.

---

## 5. Docker Compose Setup

### Architecture

```mermaid
graph LR
    A[Next.js :3000] --> B[FastAPI :8000]
    B --> C[PostgreSQL :5432]
    B --> D[Redis :6379]
    B --> E[Meilisearch :7700]
```

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: moviedb
      POSTGRES_USER: moviedb
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./sql/indexes.sql:/docker-entrypoint-initdb.d/02-indexes.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moviedb"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://moviedb:localdev@db:5432/moviedb
      REDIS_URL: redis://redis:6379
      MEILISEARCH_URL: http://search:7700
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  search:
    image: getmeili/meilisearch:v1.12
    ports:
      - "7700:7700"
    environment:
      MEILI_ENV: development
      MEILI_NO_ANALYTICS: true
    volumes:
      - meilidata:/meili_data

volumes:
  pgdata:
  meilidata:
```

### Key decisions

- Alpine images for smaller footprint.
- Health checks so services start in the right order.
- Volume mounts for hot-reload during development.
- Meilisearch included but optional - comment it out for Phase 1.
- `asyncpg` driver for FastAPI async DB access.

---

## 6. GitHub Actions CI/CD

### Workflow: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run test -- --coverage

  docker-build:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

### What this gives you

- Backend tests run against real PostgreSQL and Redis (not mocks).
- Frontend lint + test in parallel with backend.
- Docker build validates that containers still build after changes.
- Free for public repos (2,000 minutes/month for private).

---

## 7. Testing Frameworks

### Backend: pytest + httpx

FastAPI's recommended testing stack. Use `httpx.AsyncClient` with `app.dependency_overrides` for clean test isolation.

| Tool | Purpose |
|------|---------|
| `pytest` | Test runner, fixtures, parametrize |
| `httpx` | Async test client for FastAPI |
| `pytest-asyncio` | Async test support |
| `pytest-cov` | Coverage reporting |
| `factory-boy` | Test data factories (movies, users) |
| `testcontainers` | Spin up real PG/Redis in tests (optional, for integration tests) |

```python
# Example: test movie endpoint
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_get_movie(client):
    response = await client.get("/api/movies/1")
    assert response.status_code == 200
    assert "title" in response.json()
```

### Frontend: Vitest + React Testing Library

Vitest over Jest because:
- 10-20x faster startup (native ESM, no transform overhead).
- Compatible with Vite (which Next.js can use via `next --turbo`).
- Same API as Jest - zero learning curve if you know Jest.

| Tool | Purpose |
|------|---------|
| `vitest` | Test runner (Jest-compatible API) |
| `@testing-library/react` | Component testing by user behavior |
| `@testing-library/user-event` | Simulate real user interactions |
| `msw` (Mock Service Worker) | Mock API responses at the network level |
| `@playwright/test` | E2E tests (optional, Phase 2) |

```typescript
// Example: test movie card component
import { render, screen } from '@testing-library/react';
import { MovieCard } from './MovieCard';

test('renders movie title and year', () => {
  render(<MovieCard title="Inception" year={2010} rating={8.8} />);
  expect(screen.getByText('Inception')).toBeInTheDocument();
  expect(screen.getByText('2010')).toBeInTheDocument();
});
```

### Test strategy for a solo project

Focus testing effort where it matters most:

1. **API endpoints** (high value) - every CRUD endpoint, auth flows, error cases
2. **Data layer** (high value) - SQLAlchemy queries return correct data, migrations work
3. **Key UI components** (medium value) - search bar, movie cards, filters
4. **E2E happy paths** (low priority, Phase 2) - search a movie, view details, add to watchlist

Skip testing: CSS styling, third-party library internals, static pages.

---

## 8. Deployment Options

### Free tier comparison (as of early 2026)

| Platform | Free tier | Backend support | DB included | Sleep on idle | Best for |
|----------|-----------|----------------|-------------|---------------|----------|
| **Render** | 750 hrs/month, 512MB RAM | Yes (Docker, Python) | PostgreSQL (free, 1GB, 90-day expiry) | Yes (spins down after 15min) | Backend API + DB |
| **Railway** | $5/month credit (Hobby plan) | Yes (Docker, Python) | PostgreSQL (from credit) | No | Backend if you want always-on |
| **Vercel** | Unlimited (Hobby) | Serverless functions only | No (use external) | N/A (serverless) | Next.js frontend |
| **Fly.io** | $5 credit (one-time) | Yes (Docker) | PostgreSQL (3GB free) | Yes | Global distribution |

### Recommended deployment architecture

```mermaid
graph LR
    U[User] --> V[Vercel - Next.js frontend]
    V --> R[Render - FastAPI backend]
    R --> P[Render - PostgreSQL]
    R --> RE[Render - Redis]
```

**Frontend: Vercel (free)**
- Zero-config Next.js deployment.
- Automatic preview deployments on PRs.
- Edge network for fast global delivery.
- Free forever on Hobby plan.

**Backend + DB: Render (free tier)**
- Deploy FastAPI as a Docker web service.
- Free PostgreSQL instance (1GB, enough for 600K movies).
- Free Redis instance (25MB, enough for hot cache).
- Caveat: free tier sleeps after 15 min idle - first request takes 30-50s to cold start. Acceptable for a portfolio project.

**Alternative: Railway ($5/month)**
- If the Render cold start bothers you, Railway's Hobby plan ($5/month) keeps services running.
- Better DX (instant deploys, built-in logs).
- $5 credit covers a small FastAPI + PostgreSQL + Redis setup.

### Why not Fly.io?

- One-time $5 credit (not monthly) - runs out fast with multiple services.
- More configuration needed (fly.toml, Dockerfile tweaks).
- Better for always-on production apps, overkill for a portfolio project.

---

## 9. Recommended Project Structure

```
movie-database/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Settings via pydantic-settings
│   │   ├── database.py          # SQLAlchemy async engine + session
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   │   ├── movies.py
│   │   │   ├── search.py
│   │   │   └── auth.py
│   │   ├── services/            # Business logic
│   │   ├── cache.py             # Redis caching layer
│   │   └── deps.py              # Dependency injection
│   ├── tests/
│   ├── alembic/                 # DB migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Home / search
│   │   ├── movies/[id]/page.tsx # Movie detail (SSR)
│   │   └── api/                 # BFF routes if needed
│   ├── components/
│   ├── lib/                     # API client, utils
│   ├── __tests__/
│   ├── Dockerfile
│   └── package.json
├── etl/                         # Existing ETL scripts
├── sql/                         # Existing SQL scripts
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 10. Implementation Roadmap

### Phase 1: API + Basic Frontend (2-3 weeks)

- [ ] Set up FastAPI with SQLAlchemy async, Alembic migrations
- [ ] CRUD endpoints for movies, genres, actors
- [ ] PostgreSQL full-text search endpoint
- [ ] Redis caching for movie details
- [ ] Docker Compose for local dev
- [ ] Next.js frontend with movie list, search, detail pages
- [ ] GitHub Actions CI pipeline
- [ ] Deploy to Render + Vercel

### Phase 2: Polish + Advanced Features (2-3 weeks)

- [ ] User auth (JWT) with watchlist/favorites
- [ ] Meilisearch integration with typo tolerance and faceted filtering
- [ ] Pagination, sorting, filtering UI
- [ ] Movie poster images via TMDB API
- [ ] Rate limiting and error handling
- [ ] E2E tests with Playwright

### Phase 3: Portfolio Differentiators (1-2 weeks)

- [ ] API rate limiting dashboard
- [ ] Search analytics (what people search for)
- [ ] Recommendation engine (simple collaborative filtering)
- [ ] Performance monitoring (response times, cache hit rates)
- [ ] Comprehensive README with architecture diagram, screenshots, demo link

---

## 11. Portfolio Impact Assessment

What makes this project stand out to reviewers:

| Signal | How this project demonstrates it |
|--------|----------------------------------|
| System design | Multi-service architecture (API, DB, cache, search) |
| Data engineering | ETL pipeline, 600K records, normalized schema |
| Backend depth | Async Python, caching strategies, search optimization |
| Frontend competence | SSR, responsive UI, real-time search |
| DevOps awareness | Docker Compose, CI/CD, multi-platform deployment |
| Testing discipline | Backend + frontend tests, coverage reports |
| Documentation | Architecture diagrams, API docs (auto-generated), clear README |

The combination of data engineering (existing) + full-stack web (new) + DevOps (Docker/CI/CD) covers more surface area than most portfolio projects, which tend to be frontend-only or CRUD-only.

---

## Sources

- [FastAPI vs Django REST vs Flask - Ingenious Minds Lab](https://ingeniousmindslab.com/blogs/fastapi-django-flask-comparison-2025/) - accessed 2026-04-09
- [FastAPI vs Flask vs Django Performance Benchmarks](https://dev-faizan.medium.com/fastapi-vs-flask-vs-django-performance-benchmarks-and-when-to-use-each-5d542ec9f2a5) - accessed 2026-04-09
- [The 2025 Framework Decision Matrix](https://buildsmartengineering.substack.com/p/django-vs-fastapi-vs-flask-the-2025) - accessed 2026-04-09
- [PostgreSQL Full-Text Search vs Elasticsearch](https://www.paradedb.com/blog/elasticsearch-vs-postgres) - accessed 2026-04-09
- [PostgreSQL FTS: Alternative to Elasticsearch for Small-Medium Apps](https://iniakunhuda.medium.com/postgresql-full-text-search-a-powerful-alternative-to-elasticsearch-for-small-to-medium-d9524e001fe0) - accessed 2026-04-09
- [Meilisearch Comparison to Alternatives](https://www.meilisearch.com/docs/learn/resources/comparison_to_alternatives) - accessed 2026-04-09
- [When does Postgres stop being good enough for FTS - Meilisearch](https://www.meilisearch.com/blog/postgres-full-text-search-limitations) - accessed 2026-04-09
- [Redis Caching Movie App](https://www.redis.io/learn/howtos/solutions/caching-architecture/common-caching/caching-movie-app) - accessed 2026-04-09
- [Redis Query Caching for Microservices](https://redis.io/learn/howtos/solutions/microservices/caching) - accessed 2026-04-09
- ⚠️ External link - [AWS Database Caching Strategies Using Redis](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html) - accessed 2026-04-09
- [Redis Caching Patterns Complete Guide](https://nerdleveltech.com/redis-caching-patterns-the-complete-guide-for-scalable-systems) - accessed 2026-04-09
- [Next.js vs SvelteKit - Descope](https://www.descope.com/blog/post/nextjs-vs-reactjs-vs-sveltekit) - accessed 2026-04-09
- [JavaScript Framework Comparison 2025](https://calmops.com/programming/javascript/javascript-framework-comparison/) - accessed 2026-04-09
- [SvelteKit vs Next.js - Windframe](https://windframe.dev/blog/sveltekit-vs-nextjs) - accessed 2026-04-09
- [Testing FastAPI with Pytest - Pytest with Eric](https://pytest-with-eric.com/pytest-advanced/pytest-fastapi-testing/) - accessed 2026-04-09
- [FastAPI Testing Strategies](https://blog.greeden.me/en/2025/11/04/fastapi-testing-strategies-to-raise-quality-pytest-testclient-httpx-dependency-overrides-db-rollbacks-mocks-contract-tests-and-load-testing/) - accessed 2026-04-09
- [Vercel Pricing](https://vercel.com/pricing) - accessed 2026-04-09
- [Railway Pricing](https://station.railway.com/feedback/pricing-question-7d2fda9a) - accessed 2026-04-09
- [Vercel vs Railway vs Render 2026](https://designrevision.com/blog/saas-hosting-compared) - accessed 2026-04-09
- [Python Hosting Options Comparison](https://www.nandann.com/blog/python-hosting-options-comparison) - accessed 2026-04-09
- [FastAPI React Docker Boilerplate](https://github.com/Nowado/fastapi-react-boilerplate) - accessed 2026-04-09
