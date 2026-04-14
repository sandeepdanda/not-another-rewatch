-- Movie Database Schema (3NF Normalized)
-- Supports 600K+ records with proper indexing

CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS language_roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL UNIQUE  -- 'Original', 'Spoken'
);

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(10) UNIQUE
);

CREATE TABLE IF NOT EXISTS persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birth_date DATE,
    biography TEXT
);

CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    overview TEXT,
    release_date DATE,
    budget BIGINT DEFAULT 0,
    revenue BIGINT DEFAULT 0,
    runtime INT,
    status VARCHAR(50) DEFAULT 'Released',
    popularity DECIMAL(10, 4) DEFAULT 0,
    vote_avg DECIMAL(4, 2) DEFAULT 0,
    vote_count INT DEFAULT 0,
    tagline TEXT,
    homepage VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many junction tables

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE IF NOT EXISTS movie_languages (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    language_id INT REFERENCES languages(id) ON DELETE CASCADE,
    language_role_id INT REFERENCES language_roles(id),
    PRIMARY KEY (movie_id, language_id, language_role_id)
);

CREATE TABLE IF NOT EXISTS movie_companies (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, company_id)
);

CREATE TABLE IF NOT EXISTS movie_countries (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    country_id INT REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, country_id)
);

CREATE TABLE IF NOT EXISTS movie_cast (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    person_id INT REFERENCES persons(id) ON DELETE CASCADE,
    character_name VARCHAR(500),
    cast_order INT,
    PRIMARY KEY (movie_id, person_id, cast_order)
);

CREATE TABLE IF NOT EXISTS movie_crew (
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    person_id INT REFERENCES persons(id) ON DELETE CASCADE,
    department VARCHAR(100),
    job VARCHAR(100),
    PRIMARY KEY (movie_id, person_id, job)
);

CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    rating DECIMAL(3, 1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
