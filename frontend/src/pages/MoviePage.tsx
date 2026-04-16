import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

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

  return (
    <div className="max-w-3xl">
      <Link to="/" className="text-zinc-500 hover:text-white text-sm mb-4 inline-block">← Back</Link>

      <h1 className="text-4xl font-bold mb-1">{movie.title}</h1>
      <p className="text-zinc-400 mb-4">
        {movie.releaseYear} · {movie.runtime} min · ⭐ {movie.voteAvg} ({movie.voteCount} votes)
      </p>

      {movie.tagline && <p className="text-zinc-500 italic mb-4">"{movie.tagline}"</p>}

      <div className="flex gap-2 mb-6">
        {movie.genres.map(g => (
          <Link key={g.id} to={`/browse?genre=${g.name}`}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
            {g.name}
          </Link>
        ))}
      </div>

      <p className="text-zinc-300 leading-relaxed mb-8">{movie.overview}</p>

      {director && (
        <p className="text-sm text-zinc-400 mb-6">
          Directed by <Link to={`/persons/${movie.crew.find(c => c.job === 'Director')?.name}`} className="text-white hover:underline">{director.name}</Link>
        </p>
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
        <div>Budget: ${(movie.budget / 1_000_000).toFixed(0)}M</div>
        <div>Revenue: ${(movie.revenue / 1_000_000).toFixed(0)}M</div>
        <div>Status: {movie.status}</div>
        <div>Release: {movie.releaseDate}</div>
      </div>
    </div>
  );
}
