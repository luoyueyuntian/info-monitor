create index if not exists idx_normalized_records_source_browse
  on normalized_records(source_id, occurred_at desc, id desc);
