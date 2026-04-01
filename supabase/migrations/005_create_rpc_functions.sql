-- match_articles: semantic similarity search via cosine distance
-- Called by the API's search-news agent tool.
create or replace function match_articles(
  query_embedding  vector(1536),
  match_count      int,
  match_threshold  float default 0.5,
  date_from        text  default null
)
returns table (
  id            uuid,
  title         text,
  url           text,
  excerpt       text,
  source_name   text,
  source_url    text,
  source_domain text,
  published_at  text,
  has_audio     boolean,
  similarity    float
)
language sql stable
as $$
  select
    a.id,
    a.title,
    a.url,
    a.excerpt,
    a.source_name,
    a.source_url,
    a.source_domain,
    a.published_at,
    a.has_audio,
    1 - (a.embedding <=> query_embedding) as similarity
  from articles a
  where
    a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
    and (date_from is null or a.published_date >= date_from::date)
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

-- get_today_articles: convenience function for the news dashboard
create or replace function get_today_articles()
returns table (
  id            uuid,
  title         text,
  url           text,
  excerpt       text,
  source_name   text,
  source_url    text,
  source_domain text,
  published_at  text,
  has_audio     boolean,
  created_at    timestamptz
)
language sql stable
as $$
  select
    id,
    title,
    url,
    excerpt,
    source_name,
    source_url,
    source_domain,
    published_at,
    has_audio,
    created_at
  from articles
  where published_date = current_date
  order by source_name asc, created_at desc;
$$;
