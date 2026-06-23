alter table events
  drop constraint if exists chk_events_signal;

alter table events
  add constraint chk_events_signal
  check (signal ~ '^[a-z0-9][a-z0-9_]*$');
