-- Sources table: configured Panamanian news sources for the ingestion worker
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  base_url    text not null,
  type        text not null check (type in ('website', 'instagram')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table sources enable row level security;

-- Service role can do anything; anon can read (public news source list)
create policy "service_role_all" on sources
  for all to service_role using (true) with check (true);

create policy "anon_select" on sources
  for select to anon using (true);
