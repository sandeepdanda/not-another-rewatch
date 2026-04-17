import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { HomePage } from './pages/HomePage';
import { MoviePage } from './pages/MoviePage';
import { BrowsePage } from './pages/BrowsePage';
import { PersonPage } from './pages/PersonPage';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { StatsPage } from './pages/StatsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SearchBar } from './components/SearchBar';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
  },
});

function Nav() {
  const { user, logout } = useAuth();
  const [light, setLight] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  }, [light]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white">
          🎬 Not Another Rewatch
        </Link>
        <div className="flex items-center gap-4">
          <SearchBar />
          <Link to="/" className="text-zinc-400 hover:text-white">Home</Link>
          <Link to="/browse" className="text-zinc-400 hover:text-white">Browse</Link>
          <Link to="/chat" className="text-zinc-400 hover:text-white">Chat</Link>
          {user ? (
            <>
              <Link to="/watchlist" className="text-zinc-400 hover:text-white">Watchlist</Link>
              <Link to="/stats" className="text-zinc-400 hover:text-white">Stats</Link>
              <span className="text-sm text-zinc-400">{user.username}</span>
              <button onClick={logout} className="text-sm text-zinc-500 hover:text-white">Logout</button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300">Sign In</Link>
          )}
          <button onClick={() => setLight(!light)} className="text-sm text-zinc-500 hover:text-white">
            {light ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Nav />
            <main className="mx-auto max-w-6xl px-6 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/movie/:id" element={<MoviePage />} />
                <Route path="/persons/:id" element={<PersonPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/login" element={<LoginPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-600">
              Made with ❤️ and way too much caffeine · No movies were rewatched in the making of this app 🍿
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
