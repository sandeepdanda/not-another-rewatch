-- ============================================================
-- Movie Database Analytics Queries
-- ============================================================

-- 1. Top 20 grossing movies by genre
SELECT g.name AS genre, m.title, m.revenue, m.budget,
       ROUND((m.revenue - m.budget) * 100.0 / NULLIF(m.budget, 0), 2) AS roi_pct
FROM movies m
JOIN movie_genres mg ON m.id = mg.movie_id
JOIN genres g ON mg.genre_id = g.id
WHERE m.revenue > 0 AND m.budget > 0
ORDER BY m.revenue DESC
LIMIT 20;

-- 2. Average rating by decade
SELECT FLOOR(EXTRACT(YEAR FROM release_date) / 10) * 10 AS decade,
       ROUND(AVG(vote_avg), 2) AS avg_rating,
       COUNT(*) AS movie_count,
       ROUND(AVG(revenue), 0) AS avg_revenue
FROM movies
WHERE release_date IS NOT NULL
GROUP BY decade
ORDER BY decade;

-- 3. Most prolific actors (20+ movies)
SELECT p.name, COUNT(*) AS movie_count,
       ROUND(AVG(m.vote_avg), 2) AS avg_movie_rating,
       SUM(m.revenue) AS total_revenue
FROM persons p
JOIN movie_cast mc ON p.id = mc.person_id
JOIN movies m ON mc.movie_id = m.id
GROUP BY p.id, p.name
HAVING COUNT(*) >= 20
ORDER BY movie_count DESC
LIMIT 15;

-- 4. Genre popularity over time (movies per genre per decade)
SELECT g.name AS genre,
       FLOOR(EXTRACT(YEAR FROM m.release_date) / 10) * 10 AS decade,
       COUNT(*) AS movie_count
FROM movies m
JOIN movie_genres mg ON m.id = mg.movie_id
JOIN genres g ON mg.genre_id = g.id
WHERE m.release_date IS NOT NULL
GROUP BY g.name, decade
ORDER BY genre, decade;

-- 5. Rating distribution
SELECT FLOOR(vote_avg) AS rating_bucket,
       COUNT(*) AS movie_count,
       ROUND(AVG(revenue), 0) AS avg_revenue
FROM movies
WHERE vote_count >= 10
GROUP BY rating_bucket
ORDER BY rating_bucket;

-- 6. Top directors by average rating (min 5 movies)
SELECT p.name AS director, COUNT(*) AS movie_count,
       ROUND(AVG(m.vote_avg), 2) AS avg_rating,
       SUM(m.revenue) AS total_box_office
FROM persons p
JOIN movie_crew mc ON p.id = mc.person_id
JOIN movies m ON mc.movie_id = m.id
WHERE mc.job = 'Director'
GROUP BY p.id, p.name
HAVING COUNT(*) >= 5
ORDER BY avg_rating DESC
LIMIT 20;

-- 7. Revenue vs budget correlation (ROI analysis)
SELECT CASE
         WHEN budget < 1000000 THEN 'Micro (<1M)'
         WHEN budget < 10000000 THEN 'Low (1-10M)'
         WHEN budget < 50000000 THEN 'Mid (10-50M)'
         WHEN budget < 100000000 THEN 'High (50-100M)'
         ELSE 'Blockbuster (100M+)'
       END AS budget_tier,
       COUNT(*) AS movie_count,
       ROUND(AVG(revenue), 0) AS avg_revenue,
       ROUND(AVG((revenue - budget) * 100.0 / NULLIF(budget, 0)), 2) AS avg_roi_pct
FROM movies
WHERE budget > 0 AND revenue > 0
GROUP BY budget_tier
ORDER BY MIN(budget);

-- 8. View: user rating summary
CREATE OR REPLACE VIEW user_rating_summary AS
SELECT user_id,
       COUNT(*) AS rating_count,
       ROUND(AVG(rating), 2) AS avg_rating,
       MIN(rating) AS min_rating,
       MAX(rating) AS max_rating
FROM ratings
GROUP BY user_id;
