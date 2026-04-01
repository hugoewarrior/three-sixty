-- Index on published_date for fast daily queries
create index if not exists articles_published_date_idx
  on articles (published_date desc);

-- ivfflat vector index for fast cosine similarity search
-- lists=100 is appropriate for up to ~1M rows; re-tune as data grows
-- NOTE: requires at least 100 rows before the index is usable;
--       run ANALYZE articles; after bulk ingestion
create index if not exists articles_embedding_idx
  on articles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
