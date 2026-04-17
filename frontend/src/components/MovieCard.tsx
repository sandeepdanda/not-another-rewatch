import { Link } from 'react-router-dom';
import type { MovieSummary } from '../api/types';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

function posterPlaceholder(title: string) {
  const colors = ['bg-red-900', 'bg-blue-900', 'bg-green-900', 'bg-purple-900', 'bg-amber-900', 'bg-teal-900', 'bg-pink-900', 'bg-indigo-900'];
  const index = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const initials = title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return { color: colors[index], initials };
}

export function MovieCard({ movie }: { movie: MovieSummary }) {
  const { color, initials } = posterPlaceholder(movie.title);
  const hasPoster = movie.posterUrl && movie.posterUrl !== '';

  return (
    <Link to={`/movie/${movie.id}`} className="group">
      <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 group-hover:ring-2 ring-white/30 group-hover:scale-105 transition-all duration-200">
        {hasPoster ? (
          <img
            src={`${TMDB_IMG}/w342${movie.posterUrl}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`${color} w-full h-full flex items-center justify-center`}>
            <span className="text-3xl font-bold text-white/40">{initials}</span>
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm text-zinc-200 group-hover:text-white truncate">{movie.title}</h3>
      <p className="text-xs text-zinc-500">{movie.releaseYear} · ⭐ {movie.voteAvg}</p>
    </Link>
  );
}
