package dev.sandeep.rewatch.movie.controller;

import dev.sandeep.rewatch.movie.model.MovieSummary;
import dev.sandeep.rewatch.movie.service.MovieService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private final MovieService movieService;

    public SearchController(MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping
    public List<MovieSummary> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        if (q.length() < 2) {
            return List.of();
        }
        return movieService.searchByTitle(q, limit);
    }

    @GetMapping("/semantic")
    public List<MovieSummary> semanticSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return movieService.semanticSearch(q, limit);
    }
}
