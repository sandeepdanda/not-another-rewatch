import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { MovieCard } from '../components/MovieCard';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

export function HomePage() {
  const { data: movies, isLoading } = useQuery({
    queryKey: ['movies', 'top-rated'],
    queryFn: () => api.browseMovies({ sort: 'rating', limit: 20 }),
  });

  return (
    <div>
      <div className="mb-12">
        <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">The Feature Presentation</p>
        <h1 className="serif text-5xl text-cream mb-3">Top Rated Movies</h1>
        <p className="text-warm max-w-2xl">The finest picks, plated with care. Each one vetted by thousands of viewers who came before you.</p>
      </div>

      {isLoading && <div className="flex justify-center py-20"><div className="spinner" /></div>}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
      >
        {movies?.map(movie => (
          <motion.div key={movie.id} variants={item}>
            <MovieCard movie={movie} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
