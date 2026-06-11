-- Create rule configurations table
-- Stores configurable parameters for event rules
create table if not exists rule_configurations (
  id text primary key,
  rule_key text not null,
  theme_id text references themes(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint for rule_key per theme
alter table rule_configurations
  add constraint uq_rule_configurations_key_theme
  unique (rule_key, theme_id);

-- Add index for efficient querying
create index if not exists idx_rule_configurations_rule_key on rule_configurations(rule_key);
create index if not exists idx_rule_configurations_theme_id on rule_configurations(theme_id);

-- Insert default rule configurations for price_30d_low rule
insert into rule_configurations (id, rule_key, theme_id, config, is_enabled, priority)
select
  'rule-price-30d-low-' || t.id,
  'price_30d_low',
  t.id,
  '{
    "threshold_percent": 0,
    "dedup_window_days": 30,
    "only_latest": true,
    "notification_level": "high",
    "min_price_change": 0
  }'::jsonb,
  true,
  10
from themes t
where t.info_type = 'price'
on conflict do nothing;

-- Insert default rule configurations for financial_direction rule
insert into rule_configurations (id, rule_key, theme_id, config, is_enabled, priority)
select
  'rule-financial-direction-' || t.id,
  'financial_direction',
  t.id,
  '{
    "classify_neutral": false,
    "notification_level": "medium",
    "bullish_signals": ["liquidity_injection"],
    "bearish_signals": ["liquidity_withdrawal"]
  }'::jsonb,
  true,
  10
from themes t
where t.info_type = 'financial_event'
on conflict do nothing;

-- Insert default rule configurations for content_update rule
insert into rule_configurations (id, rule_key, theme_id, config, is_enabled, priority)
select
  'rule-content-update-' || t.id,
  'content_update',
  t.id,
  '{
    "notification_level": "low",
    "ignore_types": [],
    "require_keyword": null
  }'::jsonb,
  true,
  5
from themes t
where t.info_type = 'content_update'
on conflict do nothing;

-- Insert default rule configurations for news_announcement rule
insert into rule_configurations (id, rule_key, theme_id, config, is_enabled, priority)
select
  'rule-news-announcement-' || t.id,
  'news_announcement',
  t.id,
  '{
    "notification_level": "medium",
    "keywords": [],
    "ignore_publishers": []
  }'::jsonb,
  true,
  8
from themes t
where t.info_type = 'news_announcement'
on conflict do nothing;
