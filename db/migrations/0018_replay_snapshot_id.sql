-- Replay support: link a replay run to the snapshot it re-processes.
alter table source_runs
  add column if not exists replay_snapshot_id text
    references raw_snapshots(id) on delete set null;

create index if not exists idx_source_runs_replay_snapshot
  on source_runs(replay_snapshot_id) where replay_snapshot_id is not null;
