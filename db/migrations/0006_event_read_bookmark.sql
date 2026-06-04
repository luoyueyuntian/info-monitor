alter table events
  add column if not exists is_read boolean not null default false,
  add column if not exists is_bookmarked boolean not null default false;

create index if not exists idx_events_is_read on events(is_read);
create index if not exists idx_events_is_bookmarked on events(is_bookmarked);
