import { getSupabaseClient } from '../lib/supabase-client';
import type { Article, ArticleSummary } from '@panama-news/shared-types';

function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function getTodaysArticles(): Promise<ArticleSummary[]> {
  const supabase = getSupabaseClient();
  const today = toISODateString(new Date());

  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, title, excerpt, source_name, source_url, source_domain, url, published_at, has_audio'
    )
    .eq('published_date', today)
    .order('source_name', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch today's articles: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    source: {
      name: row.source_name as string,
      url: row.source_url as string,
      domain: row.source_domain as string,
    },
    url: row.url as string,
    publishedAt: row.published_at as string,
    hasAudio: Boolean(row.has_audio),
  }));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch article: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    title: data.title as string,
    excerpt: data.excerpt as string,
    source: {
      name: data.source_name as string,
      url: data.source_url as string,
      domain: data.source_domain as string,
    },
    url: data.url as string,
    publishedAt: data.published_at as string,
    hasAudio: Boolean(data.has_audio),
    body: data.body as string,
    author: data.author as string | undefined,
    imageUrl: data.image_url as string | undefined,
    audioUrl: data.audio_url as string | undefined,
    embeddingId: data.embedding_id as string | undefined,
    tags: (data.tags as string[]) ?? [],
  };
}

export async function matchArticles(
  embedding: number[],
  limit: number,
  dateFrom?: string
): Promise<ArticleSummary[]> {
  const supabase = getSupabaseClient();

  const rpcParams: {
    query_embedding: number[];
    match_count: number;
    date_from?: string;
  } = {
    query_embedding: embedding,
    match_count: limit,
  };

  if (dateFrom) {
    rpcParams.date_from = dateFrom;
  }

  const { data, error } = await supabase.rpc('match_articles', rpcParams);

  if (error) {
    throw new Error(`Failed to match articles: ${error.message}`);
  }

  return (data ?? []).map(
    (row: {
      id: string;
      title: string;
      excerpt: string;
      source_name: string;
      source_url: string;
      source_domain: string;
      url: string;
      published_at: string;
      has_audio: boolean;
    }) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      source: {
        name: row.source_name,
        url: row.source_url,
        domain: row.source_domain,
      },
      url: row.url,
      publishedAt: row.published_at,
      hasAudio: Boolean(row.has_audio),
    })
  );
}

export async function updateArticleAudio(
  id: string,
  audioUrl: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('articles')
    .update({ audio_url: audioUrl, has_audio: true })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update article audio: ${error.message}`);
  }
}
