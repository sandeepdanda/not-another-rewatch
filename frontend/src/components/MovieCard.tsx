import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { MovieSummary } from '../api/types';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

function posterPlaceholder(title: string) {
  const colors = ['from-burgundy', 'from-amber-900', 'from-sage-900', 'from-indigo-900', 'from-teal-900', 'from-rose-900'];
  const index = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const initials = title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return { color: colors[index], initials };
}

export function MovieCard({ movie }: { movie: MovieSummary }) {
  const { initials } = posterPlaceholder(movie.title);
  const hasPoster = movie.posterUrl && movie.posterUrl !== '';

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group"
    >
      <Link to={`/movie/${movie.id}`}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-tertiary transition-all duration-300 group-hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)] group-hover:ring-1 group-hover:ring-amber-500/30">
          {hasPoster ? (
            <img
              src={`${TMDB_IMG}/w342${movie.posterUrl}`}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a2337] to-[#0a0f1a]">
              <span className="serif text-4xl text-amber/30">{initials}</span>
            </div>
          )}

          {/* Rating badge - amber circle top-right */}
          {movie.voteAvg > 0 && (
            <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
              {movie.voteAvg.toFixed(1)}
            </div>
          )}

          {/* Gradient overlay at bottom - appears on hover */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <h3 className="serif text-base text-cream group-hover:text-amber-400 transition-colors truncate">
          {movie.title}
        </h3>
        <p className="text-xs text-muted mt-0.5">{movie.releaseYear}</p>
      </Link>
    </motion.div>
  );
}
