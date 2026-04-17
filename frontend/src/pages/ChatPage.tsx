import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import type { MovieSummary } from '../api/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  movies?: MovieSummary[];
}

const SUGGESTIONS = [
  { emoji: '⏰', text: 'Movies about time travel and paradoxes' },
  { emoji: '🕵️', text: 'Dark crime thrillers with plot twists' },
  { emoji: '☕', text: 'Feel-good movies for a rainy day' },
  { emoji: '🗡️', text: 'Epic fantasy adventures' },
  { emoji: '🚀', text: 'Mind-bending sci-fi' },
  { emoji: '💔', text: 'Emotional dramas that make you cry' },
];

const TMDB_IMG = 'https://image.tmdb.org/t/p';
const EASING = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && messages.length === 0 && !streaming) {
      send(q);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    setMessages(prev => [...prev, { role: 'user', text: text.trim() }]);
    setInput('');
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

    try {
      const res = await api.chat(text.trim());
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let movies: MovieSummary[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:movies') || line.startsWith('event:done')) continue;
          if (line.startsWith('data:')) {
            const data = line.slice(5);
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) { movies = parsed; continue; }
            } catch { /* text token */ }
            fullText += data;
            setMessages(prev => {
              const u = [...prev];
              u[u.length - 1] = { role: 'assistant', text: fullText, movies };
              return u;
            });
          }
        }
      }
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: 'assistant', text: fullText, movies };
        return u;
      });
    } catch {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: 'assistant', text: 'Something went wrong. Try again!' };
        return u;
      });
    }
    setStreaming(false);
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-8rem)] -mx-6">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-burgundy/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-hide">
        <div className="max-w-3xl mx-auto">
          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center pt-16"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-6xl mb-6 inline-block"
              >
                🎞️
              </motion.div>
              <p className="text-xs tracking-[0.3em] uppercase text-amber mb-3">The Sommelier</p>
              <h1 className="serif text-5xl text-cream mb-3">What's your mood tonight?</h1>
              <p className="text-warm mb-12 max-w-lg mx-auto">
                Tell me what you're craving. Describe the feeling, the vibe, the energy. I'll pour something to match.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                    whileHover={{ y: -2 }}
                    onClick={() => send(s.text)}
                    className="flex items-center gap-3 rounded-xl bg-tertiary/70 backdrop-blur border border-warm hover:border-amber-500/40 px-4 py-3 text-sm text-warm hover:text-cream transition-all cursor-pointer text-left"
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span>{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASING }}
                className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-burgundy/30 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-base">🎞️</span>
                  </div>
                )}
                <div className={`max-w-xl ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`rounded-2xl px-5 py-3 ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-[#0a0f1a]'
                      : 'bg-tertiary/70 backdrop-blur text-cream border border-warm'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.text}
                      {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                        <span className="inline-block w-1 h-4 bg-amber ml-0.5 animate-pulse" />
                      )}
                    </p>
                  </div>

                  {/* Movie recommendations as horizontal cards */}
                  {msg.movies && msg.movies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="mt-3 space-y-2"
                    >
                      {msg.movies.slice(0, 5).map((m, idx) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.3 + idx * 0.08 }}
                        >
                          <Link
                            to={`/movie/${m.id}`}
                            className="group flex items-center gap-4 rounded-xl bg-tertiary/50 hover:bg-elevated border border-warm hover:border-amber-500/40 p-3 transition-all"
                          >
                            {m.posterUrl ? (
                              <img
                                src={`${TMDB_IMG}/w92${m.posterUrl}`}
                                alt=""
                                className="w-12 h-18 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-18 rounded bg-elevated flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="serif text-base text-cream group-hover:text-amber-400 truncate transition-colors">
                                {m.title}
                              </p>
                              <p className="text-xs text-muted mt-0.5">
                                {m.releaseYear} · ⭐ {m.voteAvg}
                              </p>
                            </div>
                            <span className="text-amber opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber text-sm font-medium">
                    You
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-warm px-6 py-4 backdrop-blur-xl bg-primary/80">
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe what you want to watch..."
            disabled={streaming}
            className="flex-1 rounded-full bg-tertiary border border-warm px-5 py-3 text-sm text-cream placeholder-muted outline-none focus:border-amber-500/40 transition-all"
          />
          <motion.button
            type="submit"
            disabled={streaming || !input.trim()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-amber-500 hover:bg-amber-400 px-6 py-3 text-sm font-medium text-[#0a0f1a] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {streaming ? 'Thinking...' : 'Send'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
