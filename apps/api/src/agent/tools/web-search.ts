import { tool, zodSchema } from 'ai';
import { z } from 'zod';

// Known Panamanian news domains for filtering
const PANAMANIAN_DOMAINS = [
  'laestrella.com.pa',
  'prensa.com',
  'tvn-2.com',
  'epasa.com',
  'critica.com.pa',
  'telemetro.com',
  'rpc.com.pa',
  'panamaamerica.com.pa',
  'elsiglo.com.pa',
  'elpanamaamerica.com.pa',
  'mia.com.pa',
  'eco.com.pa',
];

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  page_fetched?: string;
  extra_snippets?: string[];
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export const webSearchTool = tool({
  description:
    'Falls back to a live web search for very recent Panama news not yet in the vector database. Use this when search-news returns no results or when the user asks about breaking news from the last few hours.',
  inputSchema: zodSchema(z.object({
    query: z
      .string()
      .describe('The search query for finding recent Panama news'),
    site: z
      .string()
      .optional()
      .describe(
        'Optional: restrict search to a specific domain (e.g. "prensa.com")'
      ),
  })),
  execute: async ({ query, site }) => {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY is not configured');
    }

    // Build the search query — restrict to Panama when no specific site is given
    let searchQuery = query;
    if (site) {
      searchQuery = `site:${site} ${query}`;
    } else {
      // Add Panama context and filter to known domains
      const domainFilter = PANAMANIAN_DOMAINS.map((d) => `site:${d}`).join(
        ' OR '
      );
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
          'Accept-Encoding': 'gzip',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Brave Search API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description ?? result.extra_snippets?.[0] ?? '',
      publishedDate: result.page_fetched ?? null,
    }));
  },
});
