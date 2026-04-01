import { Request, Response } from 'express';
import { getTodaysArticles, getArticleById } from '../services/supabase';
import type { ArticleSummary } from '@panama-news/shared-types';
import { authGuard } from '../middleware/auth-guard';

// In-memory cache for today's articles (resets per cold start)
interface CacheEntry {
  data: ArticleSummary[];
  expiresAt: number;
}

let todayCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /news/today
 * Returns today's articles, cached for 5 minutes.
 */
export const today = [
  authGuard,
  async (_req: Request, res: Response): Promise<void> => {
    const now = Date.now();

    // Return cached data if still valid
    if (todayCache && todayCache.expiresAt > now) {
      res.json(todayCache.data);
      return;
    }

    try {
      const articles = await getTodaysArticles();

      todayCache = {
        data: articles,
        expiresAt: now + CACHE_TTL_MS,
      };

      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch today articles:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  },
];

/**
 * GET /news/:id
 * Returns a single article by ID or 404 if not found.
 */
export const article = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Article ID is required' });
      return;
    }

    try {
      const articleData = await getArticleById(id);

      if (!articleData) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(articleData);
    } catch (error) {
      console.error('Failed to fetch article:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  },
];

// ─── Lambda-compatible single-function exports for Serverless Framework ───────

async function runWithAuthGuard(
  req: Request,
  res: Response,
  fn: (req: Request, res: Response) => Promise<void>
): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
  });
  if (!res.headersSent) {
    await fn(req, res);
  }
}

export async function todayHandler(req: Request, res: Response): Promise<void> {
  const now = Date.now();
  await runWithAuthGuard(req, res, async (_req, _res) => {
    if (todayCache && todayCache.expiresAt > now) {
      _res.json(todayCache.data);
      return;
    }
    try {
      const articles = await getTodaysArticles();
      todayCache = { data: articles, expiresAt: now + CACHE_TTL_MS };
      _res.json(articles);
    } catch (error) {
      console.error('Failed to fetch today articles:', error);
      _res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });
}

export async function articleHandler(req: Request, res: Response): Promise<void> {
  await runWithAuthGuard(req, res, async (_req, _res) => {
    const id = _req.params['id'];
    if (!id) {
      _res.status(400).json({ error: 'Article ID is required' });
      return;
    }
    try {
      const articleData = await getArticleById(id);
      if (!articleData) {
        _res.status(404).json({ error: 'Article not found' });
        return;
      }
      _res.json(articleData);
    } catch (error) {
      console.error('Failed to fetch article:', error);
      _res.status(500).json({ error: 'Failed to fetch article' });
    }
  });
}
