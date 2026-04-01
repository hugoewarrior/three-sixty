import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { getArticleById } from '../../services/supabase';

export const getArticleTool = tool({
  description:
    'Retrieves the full content of a specific news article by its ID. Use this when you need the complete body text, author, and all details of an article.',
  inputSchema: zodSchema(z.object({
    articleId: z
      .string()
      .describe('The unique identifier of the article to retrieve'),
  })),
  execute: async ({ articleId }) => {
    const article = await getArticleById(articleId);

    if (!article) {
      return { error: `Article with ID "${articleId}" not found` };
    }

    return {
      id: article.id,
      title: article.title,
      body: article.body,
      excerpt: article.excerpt,
      author: article.author,
      source: article.source.name,
      sourceUrl: article.source.url,
      url: article.url,
      publishedAt: article.publishedAt,
      tags: article.tags,
      audioUrl: article.audioUrl,
    };
  },
});
