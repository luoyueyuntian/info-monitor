-- Additive lease ownership for bounded concurrent workers.
alter table source_runs add column if not exists claim_token text;
alter table source_runs add column if not exists lease_expires_at timestamptz;
alter table source_runs add column if not exists attempt_count integer not null default 0;

create index if not exists idx_source_runs_pending_claim
  on source_runs(source_id, created_at, id) where status = 'pending';
create index if not exists idx_source_runs_running_lease
  on source_runs(lease_expires_at, source_id) where status = 'running';
create unique index if not exists uq_source_runs_running_source
  on source_runs(source_id) where status = 'running';
