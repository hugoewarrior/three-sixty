-- Seed initial Panamanian news sources
-- The ingestion worker reads from this table to know which sites to scrape.
insert into sources (name, base_url, type) values
  ('La Prensa',             'https://www.prensa.com',              'website'),
  ('TVN Noticias',          'https://www.tvn-2.com',               'website'),
  ('Telemetro',             'https://www.telemetro.com',           'website'),
  ('Panama America',        'https://www.panamaamerica.com.pa',    'website'),
  ('La Estrella de Panamá', 'https://www.laestrella.com.pa',       'website'),
  ('Crítica',               'https://www.critica.com.pa',          'website'),
  ('RPC',                   'https://www.rpc.com.pa',              'website')
on conflict do nothing;
