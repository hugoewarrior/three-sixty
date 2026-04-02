import { getServerSession } from '@/lib/get-session';
import { signOut } from 'next-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function getToken(): Promise<string | null> {
  try {
    const session = await getServerSession();
    return session?.user?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      void signOut({ callbackUrl: '/login' });
    }
    throw new Error('Session expired. Please sign in again.');
  }

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
    getToday: async (): Promise<ArticlesResponse> => {
      // Backend returns Article[] directly; wrap it with a client-side timestamp.
      const articles = await request<Article[]>('/news/today');
      return { articles, updatedAt: new Date().toISOString() };
    },
    getArticle: (id: string) => request<Article>(`/news/${id}`),
  },
};

export { request };
