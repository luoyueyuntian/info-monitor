-- Create notification audit log table
-- Tracks all state changes for notifications
create table if not exists notification_audit_log (
  id text primary key,
  notification_id text not null references notifications(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  actor text not null default 'system',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Add indexes for efficient querying
create index if not exists idx_notification_audit_log_notification_id on notification_audit_log(notification_id);
create index if not exists idx_notification_audit_log_created_at on notification_audit_log(created_at desc);
create index if not exists idx_notification_audit_log_action on notification_audit_log(action);

-- Add check constraint for valid actions
alter table notification_audit_log
  add constraint chk_notification_audit_log_action
  check (action in ('created', 'sent', 'failed', 'read', 'retried', 'deleted'));
