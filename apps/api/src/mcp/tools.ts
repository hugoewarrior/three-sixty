import { z } from 'zod';
import { mcpServer } from './server';
import { generateEmbedding } from '../services/embeddings';
import { matchArticles, getArticleById, updateArticleAudio } from '../services/supabase';
import { synthesizeSpeech } from '../services/tts';

/**
 * search_news — Semantic search over the Panama news vector database
 */
mcpServer.registerTool(
  // Name
  "search_news",
  // Config
  {
    title: 'search_news',
    description: 'Searches the Supabase vector database for Panama news articles semantically similar to the query. Returns a ranked list of matching articles with titles, excerpts, sources, and URLs.',
    inputSchema: {
      query: z.string().describe('The search query to find relevant articles'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .default(5)
        .describe('Maximum number of articles to return (1-10)'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Optional ISO date string (YYYY-MM-DD) to filter articles published after this date'
        ),
    },
  },
  // Function
  async ({ query, limit, dateFrom }) => {
    const embedding = await generateEmbedding(query);
    const articles = await matchArticles(embedding, limit, dateFrom);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            articles.map((a) => ({
              id: a.id,
              title: a.title,
              excerpt: a.excerpt,
              source: a.source.name,
              url: a.url,
              publishedAt: a.publishedAt,
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

/**
 * get_article — Fetch full article content by ID
 */
mcpServer.registerTool(
  "get_article",
  {
    title: 'get_article',
    description: 'Retrieves the full content of a specific Panama news article by its unique ID. Returns the complete body text, author, source, publication date, and any available audio URL.',
    inputSchema: {
      articleId: z.string().describe('The unique identifier of the article'),
    }
  },
  async ({ articleId }) => {
    const article = await getArticleById(articleId);

    if (!article) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Article "${articleId}" not found` }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              id: article.id,
              title: article.title,
              body: article.body,
              author: article.author,
              source: article.source.name,
              sourceUrl: article.source.url,
              url: article.url,
              publishedAt: article.publishedAt,
              tags: article.tags,
              audioUrl: article.audioUrl,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

/**
 * web_search — Live web search for recent Panama news
 */
mcpServer.registerTool("web_search",
  {
    title: 'web_search',
    description: 'Performs a live web search for recent Panama news not yet indexed in the vector database. Useful for breaking news from the last few hours. Restricted to Panamanian news domains by default.',
    inputSchema: {
      query: z.string().describe('The search query'),
      site: z
        .string()
        .optional()
        .describe('Optional domain to restrict search (e.g. "prensa.com")'),
    },
  },
  async ({ query, site }) => {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY not configured');
    }

    const PANAMANIAN_DOMAINS = [
      'laestrella.com.pa',
      'prensa.com',
      'tvn-2.com',
      'epasa.com',
      'critica.com.pa',
      'telemetro.com',
    ];

    let searchQuery = query;
    if (site) {
      searchQuery = `site:${site} ${query}`;
    } else {
      const domainFilter = PANAMANIAN_DOMAINS.map((d) => `site:${d}`).join(' OR ');
      searchQuery = `${query} Panamá (${domainFilter})`;
    }

    const params = new URLSearchParams({
      q: searchQuery,
      count: '10',
      country: 'PA',
      search_lang: 'es',
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      {
        headers: {
          'X-Subscription-Token': apiKey,
          Accept: 'application/json',
        },
      }
    );

    const data = (await response.json()) as {
      web?: { results?: Array<{ title: string; url: string; description: string; page_fetched?: string }> };
    };

    const results = (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? '',
      publishedDate: r.page_fetched ?? null,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

/**
 * generate_audio — TTS synthesis and S3 upload
 */
mcpServer.registerTool("generate_audio",
  {
    title: 'generate_audio',
    description: 'Generates a spoken-word audio file from a news summary text using AWS Polly and stores it in S3. Returns a pre-signed URL for the audio file valid for 1 hour.',
    inputSchema: {
      text: z
        .string()
        .max(3000)
        .describe('The summary text to synthesize (max 3000 characters)'),
      articleId: z
        .string()
        .describe('The article ID used to name the S3 object and update the database'),
    },
  },
  async ({ text, articleId }) => {
    const audioUrl = await synthesizeSpeech(text, articleId);
    await updateArticleAudio(articleId, audioUrl);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ audioUrl }, null, 2),
        },
      ],
    };
  }
);
