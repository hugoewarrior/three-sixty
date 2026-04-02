const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ── Types (aligned with the ArticleSummary / Article shapes from the API) ──────

export interface ArticleSource {
  name: string;
  url: string;
  domain: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  source: ArticleSource;
  url: string;
  publishedAt: string;
  hasAudio: boolean;
  body?: string;
  author?: string;
  imageUrl?: string;
  audioUrl?: string;
  tags?: string[];
}

export interface ArticlesResponse {
  articles: Article[];
  updatedAt: string;
}

// ── API client ─────────────────────────────────────────────────────────────────

export const apiClient = {
  news: {
    getToday: async (token: string | null): Promise<ArticlesResponse> => {
      const articles = await request<Article[]>('/news/today', token);
      return { articles, updatedAt: new Date().toISOString() };
    },
    getArticle: (id: string, token: string | null) =>
      request<Article>(`/news/${id}`, token),
  },
};
