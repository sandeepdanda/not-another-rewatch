import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { MovieCard } from '../components/MovieCard';

export function HomePage() {
  const { data: movies, isLoading } = useQuery({
    queryKey: ['movies', 'top-rated'],
    queryFn: () => api.browseMovies({ sort: 'rating', limit: 20 }),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Top Rated Movies</h1>
      <p className="text-zinc-400 mb-8">The best of the best, sorted by rating.</p>

      {isLoading && <p className="text-zinc-500">Loading...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies?.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
