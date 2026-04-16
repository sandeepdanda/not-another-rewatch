export interface MovieSummary {
  id: string;
  title: string;
  releaseYear: string;
  voteAvg: number;
  popularity: number;
  posterUrl: string | null;
}

export interface MovieResponse {
  id: string;
  title: string;
  overview: string;
  releaseDate: string;
  releaseYear: string;
  budget: number;
  revenue: number;
  runtime: number;
  tagline: string | null;
  status: string;
  voteAvg: number;
  voteCount: number;
  popularity: number;
  posterUrl: string | null;
  genres: Genre[];
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  name: string;
  character: string;
  order: number;
}

export interface CrewMember {
  name: string;
  department: string;
  job: string;
}

export interface PersonResponse {
  id: string;
  name: string;
  filmography: MovieSummary[];
}
