import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { generateEmbedding } from '../../services/embeddings';
import { matchArticles } from '../../services/supabase';

export const searchNewsTool = tool({
  description:
    'Searches the Supabase vector database for news articles semantically similar to a query. Use this tool to find relevant Panama news articles based on topics, events, or keywords.',
  inputSchema: zodSchema(z.object({
    query: z
      .string()
      .describe('The search query to find relevant news articles'),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe('Maximum number of articles to return (1-10, default 5)'),
    dateFrom: z
      .string()
      .optional()
      .describe(
        'Optional ISO date string (YYYY-MM-DD) to filter results to articles published after this date'
      ),
  })),
  execute: async ({ query, limit, dateFrom }) => {
    const embedding = await generateEmbedding(query);
    const articles = await matchArticles(embedding, limit, dateFrom);

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      hasAudio: article.hasAudio,
    }));
  },
});
