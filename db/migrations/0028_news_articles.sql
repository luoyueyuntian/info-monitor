-- Original text is kept out of normalized fingerprints and list payloads.
create table if not exists news_articles (
  id text primary key,
  url text not null,
  title text not null default '',
  status text not null default 'pending' check (status in ('pending','running','ready','failed')),
  content_text text,
  final_url text,
  error_message text,
  fetched_at timestamptz,
  claim_token text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_news_articles_queue on news_articles(requested_at desc nulls last, created_at)
  where status in ('pending','running');
