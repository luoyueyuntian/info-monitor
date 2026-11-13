-- Range scans, stable global pagination, and per-run/FK lookups.
-- Production rollout may prebuild these CONCURRENTLY before recording this migration.
create index if not exists idx_source_runs_created_at on source_runs(created_at desc);
create index if not exists idx_events_occurred_id on events(occurred_at desc, id desc);
create index if not exists idx_normalized_records_source_run on normalized_records(source_run_id);
create index if not exists idx_changes_source_run on changes(source_run_id);
create index if not exists idx_events_source_run on events(source_run_id);
