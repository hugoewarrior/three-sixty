import { mcpServer } from './server';
import { getTodaysArticles } from '../services/supabase';

/**
 * news://today — Returns today's full article list as a JSON resource
 */
mcpServer.registerResource(
  'news-today',
  'news://today',
  {
    description:
      "Returns today's full list of Panama news articles as a JSON resource. Updated every few minutes.",
    mimeType: 'application/json',
  },
  async () => {
    const articles = await getTodaysArticles();

    return {
      contents: [
        {
          uri: 'news://today',
          mimeType: 'application/json',
          text: JSON.stringify(articles, null, 2),
        },
      ],
    };
  }
);

/**
 * news://sources — Returns the list of configured Panamanian news sources
 */
mcpServer.registerResource(
  'news-sources',
  'news://sources',
  {
    description:
      'Returns the static list of Panamanian news sources monitored by the Three Sixty platform.',
    mimeType: 'application/json',
  },
  async () => {
    const sources = [
      {
        name: 'La Estrella de Panamá',
        domain: 'laestrella.com.pa',
        url: 'https://www.laestrella.com.pa',
        language: 'es',
      },
      {
        name: 'La Prensa',
        domain: 'prensa.com',
        url: 'https://www.prensa.com',
        language: 'es',
      },
      {
        name: 'TVN Noticias',
        domain: 'tvn-2.com',
        url: 'https://www.tvn-2.com',
        language: 'es',
      },
      {
        name: 'El Panamá América',
        domain: 'epasa.com',
        url: 'https://www.epasa.com',
        language: 'es',
      },
      {
        name: 'Crítica',
        domain: 'critica.com.pa',
        url: 'https://www.critica.com.pa',
        language: 'es',
      },
      {
        name: 'Telemetro',
        domain: 'telemetro.com',
        url: 'https://www.telemetro.com',
        language: 'es',
      },
      {
        name: 'RPC Radio',
        domain: 'rpc.com.pa',
        url: 'https://www.rpc.com.pa',
        language: 'es',
      },
      {
        name: 'Panamá América',
        domain: 'panamaamerica.com.pa',
        url: 'https://www.panamaamerica.com.pa',
        language: 'es',
      },
      {
        name: 'El Siglo',
        domain: 'elsiglo.com.pa',
        url: 'https://www.elsiglo.com.pa',
        language: 'es',
      }
    ];

    return {
      contents: [
        {
          uri: 'news://sources',
          mimeType: 'application/json',
          text: JSON.stringify(sources, null, 2),
        },
      ],
    };
  }
);
