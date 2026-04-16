package dev.sandeep.rewatch.movie.service;

import dev.sandeep.rewatch.movie.model.MovieCatalogItem;
import dev.sandeep.rewatch.movie.model.MovieResponse;
import dev.sandeep.rewatch.movie.model.MovieSummary;
import dev.sandeep.rewatch.movie.model.PersonResponse;
import dev.sandeep.rewatch.movie.repository.MovieRepository;
import dev.sandeep.rewatch.movie.repository.TitleSearchIndex;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MovieService {

    private final MovieRepository repository;
    private final TitleSearchIndex searchIndex;

    public MovieService(MovieRepository repository, TitleSearchIndex searchIndex) {
        this.repository = repository;
        this.searchIndex = searchIndex;
    }

    public List<MovieSummary> searchByTitle(String query, int limit) {
        return searchIndex.search(query, limit).stream()
                .map(e -> new MovieSummary(e.id(), e.title(), e.releaseYear(),
                        e.voteAvg(), e.popularity(), e.posterUrl()))
                .toList();
    }

    /**
     * Get full movie details by ID.
     * Queries all items with PK=MOVIE#{id} and assembles them into a response.
     */
    @Cacheable(value = "movies", key = "#id")
    public Optional<MovieResponse> getMovieById(String id) {
        var items = repository.getMovieById(id);
        if (items.isEmpty()) {
            return Optional.empty();
        }

        // Find the metadata item
        var meta = items.stream()
                .filter(i -> "#METADATA".equals(i.getSk()))
                .findFirst()
                .orElse(null);

        if (meta == null) {
            return Optional.empty();
        }

        var genres = items.stream()
                .filter(i -> i.getSk().startsWith("GENRE#"))
                .map(i -> new MovieResponse.Genre(i.getGenreId(), i.getGenreName()))
                .toList();

        var cast = items.stream()
                .filter(i -> i.getSk().startsWith("CAST#"))
                .map(i -> new MovieResponse.CastMember(i.getPersonName(), i.getCharacter(), i.getCastOrder()))
                .toList();

        var crew = items.stream()
                .filter(i -> i.getSk().startsWith("CREW#"))
                .map(i -> new MovieResponse.CrewMember(i.getPersonName(), i.getDepartment(), i.getJob()))
                .toList();

        return Optional.of(new MovieResponse(
                id, meta.getTitle(), meta.getOverview(), meta.getReleaseDate(),
                meta.getReleaseYear(), meta.getBudget(), meta.getRevenue(),
                meta.getRuntime(), meta.getTagline(), meta.getStatus(),
                meta.getVoteAvg(), meta.getVoteCount(), meta.getPopularity(),
                meta.getPosterUrl(), genres, cast, crew
        ));
    }

    @Cacheable(value = "persons", key = "#id")
    public Optional<PersonResponse> getPersonById(String id) {
        var items = repository.getPersonFilmography(id);
        if (items.isEmpty()) {
            return Optional.empty();
        }

        String name = items.stream()
                .map(MovieCatalogItem::getPersonName)
                .filter(n -> n != null && !n.isBlank())
                .findFirst()
                .orElse("Unknown");

        var filmography = items.stream()
                .map(this::toSummary)
                .toList();

        return Optional.of(new PersonResponse(id, name, filmography));
    }

    public List<MovieSummary> getMoviesByGenre(String genre, int limit) {
        return repository.getMoviesByGenre(genre, limit).stream()
                .map(this::toSummary)
                .toList();
    }

    public List<MovieSummary> getMoviesByDecade(String decade, int limit) {
        return repository.getMoviesByDecade(decade, limit).stream()
                .map(this::toSummary)
                .toList();
    }

    public List<MovieSummary> getTopRated(int limit) {
        return repository.getTopRated(limit).stream()
                .map(this::toSummary)
                .toList();
    }

    private MovieSummary toSummary(MovieCatalogItem item) {
        String id = extractId(item.getPk(), item.getGsi1sk(), item.getGsi2sk());
        return new MovieSummary(id, item.getTitle(), item.getReleaseYear(),
                item.getVoteAvg(), item.getPopularity(), item.getPosterUrl());
    }

    /** Extract movie ID from PK (MOVIE#123) or GSI sort keys (year#123). */
    private String extractId(String pk, String gsi1sk, String gsi2sk) {
        if (pk != null && pk.startsWith("MOVIE#")) {
            return pk.substring(6);
        }
        // From GSI sort key: "2010#27205"
        String sk = gsi1sk != null ? gsi1sk : gsi2sk;
        if (sk != null && sk.contains("#")) {
            return sk.substring(sk.lastIndexOf('#') + 1);
        }
        return null;
    }
}
