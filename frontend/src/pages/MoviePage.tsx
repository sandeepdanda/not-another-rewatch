import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MovieCard } from '../components/MovieCard';
import { toast } from '../utils/toast';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

const GENRE_COLOR: Record<string, string> = {
  Action: 'bg-red-500/15 text-red-300 border-red-500/30',
  Adventure: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Animation: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Comedy: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  Crime: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  Documentary: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Drama: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Family: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  Fantasy: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  History: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  Horror: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Music: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  Mystery: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Romance: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  'Science Fiction': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Thriller: 'bg-red-500/15 text-red-300 border-red-500/30',
  War: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Western: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const EASING = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovie(id!),
    enabled: !!id,
  });
  const { data: similar } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => api.getSimilarMovies(id!),
    enabled: !!id,
  });

  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.getWatchlist().then(list => setInWatchlist(list.some(w => w.movieId === id))).catch(() => {});
    api.getRatings().then(list => {
      const r = list.find(r => r.movieId === id);
      if (r) setUserRating(r.rating);
    }).catch(() => {});
  }, [user, id]);

  async function toggleWatchlist() {
    if (!movie || !id) return;
    if (inWatchlist) {
      await api.removeFromWatchlist(id);
      setInWatchlist(false);
      toast('Removed from watchlist');
    } else {
      await api.addToWatchlist(id, movie.title);
      setInWatchlist(true);
      toast('Added to watchlist!');
    }
  }

  async function handleRate(rating: number) {
    if (!movie || !id) return;
    await api.rateMovie(id, movie.title, rating);
    setUserRating(rating);
    toast(`Rated ${rating} ★`);
  }

  if (isLoading) {
    return <div className="flex justify-center py-32"><div className="spinner" /></div>;
  }
  if (!movie) {
    return (
      <div className="text-center py-32">
        <p className="serif text-3xl text-cream mb-2">Movie not found</p>
        <Link to="/" className="text-amber hover:text-amber-400">← Back to home</Link>
      </div>
    );
  }

  const director = movie.crew.find(c => c.job === 'Director');
  const hasPoster = movie.posterUrl && movie.posterUrl !== '';

  return (
    <div>
      {/* === HERO with parallax === */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative -mx-6 -mt-12 mb-16"
      >
        {/* Parallax backdrop */}
        {hasPoster && (
          <motion.div
            style={{ y: bgY }}
            className="absolute inset-0 -z-10 overflow-hidden"
          >
            <img
              src={`${TMDB_IMG}/w780${movie.posterUrl}`}
              alt=""
              className="w-full h-full object-cover scale-110 blur-3xl opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f1a]/70 to-[#0a0f1a]" />
          </motion.div>
        )}

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <Link to="/browse" className="text-muted hover:text-cream text-sm inline-block mb-8 transition-colors">
            ← Back to archive
          </Link>

          <div className="grid md:grid-cols-5 gap-10">
            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASING }}
              className="md:col-span-2"
            >
              {hasPoster ? (
                <img
                  src={`${TMDB_IMG}/w500${movie.posterUrl}`}
                  alt={movie.title}
                  className="w-full max-w-sm rounded-lg shadow-2xl"
                />
              ) : (
                <div className="aspect-[2/3] rounded-lg bg-tertiary flex items-center justify-center max-w-sm">
                  <span className="serif text-6xl text-amber/30">
                    {movie.title.split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASING }}
              className="md:col-span-3 min-w-0"
            >
              <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">
                {movie.releaseYear} · {movie.runtime} min
              </p>
              <h1 className="serif text-5xl md:text-6xl text-cream leading-tight mb-4">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="serif italic text-lg text-warm mb-6">"{movie.tagline}"</p>
              )}

              {/* Rating display */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="serif text-4xl text-amber">{movie.voteAvg}</span>
                  <span className="text-sm text-muted">/ 10</span>
                </div>
                <div className="text-xs text-muted">
                  based on {movie.voteCount.toLocaleString()} votes
                </div>
              </div>

              {/* Genre pills with color coding */}
              <div className="flex flex-wrap gap-2 mb-8">
                {movie.genres.map((g: any) => (
                  <Link
                    key={g.id}
                    to={`/browse?genre=${g.name}`}
                    className={`rounded-full px-3 py-1 text-xs border ${GENRE_COLOR[g.name] || 'bg-tertiary text-warm border-warm'} hover:opacity-80 transition-opacity`}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>

              {/* User actions */}
              {user && (
                <div className="flex items-center gap-5 mb-8 p-4 rounded-xl bg-tertiary/50 border border-warm backdrop-blur-sm">
                  <button
                    onClick={toggleWatchlist}
                    className={`rounded-lg px-5 py-2.5 text-sm font-medium cursor-pointer transition-all ${
                      inWatchlist
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-amber-500 text-[#0a0f1a] hover:bg-amber-400'
                    }`}
                  >
                    {inWatchlist ? '✓ In Watchlist' : '+ Watchlist'}
                  </button>
                  <div
                    className="flex gap-1"
                    onMouseLeave={() => setHoveredStar(0)}
                  >
                    {[1, 2, 3, 4, 5].map(star => {
                      const filled = star <= (hoveredStar || userRating);
                      return (
                        <motion.button
                          key={star}
                          onClick={() => handleRate(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          whileHover={{ scale: 1.2, rotate: -10 }}
                          whileTap={{ scale: 0.9 }}
                          className={`text-2xl cursor-pointer transition-colors ${
                            filled ? 'text-amber-400' : 'text-muted'
                          }`}
                        >
                          ★
                        </motion.button>
                      );
                    })}
                  </div>
                  {userRating > 0 && (
                    <span className="text-sm text-warm">Your rating: {userRating}/5</span>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <div className="max-w-7xl mx-auto px-6 space-y-16">
        {/* === THE STORY === */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">The Story</p>
          <p className="serif text-xl text-cream leading-relaxed max-w-3xl">
            <span className="serif text-5xl text-amber float-left mr-2 leading-none mt-1">
              {movie.overview?.[0]}
            </span>
            {movie.overview?.slice(1)}
          </p>
          {director && (
            <p className="mt-8 text-sm text-warm">
              Directed by <span className="text-cream serif">{director.name}</span>
            </p>
          )}
        </motion.section>

        {/* === CAST === */}
        {movie.cast.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">The Cast</p>
            <h2 className="serif text-3xl text-cream mb-6">The faces</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movie.cast.slice(0, 12).map((c: any, i: number) => {
                const initials = c.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('');
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-500/20 to-burgundy/20 flex items-center justify-center border border-warm">
                      <span className="serif text-xl text-amber">{initials}</span>
                    </div>
                    <p className="serif text-sm text-cream truncate">{c.name}</p>
                    <p className="text-xs text-muted truncate italic">as {c.character}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* === THE NUMBERS === */}
        {(movie.budget > 0 || movie.revenue > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">The Ledger</p>
            <h2 className="serif text-3xl text-cream mb-6">By the numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {movie.budget > 0 && (
                <div className="rounded-xl bg-tertiary border border-warm p-5">
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Budget</p>
                  <p className="serif text-2xl text-cream">${(movie.budget / 1_000_000).toFixed(0)}M</p>
                </div>
              )}
              {movie.revenue > 0 && (
                <div className="rounded-xl bg-tertiary border border-warm p-5">
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Box Office</p>
                  <p className="serif text-2xl text-amber">${(movie.revenue / 1_000_000).toFixed(0)}M</p>
                </div>
              )}
              {movie.budget > 0 && movie.revenue > 0 && (
                <div className="rounded-xl bg-tertiary border border-warm p-5">
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Return</p>
                  <p className="serif text-2xl text-cream">
                    {((movie.revenue / movie.budget) * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-tertiary border border-warm p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-2">Released</p>
                <p className="serif text-2xl text-cream">{movie.releaseDate}</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* === SIMILAR TASTES === */}
        {similar && similar.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pb-12"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">Similar Tastes</p>
            <h2 className="serif text-3xl text-cream mb-2">If you liked this...</h2>
            <p className="text-warm mb-6">Our AI thinks these hit the same notes.</p>
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 snap-x scrollbar-hide">
              {similar.map((m: any) => (
                <div key={m.id} className="flex-shrink-0 w-40 snap-start">
                  <MovieCard movie={m} />
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
