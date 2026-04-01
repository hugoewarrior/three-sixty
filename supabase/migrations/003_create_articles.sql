-- Articles table: stores article metadata, embeddings, and optional audio
-- Source info is denormalised onto the article row for fast single-table queries.
create table if not exists articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  url             text not null,
  excerpt         text,
  body            text,
  author          text,
  image_url       text,
  source_name     text not null,
  source_url      text,
  source_domain   text,
  -- published_at: full ISO string as received from the scraper (display)
  published_at    text,
  -- published_date: date part only — used for fast day-level filtering
  published_date  date,
  has_audio       boolean not null default false,
  audio_url       text,
  embedding_id    text,
  embedding       vector(1536),
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),

  constraint articles_url_unique unique (url)
);

alter table articles enable row level security;

-- Service role can insert/update/select; anon has no direct access
create policy "service_role_all" on articles
  for all to service_role using (true) with check (true);
