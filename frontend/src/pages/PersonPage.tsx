import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { MovieCard } from '../components/MovieCard';

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => api.getPerson(id!),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!person) return <p className="text-zinc-500">Person not found.</p>;

  return (
    <div>
      <Link to="/" className="text-zinc-500 hover:text-white text-sm mb-4 inline-block">← Back</Link>
      <h1 className="text-3xl font-bold mb-2">{person.name}</h1>
      <p className="text-zinc-400 mb-6">{person.filmography.length} movies</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {person.filmography.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
