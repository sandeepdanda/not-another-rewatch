# Backend Architecture Research: Spring Boot Movie Database API

> Research date: 2026-04-09
> Context: Evolving a 600K+ movie database from Python/PostgreSQL ETL to a Spring Boot REST API with DynamoDB, OpenAI integration, and TMDB enrichment.
> Goal: Level up Spring Boot skills while building a portfolio-grade backend.

## Table of Contents

1. [Spring Boot 3.x + Java 21 Features](#1-spring-boot-3x--java-21-features)
2. [Project Structure](#2-project-structure)
3. [AWS SDK v2 for DynamoDB](#3-aws-sdk-v2-for-dynamodb)
4. [OpenAI Integration from Java](#4-openai-integration-from-java)
5. [Caching Strategies](#5-caching-strategies)
6. [API Design Patterns](#6-api-design-patterns)
7. [Testing Strategy](#7-testing-strategy)
8. [Background Job Scheduling](#8-background-job-scheduling)
9. [Security - Spring Security with JWT](#9-security---spring-security-with-jwt)
10. [Recommended Dependencies](#10-recommended-dependencies)
11. [Sources](#sources)

---

## 1. Spring Boot 3.x + Java 21 Features

### Virtual Threads (Project Loom)

The single highest-impact Java 21 feature for this project. Virtual threads are lightweight threads managed by the JVM, not the OS. They make blocking I/O (DynamoDB calls, OpenAI API calls, TMDB fetches) massively concurrent without reactive complexity.

**Enable with one property:**
```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

**What this does:** Spring Boot 3.2+ routes all Tomcat request handling to virtual threads. Each incoming HTTP request gets its own virtual thread. When that thread blocks on a DynamoDB call or OpenAI HTTP request, the JVM parks it (near-zero cost) and reuses the carrier thread for other work.

**Benchmarks from community testing (2025):**
- Traditional thread pool (200 threads): ~200 concurrent requests before exhaustion
- Virtual threads: 10,000+ concurrent requests on the same hardware
- Memory per virtual thread: ~1KB vs ~1MB for platform threads

**When NOT to use:** CPU-bound work (parallel stream processing, heavy computation). Virtual threads help with I/O-bound workloads only.

**Gotcha:** Avoid `synchronized` blocks that do I/O inside them - they pin the carrier thread. Use `ReentrantLock` instead.

```java
// BAD - pins carrier thread
synchronized (lock) {
    dynamoDbTable.getItem(key); // I/O inside synchronized
}

// GOOD - virtual-thread friendly
private final ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    dynamoDbTable.getItem(key);
} finally {
    lock.unlock();
}
```

### Records

Java records are ideal for DTOs, API responses, and DynamoDB query results. They're immutable, have auto-generated `equals`/`hashCode`/`toString`, and reduce boilerplate.

```java
// API response DTO
public record MovieResponse(
    String id,
    String title,
    int releaseYear,
    double rating,
    List<String> genres
) {}

// Pagination wrapper
public record PagedResponse<T>(
    List<T> items,
    String nextToken,
    int totalCount
) {}

// Search request
public record MovieSearchRequest(
    String query,
    @Nullable String genre,
    @Nullable Integer yearFrom,
    @Nullable Integer yearTo,
    int limit
) {
    public MovieSearchRequest {
        if (limit <= 0 || limit > 100) limit = 20; // compact constructor validation
    }
}
```

**DynamoDB Enhanced Client + Records:** The Enhanced Client supports immutable classes via `@DynamoDbImmutable`. Records work with this pattern, but you need a builder class (records don't have one natively). Use Lombok `@Builder` on a record-like immutable class, or use records for DTOs and regular beans for DynamoDB entities.

### Pattern Matching and Sealed Classes

Useful for modeling domain states and API error handling:

```java
// Sealed interface for movie source types
public sealed interface MovieSource permits TmdbSource, ManualSource, ImportedSource {
    String sourceId();
}
public record TmdbSource(String sourceId, int tmdbId) implements MovieSource {}
public record ManualSource(String sourceId, String addedBy) implements MovieSource {}
public record ImportedSource(String sourceId, String fileName) implements MovieSource {}

// Pattern matching in error handling
public ResponseEntity<?> handleResult(Result result) {
    return switch (result) {
        case Success s -> ResponseEntity.ok(s.data());
        case NotFound n -> ResponseEntity.status(404).body(n.message());
        case ValidationError v -> ResponseEntity.badRequest().body(v.errors());
    };
}
```

### Summary: Java 21 Features to Use

| Feature | Use Case in This Project | Priority |
|---------|-------------------------|----------|
| Virtual threads | All I/O: DynamoDB, OpenAI, TMDB calls | Must-have |
| Records | DTOs, API requests/responses, value objects | Must-have |
| Pattern matching (switch) | Error handling, polymorphic responses | Nice-to-have |
| Sealed classes | Domain modeling (movie sources, enrichment status) | Nice-to-have |
| Text blocks | SQL queries, prompt templates, JSON templates | Nice-to-have |

---

## 2. Project Structure

### Recommendation: Package-by-Feature with Internal Layering

For a 600K+ movie database with multiple concerns (CRUD, search, AI, enrichment, auth), package-by-feature keeps things cohesive. Full hexagonal architecture is overkill for a solo project - but borrowing the "ports" concept for external integrations (DynamoDB, OpenAI, TMDB) keeps the code testable.

### Proposed Structure

```
src/main/java/com/moviedb/
├── movie/                          # Feature: core movie CRUD
│   ├── MovieController.java        # REST endpoints
│   ├── MovieService.java           # Business logic
│   ├── MovieRepository.java        # DynamoDB data access
│   ├── Movie.java                  # DynamoDB entity (bean)
│   ├── MovieResponse.java          # API response DTO (record)
│   └── MovieSearchRequest.java     # API request DTO (record)
│
├── ai/                             # Feature: AI-powered features
│   ├── AiController.java           # /api/v1/ai/* endpoints
│   ├── AiService.java              # Orchestrates AI operations
│   ├── EmbeddingService.java       # Vector embedding generation
│   └── RecommendationService.java  # Similarity-based recommendations
│
├── enrichment/                     # Feature: TMDB data enrichment
│   ├── TmdbClient.java             # External API client (port)
│   ├── EnrichmentService.java      # Enrichment orchestration
│   └── EnrichmentScheduler.java    # Background job scheduling
│
├── auth/                           # Feature: authentication
│   ├── AuthController.java         # Login/register endpoints
│   ├── AuthService.java            # Auth business logic
│   ├── JwtTokenProvider.java       # JWT generation/validation
│   └── User.java                   # User entity
│
├── common/                         # Shared infrastructure
│   ├── config/
│   │   ├── DynamoDbConfig.java     # DynamoDB client beans
│   │   ├── SecurityConfig.java     # Spring Security config
│   │   ├── CacheConfig.java        # Caffeine/Redis config
│   │   └── OpenAiConfig.java       # AI client config
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── ApiError.java           # Standard error response (record)
│   └── pagination/
│       └── PagedResponse.java      # Generic pagination wrapper
│
└── MovieDatabaseApplication.java   # Main class

src/main/resources/
├── application.yml                 # Main config
├── application-dev.yml             # Dev profile (local DynamoDB)
├── application-prod.yml            # Prod profile
└── prompts/                        # AI prompt templates
    ├── movie-summary.st            # Spring AI prompt template
    └── recommendation.st

src/test/java/com/moviedb/
├── movie/
│   ├── MovieControllerTest.java    # @WebMvcTest slice test
│   ├── MovieServiceTest.java       # Unit test with Mockito
│   └── MovieRepositoryIT.java      # Integration test with LocalStack
├── ai/
│   └── AiServiceTest.java
└── testconfig/
    └── LocalStackConfig.java       # Shared Testcontainers setup
```

### Why This Over Full Hexagonal

| Aspect | Full Hexagonal | This Approach |
|--------|---------------|---------------|
| Boilerplate | High (ports, adapters, mappers per feature) | Low |
| Testability | Excellent | Good (mock at service boundary) |
| Solo developer velocity | Slow | Fast |
| Portfolio readability | Confusing to reviewers | Clear and familiar |
| Refactor to hexagonal later | N/A | Easy (extract interfaces) |

### Key Principles

1. **DTOs at the boundary** - never expose DynamoDB entities in API responses. Records for DTOs, beans for entities.
2. **Service layer owns business logic** - controllers are thin (validation + delegation).
3. **One repository per DynamoDB table** - repository handles all DynamoDB operations for that table.
4. **Config classes in `common/config`** - centralized Spring bean configuration.
5. **Feature packages are self-contained** - a new developer can understand `movie/` without reading `ai/`.

---

## 3. AWS SDK v2 for DynamoDB

### Enhanced Client vs Low-Level Client

| Aspect | Enhanced Client | Low-Level Client |
|--------|----------------|-----------------|
| Abstraction | High - Java class ↔ DynamoDB item mapping | Low - raw `Map<String, AttributeValue>` |
| Type safety | Strong (compile-time) | Weak (runtime errors) |
| Boilerplate | Minimal (annotations) | Verbose |
| Flexibility | Good for standard CRUD | Full control for complex queries |
| Performance | Slight overhead from reflection | Fastest possible |
| Records support | Via `@DynamoDbImmutable` with builder | N/A |

**Recommendation:** Use the Enhanced Client for all standard operations. Fall back to low-level only for complex conditional expressions or batch operations that the Enhanced Client doesn't support cleanly.

### DynamoDB Table Design for Movies

```
Table: movies
  PK: MOVIE#{movieId}        (partition key)
  SK: METADATA               (sort key)

GSI1 (genre-year-index):
  GSI1PK: GENRE#{genre}
  GSI1SK: YEAR#{releaseYear}#{movieId}

GSI2 (rating-index):
  GSI2PK: RATING_BUCKET#{bucket}   (e.g., "8-9", "7-8")
  GSI2SK: RATING#{rating}#{movieId}
```

### Entity Mapping with Enhanced Client

```java
@DynamoDbBean
public class Movie {
    private String pk;
    private String sk;
    private String movieId;
    private String title;
    private int releaseYear;
    private double rating;
    private List<String> genres;
    private String overview;
    private String posterPath;
    private Integer tmdbId;
    private Instant createdAt;
    private Instant updatedAt;

    // GSI attributes
    private String gsi1pk;
    private String gsi1sk;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }
    public void setPk(String pk) { this.pk = pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
    public void setSk(String sk) { this.sk = sk; }

    @DynamoDbSecondaryPartitionKey(indexNames = "genre-year-index")
    @DynamoDbAttribute("GSI1PK")
    public String getGsi1pk() { return gsi1pk; }
    public void setGsi1pk(String gsi1pk) { this.gsi1pk = gsi1pk; }

    @DynamoDbSecondarySortKey(indexNames = "genre-year-index")
    @DynamoDbAttribute("GSI1SK")
    public String getGsi1sk() { return gsi1sk; }
    public void setGsi1sk(String gsi1sk) { this.gsi1sk = gsi1sk; }

    @DynamoDbAutoGeneratedTimestampAttribute
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // ... other getters/setters
}
```

### Repository Pattern

```java
@Repository
public class MovieRepository {
    private final DynamoDbTable<Movie> table;
    private final DynamoDbIndex<Movie> genreYearIndex;

    public MovieRepository(DynamoDbEnhancedClient enhancedClient) {
        this.table = enhancedClient.table("movies", TableSchema.fromBean(Movie.class));
        this.genreYearIndex = table.index("genre-year-index");
    }

    public Optional<Movie> findById(String movieId) {
        Key key = Key.builder()
            .partitionValue("MOVIE#" + movieId)
            .sortValue("METADATA")
            .build();
        return Optional.ofNullable(table.getItem(key));
    }

    public PagedResponse<Movie> findByGenreAndYear(String genre, int year, String nextToken) {
        QueryConditional condition = QueryConditional.sortBeginsWith(
            Key.builder()
                .partitionValue("GENRE#" + genre)
                .sortValue("YEAR#" + year)
                .build()
        );
        // ... query with pagination using exclusiveStartKey
    }

    public void save(Movie movie) {
        movie.setPk("MOVIE#" + movie.getMovieId());
        movie.setSk("METADATA");
        movie.setGsi1pk("GENRE#" + movie.getGenres().get(0));
        movie.setGsi1sk("YEAR#" + movie.getReleaseYear() + "#" + movie.getMovieId());
        table.putItem(movie);
    }
}
```

### Spring Configuration

```java
@Configuration
public class DynamoDbConfig {
    @Bean
    public DynamoDbClient dynamoDbClient(
            @Value("${aws.dynamodb.endpoint:}") String endpoint,
            @Value("${aws.region:us-east-1}") String region) {
        var builder = DynamoDbClient.builder()
            .region(Region.of(region));
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint)); // local dev
        }
        return builder.build();
    }

    @Bean
    public DynamoDbEnhancedClient enhancedClient(DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .extensions(
                VersionedRecordExtension.builder().build(),
                AutoGeneratedTimestampRecordExtension.create()
            )
            .build();
    }
}
```

### Key Extensions to Enable

| Extension | Purpose | Use Case |
|-----------|---------|----------|
| `VersionedRecordExtension` | Optimistic locking via version attribute | Prevent concurrent update conflicts |
| `AutoGeneratedTimestampRecordExtension` | Auto-set `updatedAt` on writes | Audit trail without manual code |
| `AtomicCounterExtension` | Auto-increment counters | View counts, rating counts |

---

## 4. OpenAI Integration from Java

### Framework Comparison

| Aspect | Spring AI | LangChain4j | Raw HTTP Client |
|--------|-----------|-------------|-----------------|
| Spring Boot integration | First-class (auto-config) | Via starter (good) | Manual |
| Learning curve | Low (if you know Spring) | Medium | Low |
| Structured output | `.entity(Class)` - one line | `AiServices` interface proxy | Manual JSON parsing |
| RAG support | `QuestionAnswerAdvisor` | `ContentRetriever` | DIY |
| Embedding models | `EmbeddingModel` bean | `EmbeddingModel` | Manual API calls |
| Streaming | `Flux<String>` | `StreamingChatLanguageModel` | SSE parsing |
| Maturity | 1.0 GA (2024), stable | Stable, larger community | N/A |
| Provider lock-in | Low (swap via config) | Low (interface-based) | High |

### Recommendation: Spring AI

For a Spring Boot project, Spring AI is the natural choice. Auto-configuration, familiar patterns (`@Bean`, profiles, `@Value`), and the fluent `ChatClient` API make it the lowest-friction option.

### Spring AI Setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini    # cost-effective for movie summaries
          temperature: 0.7
      embedding:
        options:
          model: text-embedding-3-small  # 1536 dimensions, cheapest
```

### Use Cases with Code

**1. Movie Summary Generation:**
```java
@Service
public class AiService {
    private final ChatClient chatClient;

    public AiService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultSystem("You are a movie expert. Be concise.")
            .build();
    }

    public String generateSummary(Movie movie) {
        return chatClient.prompt()
            .user(u -> u.text("Write a 2-sentence summary for: {title} ({year})")
                .param("title", movie.getTitle())
                .param("year", String.valueOf(movie.getReleaseYear())))
            .call()
            .content();
    }
}
```

**2. Structured Movie Analysis:**
```java
public record MovieAnalysis(
    String mood,
    List<String> themes,
    String targetAudience,
    int rewatchabilityScore
) {}

public MovieAnalysis analyzeMovie(Movie movie) {
    return chatClient.prompt()
        .user("Analyze this movie: " + movie.getTitle())
        .call()
        .entity(MovieAnalysis.class); // auto JSON schema + parsing
}
```

**3. Embedding Generation for Similarity Search:**
```java
@Service
public class EmbeddingService {
    private final EmbeddingModel embeddingModel;

    public EmbeddingService(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    public float[] generateEmbedding(Movie movie) {
        String text = movie.getTitle() + " " + movie.getOverview()
            + " " + String.join(", ", movie.getGenres());
        return embeddingModel.embed(text);
    }
}
```

### Cost Estimation (600K movies)

| Operation | Model | Cost per 1K tokens | Estimated Total |
|-----------|-------|-------------------|-----------------|
| Summaries (600K) | gpt-4o-mini | $0.15/1M input, $0.60/1M output | ~$50-80 |
| Embeddings (600K) | text-embedding-3-small | $0.02/1M tokens | ~$2-3 |
| Per-request AI features | gpt-4o-mini | $0.15/1M input | Negligible |

**Strategy:** Generate embeddings in batch (background job). Generate summaries lazily (on first request, then cache).

---

## 5. Caching Strategies

### Two-Tier Cache: Caffeine (L1) + Redis (L2)

For a movie database, most data is read-heavy and changes infrequently. A two-tier cache gives you sub-millisecond local reads with Redis as a shared distributed fallback.

```
Request → Caffeine (L1, in-process, ~1μs)
  miss → Redis (L2, network, ~1ms)
    miss → DynamoDB (~5-10ms)
      → populate both caches on read
```

### Phase 1: Start with Caffeine Only

For a solo project, Caffeine alone is sufficient until you need multiple instances.

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10_000)          // 10K movies in cache
            .expireAfterWrite(Duration.ofMinutes(30))
            .recordStats());              // expose via /actuator/caches
        return manager;
    }
}
```

### Using Spring Cache Annotations

```java
@Service
public class MovieService {
    private final MovieRepository repository;

    @Cacheable(value = "movies", key = "#movieId")
    public MovieResponse getMovie(String movieId) {
        return repository.findById(movieId)
            .map(this::toResponse)
            .orElseThrow(() -> new MovieNotFoundException(movieId));
    }

    @CacheEvict(value = "movies", key = "#movieId")
    public MovieResponse updateMovie(String movieId, UpdateMovieRequest request) {
        // update logic...
    }

    @Cacheable(value = "moviesByGenre", key = "#genre + '-' + #year")
    public PagedResponse<MovieResponse> getByGenre(String genre, int year) {
        // query logic...
    }

    // Evict genre caches when a movie is added/updated
    @CacheEvict(value = "moviesByGenre", allEntries = true)
    public MovieResponse createMovie(CreateMovieRequest request) {
        // create logic...
    }
}
```

### Cache Strategy by Data Type

| Data | Cache Duration | Eviction Strategy | Why |
|------|---------------|-------------------|-----|
| Movie details | 30 min | On update | Changes rarely, high read volume |
| Genre listings | 15 min | All entries on write | Aggregated data, stale is OK briefly |
| Search results | 5 min | TTL only | Too many key combinations to evict precisely |
| AI summaries | 24 hours | Never (regenerate manually) | Expensive to generate, never changes |
| TMDB enrichment | 7 days | On re-enrichment | External data, very stable |
| User sessions | Match JWT expiry | On logout | Security-sensitive |

### Phase 2: Add Redis (When Needed)

```yaml
# application.yml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 30m
```

```java
// Switch to RedisCacheManager or use a composite:
@Bean
public CacheManager cacheManager(RedisConnectionFactory redisFactory) {
    return new CompositeCacheManager(
        caffeineCacheManager(),   // L1: check local first
        redisCacheManager(redisFactory)  // L2: fallback to Redis
    );
}
```

---

## 6. API Design Patterns

### API Versioning

**Recommendation: URL path versioning** (`/api/v1/movies`). It's the most visible, easiest to test with curl, and what most public APIs use.

```java
@RestController
@RequestMapping("/api/v1/movies")
public class MovieController {
    // All endpoints under /api/v1/movies
}
```

Other options (header-based, content negotiation) add complexity without clear benefit for a portfolio project.

### Error Handling: Global Exception Handler

```java
// Standard error response
public record ApiError(
    String code,
    String message,
    Instant timestamp,
    String path
) {
    public ApiError(String code, String message, String path) {
        this(code, message, Instant.now(), path);
    }
}

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MovieNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(
            MovieNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(404)
            .body(new ApiError("MOVIE_NOT_FOUND", ex.getMessage(),
                request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
            .body(new ApiError("VALIDATION_ERROR", message,
                request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneral(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500)
            .body(new ApiError("INTERNAL_ERROR",
                "An unexpected error occurred",
                request.getRequestURI()));
    }
}
```

### Pagination: Cursor-Based (DynamoDB Native)

DynamoDB doesn't support offset-based pagination. Use cursor-based pagination with `exclusiveStartKey` encoded as a token.

```java
// Response format
public record PagedResponse<T>(
    List<T> items,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    String nextToken,    // Base64-encoded lastEvaluatedKey
    int count
) {}

// Controller
@GetMapping
public PagedResponse<MovieResponse> listMovies(
        @RequestParam(defaultValue = "20") @Max(100) int limit,
        @RequestParam(required = false) String nextToken) {
    return movieService.listMovies(limit, nextToken);
}

// Repository - token encoding
public PagedResponse<Movie> queryWithPagination(
        QueryConditional condition, int limit, String nextToken) {
    var requestBuilder = QueryEnhancedRequest.builder()
        .queryConditional(condition)
        .limit(limit);

    if (nextToken != null) {
        Map<String, AttributeValue> startKey = decodeToken(nextToken);
        requestBuilder.exclusiveStartKey(startKey);
    }

    Page<Movie> page = table.query(requestBuilder.build())
        .stream().findFirst().orElse(null);

    String newToken = page.lastEvaluatedKey() != null
        ? encodeToken(page.lastEvaluatedKey()) : null;

    return new PagedResponse<>(page.items(), newToken, page.items().size());
}

private String encodeToken(Map<String, AttributeValue> key) {
    // Serialize to JSON, then Base64 encode
    return Base64.getUrlEncoder().encodeToString(
        objectMapper.writeValueAsBytes(key));
}
```

### API Endpoint Design

```
GET    /api/v1/movies                    # List with pagination
GET    /api/v1/movies/{id}               # Get by ID
POST   /api/v1/movies                    # Create
PUT    /api/v1/movies/{id}               # Full update
PATCH  /api/v1/movies/{id}               # Partial update
DELETE /api/v1/movies/{id}               # Delete

GET    /api/v1/movies/search?q=          # Full-text search
GET    /api/v1/movies/genre/{genre}      # By genre (GSI query)
GET    /api/v1/movies/top-rated          # Top rated (GSI query)

POST   /api/v1/ai/summarize/{id}         # Generate AI summary
POST   /api/v1/ai/recommend              # Get recommendations
POST   /api/v1/ai/analyze/{id}           # Structured analysis

POST   /api/v1/auth/register             # User registration
POST   /api/v1/auth/login                # JWT login
POST   /api/v1/auth/refresh              # Refresh token
```

### Request Validation with Bean Validation

```java
public record CreateMovieRequest(
    @NotBlank String title,
    @Min(1888) @Max(2030) int releaseYear,
    @DecimalMin("0.0") @DecimalMax("10.0") double rating,
    @NotEmpty List<@NotBlank String> genres,
    @Size(max = 2000) String overview
) {}
```

---

## 7. Testing Strategy

### Testing Pyramid

```
        /  E2E  \          Few: full API flow tests
       /  Integ  \         Some: DynamoDB with LocalStack
      /   Unit    \        Many: service logic with Mockito
     /______________\
```

### Unit Tests (JUnit 5 + Mockito)

Test service logic in isolation. Mock the repository and external clients.

```java
@ExtendWith(MockitoExtension.class)
class MovieServiceTest {

    @Mock MovieRepository movieRepository;
    @Mock AiService aiService;
    @InjectMocks MovieService movieService;

    @Test
    @DisplayName("should return movie response when movie exists")
    void shouldReturnMovie_whenExists() {
        var movie = new Movie();
        movie.setMovieId("m-123");
        movie.setTitle("Inception");
        movie.setReleaseYear(2010);
        movie.setGenres(List.of("Sci-Fi", "Thriller"));

        when(movieRepository.findById("m-123")).thenReturn(Optional.of(movie));

        MovieResponse result = movieService.getMovie("m-123");

        assertThat(result.title()).isEqualTo("Inception");
        assertThat(result.genres()).containsExactly("Sci-Fi", "Thriller");
        verify(movieRepository).findById("m-123");
    }

    @Test
    @DisplayName("should throw MovieNotFoundException when movie does not exist")
    void shouldThrow_whenMovieNotFound() {
        when(movieRepository.findById("m-999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> movieService.getMovie("m-999"))
            .isInstanceOf(MovieNotFoundException.class)
            .hasMessageContaining("m-999");
    }
}
```

### Integration Tests (Testcontainers + LocalStack)

Spin up a real DynamoDB Local in Docker for repository tests. This catches issues that mocks miss: key schema mismatches, GSI query behavior, pagination edge cases.

```java
// Shared container config - reused across all integration tests
@TestConfiguration
public class LocalStackConfig {

    static final LocalStackContainer localstack = new LocalStackContainer(
            DockerImageName.parse("localstack/localstack:3.4"))
        .withServices(LocalStackContainer.Service.DYNAMODB);

    static {
        localstack.start(); // start once, reuse across tests
    }

    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
            .endpointOverride(localstack.getEndpointOverride(
                LocalStackContainer.Service.DYNAMODB))
            .region(Region.of(localstack.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(
                    localstack.getAccessKey(), localstack.getSecretKey())))
            .build();
    }

    @Bean
    public DynamoDbEnhancedClient enhancedClient(DynamoDbClient client) {
        return DynamoDbEnhancedClient.builder()
            .dynamoDbClient(client)
            .build();
    }
}
```

```java
@SpringBootTest
@Import(LocalStackConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MovieRepositoryIT {

    @Autowired MovieRepository movieRepository;
    @Autowired DynamoDbClient dynamoDbClient;

    @BeforeAll
    static void createTable(@Autowired DynamoDbClient client) {
        client.createTable(CreateTableRequest.builder()
            .tableName("movies")
            .keySchema(
                KeySchemaElement.builder().attributeName("PK")
                    .keyType(KeyType.HASH).build(),
                KeySchemaElement.builder().attributeName("SK")
                    .keyType(KeyType.RANGE).build())
            .attributeDefinitions(
                AttributeDefinition.builder().attributeName("PK")
                    .attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("SK")
                    .attributeType(ScalarAttributeType.S).build())
            .billingMode(BillingMode.PAY_PER_REQUEST)
            .build());
    }

    @Test
    @Order(1)
    @DisplayName("should save and retrieve a movie")
    void shouldSaveAndRetrieve() {
        var movie = new Movie();
        movie.setMovieId("it-1");
        movie.setTitle("The Matrix");
        movie.setReleaseYear(1999);
        movie.setGenres(List.of("Sci-Fi", "Action"));

        movieRepository.save(movie);
        Optional<Movie> result = movieRepository.findById("it-1");

        assertThat(result).isPresent();
        assertThat(result.get().getTitle()).isEqualTo("The Matrix");
    }

    @Test
    @Order(2)
    @DisplayName("should return empty for non-existent movie")
    void shouldReturnEmpty_whenNotFound() {
        assertThat(movieRepository.findById("nonexistent")).isEmpty();
    }
}
```

### Controller Slice Tests

```java
@WebMvcTest(MovieController.class)
class MovieControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean MovieService movieService;

    @Test
    @DisplayName("GET /api/v1/movies/{id} returns 200 with movie")
    void shouldReturnMovie() throws Exception {
        var response = new MovieResponse("m-1", "Inception", 2010,
            8.8, List.of("Sci-Fi"));
        when(movieService.getMovie("m-1")).thenReturn(response);

        mockMvc.perform(get("/api/v1/movies/m-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Inception"))
            .andExpect(jsonPath("$.releaseYear").value(2010));
    }

    @Test
    @DisplayName("GET /api/v1/movies/{id} returns 404 when not found")
    void shouldReturn404() throws Exception {
        when(movieService.getMovie("m-999"))
            .thenThrow(new MovieNotFoundException("m-999"));

        mockMvc.perform(get("/api/v1/movies/m-999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("MOVIE_NOT_FOUND"));
    }
}
```

### Test Dependencies

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>localstack</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 8. Background Job Scheduling

### Spring @Scheduled vs Quartz

| Aspect | Spring @Scheduled | Quartz |
|--------|------------------|--------|
| Setup complexity | One annotation | Significant config |
| Persistence | No (in-memory) | Yes (JDBC job store) |
| Clustering | No (runs on every instance) | Yes (distributed locking) |
| Misfire handling | No | Yes |
| Dynamic scheduling | No (fixed at startup) | Yes (runtime job creation) |
| Dependencies | None (built-in) | quartz + spring-boot-starter-quartz |

**Recommendation: Spring @Scheduled.** For a solo-deployed application, you don't need distributed locking or job persistence. Keep it simple.

### TMDB Enrichment Scheduler

```java
@Component
@Slf4j
public class EnrichmentScheduler {
    private final EnrichmentService enrichmentService;
    private final MovieRepository movieRepository;

    // Run daily at 2 AM - enrich movies missing TMDB data
    @Scheduled(cron = "0 0 2 * * *")
    public void enrichUnenrichedMovies() {
        log.info("Starting TMDB enrichment batch");
        List<Movie> unenriched = movieRepository.findUnenriched(100);

        int success = 0, failed = 0;
        for (Movie movie : unenriched) {
            try {
                enrichmentService.enrichFromTmdb(movie);
                success++;
                Thread.sleep(250); // respect TMDB rate limit (4 req/sec)
            } catch (Exception e) {
                log.warn("Failed to enrich movie {}: {}",
                    movie.getMovieId(), e.getMessage());
                failed++;
            }
        }
        log.info("Enrichment complete: {} success, {} failed", success, failed);
    }

    // Run every 6 hours - generate embeddings for movies without them
    @Scheduled(fixedRate = 6, timeUnit = TimeUnit.HOURS)
    public void generateMissingEmbeddings() {
        log.info("Starting embedding generation batch");
        List<Movie> noEmbeddings = movieRepository.findWithoutEmbeddings(50);

        for (Movie movie : noEmbeddings) {
            try {
                enrichmentService.generateAndStoreEmbedding(movie);
            } catch (Exception e) {
                log.warn("Embedding failed for {}: {}",
                    movie.getMovieId(), e.getMessage());
            }
        }
    }
}
```

### Enable Scheduling

```java
@SpringBootApplication
@EnableScheduling
@EnableCaching
public class MovieDatabaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(MovieDatabaseApplication.class, args);
    }
}
```

### TMDB Client

```java
@Component
public class TmdbClient {
    private final RestClient restClient;

    public TmdbClient(@Value("${tmdb.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
            .baseUrl("https://api.themoviedb.org/3")
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .build();
    }

    public TmdbMovie searchMovie(String title, int year) {
        TmdbSearchResponse response = restClient.get()
            .uri("/search/movie?query={title}&year={year}", title, year)
            .retrieve()
            .body(TmdbSearchResponse.class);
        return response.results().isEmpty() ? null : response.results().get(0);
    }

    public record TmdbMovie(int id, String overview, String posterPath,
                             double voteAverage) {}
    public record TmdbSearchResponse(List<TmdbMovie> results) {}
}
```

### When to Upgrade to Quartz

Move to Quartz if you later need:
- Multiple application instances (need distributed locking)
- Job persistence across restarts
- Dynamic job scheduling via admin API
- Misfire recovery (e.g., "run missed jobs on startup")

---

## 9. Security - Spring Security with JWT

### Architecture

```
Client → [JWT in Authorization header]
  → Spring Security Filter Chain
    → JwtAuthenticationFilter (extract + validate token)
      → SecurityContext (set authenticated user)
        → Controller (access user via @AuthenticationPrincipal)
```

### Spring Security 6.x Configuration

Spring Security 6 (Spring Boot 3.x) uses the lambda DSL and `SecurityFilterChain` bean pattern. The old `WebSecurityConfigurerAdapter` is removed.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable()) // stateless API, no CSRF needed
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/movies/**").permitAll() // public read
                .requestMatchers(HttpMethod.POST, "/api/v1/movies").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/v1/movies/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/movies/**").authenticated()
                .requestMatchers("/api/v1/ai/**").authenticated()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter,
                UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### JWT Token Provider

```java
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}") private String secret;
    @Value("${jwt.expiration-ms:3600000}") private long expirationMs; // 1 hour

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username) {
        return Jwts.builder()
            .subject(username)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
    }

    public boolean isValid(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build()
                .parseSignedClaims(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
```

### JWT Authentication Filter

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (tokenProvider.isValid(token)) {
                String username = tokenProvider.extractUsername(token);
                UserDetails user = userDetailsService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(
                    user, null, user.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
    }
}
```

### Best Practices

1. **Short-lived access tokens** (1 hour) + refresh tokens (7 days)
2. **Store JWT secret in environment variable**, never in code or config files
3. **Use RS256 (asymmetric)** for production - allows token verification without sharing the signing key
4. **Include minimal claims** - username and roles only, not sensitive data
5. **Return 401 for expired tokens**, 403 for insufficient permissions

---

## 10. Recommended Dependencies

### pom.xml Core Dependencies

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.4</version>
</parent>

<properties>
    <java.version>21</java.version>
    <spring-ai.version>1.0.0</spring-ai.version>
    <aws-sdk.version>2.29.x</aws-sdk.version>
</properties>

<dependencies>
    <!-- Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.6</version>
    </dependency>

    <!-- DynamoDB -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>dynamodb-enhanced</artifactId>
    </dependency>

    <!-- AI -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    </dependency>

    <!-- Caching -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>
    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
    </dependency>

    <!-- Observability -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- API Docs -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.7.0</version>
    </dependency>

    <!-- Dev Tools -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>localstack</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>bom</artifactId>
            <version>${aws-sdk.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### application.yml Skeleton

```yaml
spring:
  application:
    name: movie-database-api
  threads:
    virtual:
      enabled: true
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini
      embedding:
        options:
          model: text-embedding-3-small

aws:
  region: us-east-1
  dynamodb:
    endpoint: ${AWS_DYNAMODB_ENDPOINT:}  # blank = real AWS
    table-name: movies

tmdb:
  api-key: ${TMDB_API_KEY}

jwt:
  secret: ${JWT_SECRET}
  expiration-ms: 3600000  # 1 hour

server:
  port: 8080

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
```

---

## Sources

- [AWS SDK Java v2 DynamoDB Enhanced Client README](https://github.com/aws/aws-sdk-java-v2/blob/master/services-custom/dynamodb-enhanced/README.md) - accessed 2026-04-09
- [AWS SDK Java v2 - DynamoDB mapping API changes](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/ddb-mapping.html) - accessed 2026-04-09
- [AWS SDK Java v2 - Advanced mapping features](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/ddb-en-client-adv-features.html) - accessed 2026-04-09
- [AWS SDK Java v2 - Generate a TableSchema](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/ddb-en-client-gs-tableschema.html) - accessed 2026-04-09
- [LangChain4j vs Spring AI comparison](https://blogs.jsbisht.com/blog/langchain4j-vs-spring-ai-comparison) - accessed 2026-04-09
- [Package by Layer vs Package by Feature](https://jshingler.github.io/blog/2025/10/25/package-by-feature-vs-clean-architecture/) - accessed 2026-04-09
- [Hexagonal/Clean Architecture vs Layered](https://www.systemsarchitect.io/blog/hexagonal-clean-architecture-vs-layered-n-tier-architecture-dc025) - accessed 2026-04-09
- [Spring Boot Virtual Threads](https://www.danvega.dev/blog/2023/12/14/virtual-threads-spring-boot) - accessed 2026-04-09
- [Spring.io - Embracing Virtual Threads](https://spring.io/blog/2022/10/11/embracing-virtual-threads) - accessed 2026-04-09
- [Spring Boot REST API Best Practices](https://www.amigoscode.com/blogs/top-10-spring-boot-rest-api-best-practices) - accessed 2026-04-09
- [Testcontainers + LocalStack DynamoDB Integration Tests](https://tech.asimio.net/2024/11/22/dynamodb-spring-boot-integration-tests-provisioning-tables-seeding-data.html) - accessed 2026-04-09
- [Spring Boot Caching with Redis](https://www.codingshuttle.com/blogs/spring-boot-caching-with-redis-boost-performance-with-fast-operations-2025-1) - accessed 2026-04-09
- [Hybrid Cache: Caffeine + Redis](https://medium.com/@nabeghnwwar/hybrid-cache-strategy-in-spring-boot-a-guide-to-redisson-and-caffeine-integration-f1b46b89e9c4) - accessed 2026-04-09
- [Spring Boot Scheduling: @Scheduled and Quartz](https://katyella.com/blog/spring-boot-scheduling) - accessed 2026-04-09
- [Spring Security 6 JWT Best Practices](https://copyprogramming.com/howto/introduce-token-login-in-spring-boot) - accessed 2026-04-09
- ⚠️ External link - [Spring AI Reference Documentation](https://docs.spring.io/spring-ai/reference/) - accessed 2026-04-09
- ⚠️ External link - [Spring Data Redis Cache](https://docs.spring.io/spring-data/redis/reference/redis/redis-cache.html) - accessed 2026-04-09
- ⚠️ External link - [Spring Boot Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html) - accessed 2026-04-09
