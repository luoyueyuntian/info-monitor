alter table events
  add column if not exists bookmarked_at timestamptz;

create index if not exists idx_events_bookmarked_at on events(bookmarked_at desc);
