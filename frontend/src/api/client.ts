import type { MovieResponse, MovieSummary, PersonResponse } from './types';

const BASE = '/api/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getMovie: (id: string) => get<MovieResponse>(`/movies/${id}`),

  browseMovies: (params: { genre?: string; decade?: string; sort?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.genre) query.set('genre', params.genre);
    if (params.decade) query.set('decade', params.decade);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', String(params.limit));
    return get<MovieSummary[]>(`/movies?${query}`);
  },

  getPerson: (id: string) => get<PersonResponse>(`/persons/${id}`),

  getGenres: () => get<string[]>(`/genres`),
};
