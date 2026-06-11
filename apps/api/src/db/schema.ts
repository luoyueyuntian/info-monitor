import type { ColumnType } from "kysely";

type TimestampColumn = ColumnType<Date, string | Date | undefined, string | Date | undefined>;
type JsonColumn<T> = ColumnType<T, T | string | undefined, T | string | undefined>;

export interface ThemesTable {
  id: string;
  name: string;
  theme_type: string;
  info_type: string;
  description: string | null;
  status: string;
  metadata: JsonColumn<Record<string, unknown>>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SourcesTable {
  id: string;
  theme_id: string;
  name: string;
  source_type: string;
  adapter_key: string;
  status: string;
  is_paused: boolean;
  config: JsonColumn<Record<string, unknown>>;
  latest_success_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  latest_failure_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SourceRunsTable {
  id: string;
  theme_id: string;
  source_id: string;
  trigger_type: string;
  status: string;
  started_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  finished_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  error_message: string | null;
  created_at: TimestampColumn;
}

export interface RawSnapshotsTable {
  id: string;
  source_run_id: string;
  theme_id: string;
  source_id: string;
  payload_json: JsonColumn<unknown | null>;
  storage_path: string | null;
  fetched_at: TimestampColumn;
}

export interface NormalizedRecordsTable {
  id: string;
  source_run_id: string;
  theme_id: string;
  source_id: string;
  info_type: string;
  occurred_at: TimestampColumn;
  title: string;
  fingerprint: string;
  content: JsonColumn<Record<string, unknown>>;
  created_at: TimestampColumn;
}

export interface ChangesTable {
  id: string;
  source_run_id: string;
  theme_id: string;
  source_id: string;
  normalized_record_id: string | null;
  change_type: string;
  summary: string;
  details: JsonColumn<Record<string, unknown>>;
  detected_at: TimestampColumn;
}

export interface EventsTable {
  id: string;
  source_run_id: string;
  theme_id: string;
  source_id: string;
  change_id: string | null;
  event_type: string;
  signal: string;
  title: string;
  summary: string;
  evidence: JsonColumn<string[]>;
  status: string;
  is_read: boolean;
  is_bookmarked: boolean;
  bookmarked_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  occurred_at: TimestampColumn;
  created_at: TimestampColumn;
}

export interface NotificationsTable {
  id: string;
  event_id: string;
  channel: string;
  status: string;
  payload: JsonColumn<Record<string, unknown>>;
  sent_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null | undefined>;
  created_at: TimestampColumn;
}

export interface EventStatusHistoryTable {
  id: string;
  event_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: TimestampColumn;
}

export interface NotificationPreferencesTable {
  id: string;
  user_id: string;
  theme_id: string | null;
  source_id: string | null;
  signal: string | null;
  channel: string;
  is_enabled: boolean;
  is_muted: boolean;
  priority_only: boolean;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface RuleConfigurationsTable {
  id: string;
  rule_key: string;
  theme_id: string | null;
  config: JsonColumn<Record<string, unknown>>;
  is_enabled: boolean;
  priority: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface NotificationAuditLogTable {
  id: string;
  notification_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor: string;
  metadata: JsonColumn<Record<string, unknown>>;
  created_at: TimestampColumn;
}

export interface Database {
  themes: ThemesTable;
  sources: SourcesTable;
  source_runs: SourceRunsTable;
  raw_snapshots: RawSnapshotsTable;
  normalized_records: NormalizedRecordsTable;
  changes: ChangesTable;
  events: EventsTable;
  notifications: NotificationsTable;
  event_status_history: EventStatusHistoryTable;
  notification_preferences: NotificationPreferencesTable;
  rule_configurations: RuleConfigurationsTable;
  notification_audit_log: NotificationAuditLogTable;
}
