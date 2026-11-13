-- Match the complete latest-run order so the global date-range index cannot
-- tempt the planner into scanning unrelated sources for a LIMIT 1 lookup.
create index if not exists idx_source_runs_source_created_id
  on source_runs(source_id, created_at desc, id desc);
-- The new leading key prefix covers the original source/time access patterns.
drop index if exists idx_source_runs_source_id_created_at;
