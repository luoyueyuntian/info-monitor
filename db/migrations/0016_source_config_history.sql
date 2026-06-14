-- Source configuration version history.
-- Stores a snapshot of the source config before each update,
-- enabling diff display and rollback.
create table if not exists source_config_history (
  id text primary key,
  source_id text not null references sources(id) on delete cascade,
  config jsonb not null,
  version int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_config_history_source on source_config_history(source_id, version desc);
