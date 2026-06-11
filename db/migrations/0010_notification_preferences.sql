-- Create notification preferences table
-- Supports per-theme, per-source, per-signal, and per-channel configuration
create table if not exists notification_preferences (
  id text primary key,
  user_id text not null default 'default',
  theme_id text references themes(id) on delete cascade,
  source_id text references sources(id) on delete cascade,
  signal text,
  channel text not null default 'in_app',
  is_enabled boolean not null default true,
  is_muted boolean not null default false,
  priority_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint for preference combinations
-- A user can have one preference per theme/source/signal/channel combination
alter table notification_preferences
  add constraint uq_notification_preferences_user_theme_source_signal_channel
  unique (user_id, theme_id, source_id, signal, channel);

-- Add check constraint for valid channels
alter table notification_preferences
  add constraint chk_notification_preferences_channel
  check (channel in ('in_app', 'email', 'webhook', 'telegram'));

-- Add indexes for efficient querying
create index if not exists idx_notification_preferences_user_id on notification_preferences(user_id);
create index if not exists idx_notification_preferences_theme_id on notification_preferences(theme_id);
create index if not exists idx_notification_preferences_signal on notification_preferences(signal);

-- Insert default preferences for existing themes
insert into notification_preferences (id, user_id, theme_id, channel, is_enabled, is_muted, priority_only)
select
  'pref-default-' || t.id || '-in_app',
  'default',
  t.id,
  'in_app',
  true,
  false,
  false
from themes t
on conflict do nothing;
