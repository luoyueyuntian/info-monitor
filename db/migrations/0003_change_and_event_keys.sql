alter table changes
  add column if not exists change_key text;

alter table events
  add column if not exists event_key text;

create unique index if not exists idx_changes_change_key_unique
  on changes(change_key);

create unique index if not exists idx_events_event_key_unique
  on events(event_key);
