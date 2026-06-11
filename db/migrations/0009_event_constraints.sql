-- Add check constraint for valid event statuses
alter table events
  add constraint chk_events_status check (status in ('open', 'tracking', 'ignored', 'resolved'));

-- Add check constraint for valid event signals
-- Using a flexible approach: allow known signals plus any string starting with a letter
alter table events
  add constraint chk_events_signal check (signal ~ '^[a-z][a-z0-9_]*$');

-- Add check constraint for valid info types in normalized_records
alter table normalized_records
  add constraint chk_normalized_records_info_type check (info_type in ('price', 'content_update', 'news_announcement', 'financial_event'));

-- Add unique constraint for normalized_records fingerprint per source
-- This helps with deduplication
create unique index if not exists uq_normalized_records_source_fingerprint
  on normalized_records(source_id, fingerprint);

-- Add index for events by signal type
create index if not exists idx_events_signal on events(signal);
