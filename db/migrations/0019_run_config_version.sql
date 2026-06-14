-- Bind source runs to the config version that produced them.
alter table source_runs
  add column if not exists config_version int;

create index if not exists idx_source_runs_config_version
  on source_runs(source_id, config_version) where config_version is not null;
