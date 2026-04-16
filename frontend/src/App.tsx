import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './pages/HomePage';
import { MoviePage } from './pages/MoviePage';
import { BrowsePage } from './pages/BrowsePage';
import { PersonPage } from './pages/PersonPage';
import { SearchBar } from './components/SearchBar';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 }, // 5 min cache
  },
});

function Nav() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white">
          🎬 Not Another Rewatch
        </Link>
        <div className="flex gap-4">
          <SearchBar />
          <Link to="/" className="text-zinc-400 hover:text-white">Home</Link>
          <Link to="/browse" className="text-zinc-400 hover:text-white">Browse</Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <Nav />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/movies/:id" element={<MoviePage />} />
              <Route path="/persons/:id" element={<PersonPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
