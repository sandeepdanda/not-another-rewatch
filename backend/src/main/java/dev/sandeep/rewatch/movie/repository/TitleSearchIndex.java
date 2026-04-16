package dev.sandeep.rewatch.movie.repository;

import dev.sandeep.rewatch.movie.model.MovieCatalogItem;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory title index for fast prefix search.
 * Loads all movie titles at startup, searches in memory.
 * For 45K movies this uses ~5MB of RAM - totally fine.
 */
@Component
public class TitleSearchIndex {

    private static final Logger log = LoggerFactory.getLogger(TitleSearchIndex.class);

    private final DynamoDbTable<MovieCatalogItem> table;
    private final Map<String, TitleEntry> titles = new ConcurrentHashMap<>();

    public record TitleEntry(String id, String title, String releaseYear, Double voteAvg, Double popularity, String posterUrl) {}

    public TitleSearchIndex(DynamoDbEnhancedClient enhancedClient) {
        this.table = enhancedClient.table("MovieCatalog", TableSchema.fromBean(MovieCatalogItem.class));
    }

    @PostConstruct
    public void loadIndex() {
        log.info("Loading title search index...");
        var request = ScanEnhancedRequest.builder()
                .filterExpression(software.amazon.awssdk.enhanced.dynamodb.Expression.builder()
                        .expression("SK = :sk")
                        .expressionValues(Map.of(":sk", AttributeValue.builder().s("#METADATA").build()))
                        .build())
                .build();

        table.scan(request).stream()
                .flatMap(page -> page.items().stream())
                .forEach(item -> {
                    String id = item.getPk().replace("MOVIE#", "");
                    titles.put(id, new TitleEntry(
                            id, item.getTitle(), item.getReleaseYear(),
                            item.getVoteAvg(), item.getPopularity(), item.getPosterUrl()));
                });

        log.info("Title search index loaded: {} movies", titles.size());
    }

    /**
     * Case-insensitive prefix search on movie titles.
     * Returns up to `limit` results sorted by popularity.
     */
    public List<TitleEntry> search(String query, int limit) {
        String lower = query.toLowerCase();
        return titles.values().stream()
                .filter(e -> e.title() != null && e.title().toLowerCase().contains(lower))
                .sorted((a, b) -> Double.compare(b.popularity(), a.popularity()))
                .limit(limit)
                .toList();
    }

    public int size() {
        return titles.size();
    }

    public TitleEntry getById(String movieId) {
        return titles.get(movieId);
    }
}
