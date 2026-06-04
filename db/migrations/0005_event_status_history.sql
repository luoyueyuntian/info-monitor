create table if not exists event_status_history (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_event_status_history_event_id_changed_at
  on event_status_history(event_id, changed_at desc);
