package dev.sandeep.rewatch.movie.controller;

import dev.sandeep.rewatch.movie.model.MovieSummary;
import dev.sandeep.rewatch.movie.service.MovieService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final MovieService movieService;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final Map<String, List<Map<String, String>>> sessions = new ConcurrentHashMap<>();

    public ChatController(MovieService movieService) {
        this.movieService = movieService;
    }

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "");
        String sessionId = body.getOrDefault("sessionId", "default");
        var emitter = new SseEmitter(30_000L);

        // Track conversation
        var history = sessions.computeIfAbsent(sessionId, k -> new ArrayList<>());
        history.add(Map.of("role", "user", "text", message));
        if (history.size() > 20) history.subList(0, history.size() - 20).clear();

        executor.execute(() -> {
            try {
                List<MovieSummary> movies = movieService.semanticSearch(message, 5);

                String response = buildResponse(message, movies, history);
                for (String word : response.split("(?<=\\s)")) {
                    emitter.send(SseEmitter.event().data(word));
                    Thread.sleep(30);
                }

                history.add(Map.of("role", "assistant", "text", response));

                if (!movies.isEmpty()) {
                    emitter.send(SseEmitter.event().name("movies").data(movies));
                }

                emitter.send(SseEmitter.event().name("done").data(""));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private String buildResponse(String query, List<MovieSummary> movies, List<Map<String, String>> history) {
        if (movies.isEmpty()) {
            return "I couldn't find any movies matching that. Try a different description!";
        }

        var sb = new StringBuilder();

        // Acknowledge follow-up questions
        if (history.size() > 2) {
            sb.append("Here's what I found for \"").append(query).append("\":\n\n");
        } else {
            sb.append("Based on \"").append(query).append("\", here are my picks:\n\n");
        }

        for (int i = 0; i < movies.size(); i++) {
            var m = movies.get(i);
            sb.append(i + 1).append(". **").append(m.title()).append("**");
            sb.append(" (").append(m.releaseYear()).append(")");
            sb.append(" — ⭐ ").append(m.voteAvg());
            sb.append("\n");
        }

        sb.append("\nWant something different? Try describing the mood, era, or themes you're after.");
        return sb.toString();
    }
}
