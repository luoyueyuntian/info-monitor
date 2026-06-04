create table if not exists themes (
  id text primary key,
  name text not null,
  theme_type text not null,
  info_type text not null,
  description text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  theme_id text not null references themes(id) on delete cascade,
  name text not null,
  source_type text not null,
  adapter_key text not null,
  status text not null default 'active',
  is_paused boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  latest_success_at timestamptz,
  latest_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists source_runs (
  id text primary key,
  theme_id text not null references themes(id) on delete cascade,
  source_id text not null references sources(id) on delete cascade,
  trigger_type text not null,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists raw_snapshots (
  id text primary key,
  source_run_id text not null references source_runs(id) on delete cascade,
  theme_id text not null references themes(id) on delete cascade,
  source_id text not null references sources(id) on delete cascade,
  payload_json jsonb,
  storage_path text,
  fetched_at timestamptz not null default now()
);

create table if not exists normalized_records (
  id text primary key,
  source_run_id text not null references source_runs(id) on delete cascade,
  theme_id text not null references themes(id) on delete cascade,
  source_id text not null references sources(id) on delete cascade,
  info_type text not null,
  occurred_at timestamptz not null,
  title text not null,
  fingerprint text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists changes (
  id text primary key,
  source_run_id text not null references source_runs(id) on delete cascade,
  theme_id text not null references themes(id) on delete cascade,
  source_id text not null references sources(id) on delete cascade,
  normalized_record_id text references normalized_records(id) on delete set null,
  change_type text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  source_run_id text not null references source_runs(id) on delete cascade,
  theme_id text not null references themes(id) on delete cascade,
  source_id text not null references sources(id) on delete cascade,
  change_id text references changes(id) on delete set null,
  event_type text not null,
  signal text not null,
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  channel text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_theme_id on sources(theme_id);
create index if not exists idx_source_runs_source_id_created_at on source_runs(source_id, created_at desc);
create index if not exists idx_raw_snapshots_source_run_id on raw_snapshots(source_run_id);
create index if not exists idx_normalized_records_theme_id_occurred_at on normalized_records(theme_id, occurred_at desc);
create index if not exists idx_changes_theme_id_detected_at on changes(theme_id, detected_at desc);
create index if not exists idx_events_theme_id_occurred_at on events(theme_id, occurred_at desc);
create index if not exists idx_notifications_event_id on notifications(event_id);
