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
    // On the client, trigger sign-out; on the server this is a no-op
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

// ---------- Typed endpoint functions (filled in as backend layers are built) ----------

export interface Article {
  id: string;
  headline: string;
  source: string;
  sourceLogo?: string;
  publishedAt: string;
  excerpt: string;
  url: string;
  category?: string;
}

export interface ArticlesResponse {
  articles: Article[];
  updatedAt: string;
}

export const apiClient = {
  news: {
    getToday: () => request<ArticlesResponse>('/news/today'),
    getArticle: (id: string) => request<Article>(`/news/${id}`),
  },
};

export { request };
