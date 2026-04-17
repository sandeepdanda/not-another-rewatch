import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
import { PageTransition } from './components/PageTransition';
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
    <nav className="sticky top-0 z-40 glass px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🎬</span>
          <span className="serif text-xl text-cream group-hover:text-amber transition-colors">
            Not Another Rewatch
          </span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <SearchBar />
          <Link to="/" className="text-warm hover:text-cream transition-colors">Home</Link>
          <Link to="/browse" className="text-warm hover:text-cream transition-colors">Browse</Link>
          <Link to="/chat" className="text-warm hover:text-cream transition-colors">Chat</Link>
          {user ? (
            <>
              <Link to="/watchlist" className="text-warm hover:text-cream transition-colors">Watchlist</Link>
              <Link to="/stats" className="text-warm hover:text-cream transition-colors">Stats</Link>
              <span className="text-muted">·</span>
              <span className="text-warm">{user.username}</span>
              <button onClick={logout} className="text-muted hover:text-cream transition-colors cursor-pointer">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-amber hover:text-warm transition-colors">Sign In</Link>
          )}
          <button onClick={() => setLight(!light)}
            className="text-muted hover:text-amber transition-colors cursor-pointer text-base"
            title="Toggle theme">
            {light ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/browse" element={<PageTransition><BrowsePage /></PageTransition>} />
        <Route path="/movie/:id" element={<PageTransition><MoviePage /></PageTransition>} />
        <Route path="/persons/:id" element={<PageTransition><PersonPage /></PageTransition>} />
        <Route path="/chat" element={<PageTransition><ChatPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/watchlist" element={<PageTransition><WatchlistPage /></PageTransition>} />
        <Route path="/stats" element={<PageTransition><StatsPage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="grain min-h-screen bg-primary text-cream">
            <Nav />
            <main className="mx-auto max-w-7xl px-6 py-12 relative z-10">
              <AnimatedRoutes />
            </main>
            <footer className="relative z-10 border-t border-warm py-8 text-center text-sm text-muted">
              <p className="serif italic">Made with ❤️ and more caffeine than medically advisable</p>
              <p className="mt-1">No movies were rewatched in the making of this app 🍿</p>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
