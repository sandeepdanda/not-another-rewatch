-- Performance indexes for common query patterns

CREATE INDEX idx_movies_release_date ON movies(release_date);
CREATE INDEX idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX idx_movies_vote_avg ON movies(vote_avg DESC);
CREATE INDEX idx_movies_revenue ON movies(revenue DESC);
CREATE INDEX idx_movies_title ON movies(title);

CREATE INDEX idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);

CREATE INDEX idx_movie_cast_person ON movie_cast(person_id);
CREATE INDEX idx_movie_crew_person ON movie_crew(person_id);
CREATE INDEX idx_movie_crew_department ON movie_crew(department);

CREATE INDEX idx_persons_name ON persons(name);
