-- Daily summary snapshots: dedicated table for persisting daily summaries.
-- Replaces the abuse of the notifications table for this purpose.
create table if not exists daily_summaries (
  id text primary key,
  date text not null,
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_summaries_date on daily_summaries(date desc);

-- Make notifications.event_id nullable so daily summary delivery
-- (which has no backing event) can still insert a notification row.
alter table notifications alter column event_id drop not null;
