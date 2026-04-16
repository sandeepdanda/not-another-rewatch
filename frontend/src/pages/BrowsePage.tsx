import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { MovieCard } from '../components/MovieCard';

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'];

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const genre = params.get('genre') || undefined;
  const decade = params.get('decade') || undefined;
  const sort = params.get('sort') || 'rating';

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: api.getGenres,
  });

  const { data: movies, isLoading } = useQuery({
    queryKey: ['movies', 'browse', genre, decade, sort],
    queryFn: () => api.browseMovies({ genre, decade, sort, limit: 20 }),
  });

  function setFilter(key: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Clear decade when setting genre and vice versa
    if (key === 'genre') next.delete('decade');
    if (key === 'decade') next.delete('genre');
    setParams(next);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Browse Movies</h1>

      {/* Genre chips */}
      <div className="mb-4">
        <h3 className="text-sm text-zinc-500 mb-2">Genre</h3>
        <div className="flex flex-wrap gap-2">
          {genres?.map(g => (
            <button key={g}
              onClick={() => setFilter('genre', genre === g ? undefined : g)}
              className={`rounded-full px-3 py-1 text-xs transition ${genre === g ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Decade chips */}
      <div className="mb-4">
        <h3 className="text-sm text-zinc-500 mb-2">Decade</h3>
        <div className="flex flex-wrap gap-2">
          {DECADES.map(d => (
            <button key={d}
              onClick={() => setFilter('decade', decade === d ? undefined : d)}
              className={`rounded-full px-3 py-1 text-xs transition ${decade === d ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Sort toggle */}
      <div className="mb-8 flex gap-2">
        <button onClick={() => setFilter('sort', 'rating')}
          className={`text-xs px-3 py-1 rounded ${sort === 'rating' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>
          By Rating
        </button>
        <button onClick={() => setFilter('sort', 'popularity')}
          className={`text-xs px-3 py-1 rounded ${sort === 'popularity' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>
          By Popularity
        </button>
      </div>

      {isLoading && <p className="text-zinc-500">Loading...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies?.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      {movies?.length === 0 && !isLoading && (
        <p className="text-zinc-500">No movies found. Try a different filter.</p>
      )}
    </div>
  );
}
