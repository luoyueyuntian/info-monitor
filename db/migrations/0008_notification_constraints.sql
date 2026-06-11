-- Clean up duplicate notifications before adding unique constraint
-- Keep the most recent notification for each event_id + channel pair
delete from notifications
where id not in (
  select distinct on (event_id, channel) id
  from notifications
  order by event_id, channel, created_at desc
);

-- Add unique constraint for event_id + channel to prevent duplicate notifications
-- This ensures one notification per event per channel
alter table notifications
  add constraint uq_notifications_event_channel unique (event_id, channel);

-- Add check constraint for valid notification statuses
alter table notifications
  add constraint chk_notifications_status check (status in ('pending', 'sent', 'failed'));

-- Add check constraint for valid notification channels
alter table notifications
  add constraint chk_notifications_channel check (channel in ('in_app', 'email', 'webhook', 'telegram'));

-- Add index for querying notifications by status (useful for batch operations)
create index if not exists idx_notifications_status_created_at on notifications(status, created_at desc);

-- Add index for querying notifications by channel
create index if not exists idx_notifications_channel on notifications(channel);
