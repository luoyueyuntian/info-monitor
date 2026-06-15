create table if not exists workspace_close_reports (
  id text primary key,
  workspace_id text not null,
  date text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_close_reports_workspace_date
  on workspace_close_reports(workspace_id, date);

create index if not exists idx_workspace_close_reports_created_at
  on workspace_close_reports(created_at desc);
