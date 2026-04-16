import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Debounce: wait 300ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: results } = useQuery({
    queryKey: ['search', debouncedQuery, aiMode],
    queryFn: () => aiMode ? api.semanticSearch(debouncedQuery) : api.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        onClick={() => setAiMode(!aiMode)}
        className={`text-xs px-2 py-1 rounded ${aiMode ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
        title={aiMode ? 'AI semantic search' : 'Title search'}
      >
        {aiMode ? '🧠 AI' : '🔤 Title'}
      </button>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search movies..."
        className="w-48 sm:w-64 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-1 ring-zinc-600"
      />

      {open && results && results.length > 0 && (
        <div className="absolute top-full mt-1 w-80 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-50 max-h-96 overflow-y-auto">
          {results.map(movie => (
            <Link
              key={movie.id}
              to={`/movies/${movie.id}`}
              onClick={() => { setOpen(false); setQuery(''); }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition"
            >
              {movie.posterUrl ? (
                <img src={`${TMDB_IMG}/w92${movie.posterUrl}`} alt="" className="w-8 h-12 rounded object-cover" />
              ) : (
                <div className="w-8 h-12 rounded bg-zinc-700" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-zinc-200 truncate">{movie.title}</p>
                <p className="text-xs text-zinc-500">{movie.releaseYear} · ⭐ {movie.voteAvg}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
