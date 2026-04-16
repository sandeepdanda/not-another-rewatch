import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovie(id!),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!movie) return <p className="text-zinc-500">Movie not found.</p>;

  const director = movie.crew.find(c => c.job === 'Director');
  const hasPoster = movie.posterUrl && movie.posterUrl !== '';

  return (
    <div>
      <Link to="/" className="text-zinc-500 hover:text-white text-sm mb-6 inline-block">← Back</Link>

      <div className="flex gap-8">
        {/* Poster */}
        <div className="hidden sm:block w-64 shrink-0">
          {hasPoster ? (
            <img src={`${TMDB_IMG}/w500${movie.posterUrl}`} alt={movie.title}
              className="rounded-lg w-full" />
          ) : (
            <div className="aspect-[2/3] rounded-lg bg-zinc-800 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/20">
                {movie.title.split(' ').slice(0, 2).map(w => w[0]).join('')}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-bold mb-1">{movie.title}</h1>
          <p className="text-zinc-400 mb-4">
            {movie.releaseYear} · {movie.runtime} min · ⭐ {movie.voteAvg} ({movie.voteCount} votes)
          </p>

          {movie.tagline && <p className="text-zinc-500 italic mb-4">"{movie.tagline}"</p>}

          <div className="flex flex-wrap gap-2 mb-6">
            {movie.genres.map(g => (
              <Link key={g.id} to={`/browse?genre=${g.name}`}
                className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
                {g.name}
              </Link>
            ))}
          </div>

          <p className="text-zinc-300 leading-relaxed mb-6">{movie.overview}</p>

          {director && (
            <p className="text-sm text-zinc-400 mb-8">Directed by <span className="text-white">{director.name}</span></p>
          )}

          <h2 className="text-xl font-semibold mb-3">Cast</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {movie.cast.map((c, i) => (
              <div key={i} className="rounded-lg bg-zinc-900 p-3">
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-zinc-500">as {c.character}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
            {movie.budget > 0 && <div>Budget: ${(movie.budget / 1_000_000).toFixed(0)}M</div>}
            {movie.revenue > 0 && <div>Revenue: ${(movie.revenue / 1_000_000).toFixed(0)}M</div>}
            <div>Status: {movie.status}</div>
            <div>Release: {movie.releaseDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
