package dev.sandeep.rewatch.movie.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * In-memory vector store for semantic search.
 * Loads pre-computed embeddings from JSON, does cosine similarity at query time.
 */
@Component
public class VectorSearchIndex {

    private static final Logger log = LoggerFactory.getLogger(VectorSearchIndex.class);

    @Value("${app.embeddings.path:../data/embeddings.json}")
    private String embeddingsPath;

    private final Map<String, float[]> embeddings = new HashMap<>();

    public record SearchResult(String movieId, double score) {}

    @PostConstruct
    public void loadEmbeddings() {
        File file = new File(embeddingsPath);
        if (!file.exists()) {
            log.warn("Embeddings file not found: {}. Semantic search disabled.", embeddingsPath);
            return;
        }

        try {
            var mapper = new ObjectMapper();
            Map<String, List<Double>> raw = mapper.readValue(file, new TypeReference<>() {});
            for (var entry : raw.entrySet()) {
                float[] vec = new float[entry.getValue().size()];
                for (int i = 0; i < vec.length; i++) {
                    vec[i] = entry.getValue().get(i).floatValue();
                }
                embeddings.put(entry.getKey(), vec);
            }
            log.info("Loaded {} embeddings (dimensions: {})", embeddings.size(),
                    embeddings.isEmpty() ? 0 : embeddings.values().iterator().next().length);
        } catch (Exception e) {
            log.error("Failed to load embeddings", e);
        }
    }

    /**
     * Find the top-N most similar movies to the given query vector.
     */
    public List<SearchResult> search(float[] queryVector, int limit) {
        return embeddings.entrySet().stream()
                .map(e -> new SearchResult(e.getKey(), cosineSimilarity(queryVector, e.getValue())))
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .limit(limit)
                .toList();
    }

    public boolean isAvailable() {
        return !embeddings.isEmpty();
    }

    private double cosineSimilarity(float[] a, float[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
