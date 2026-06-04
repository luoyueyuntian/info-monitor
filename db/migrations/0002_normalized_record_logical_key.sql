alter table normalized_records
  add column if not exists logical_key text;

create index if not exists idx_normalized_records_theme_source_logical_key
  on normalized_records(theme_id, source_id, logical_key)
  where logical_key is not null;
