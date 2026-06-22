#!/bin/bash
# Apply database migrations by running psql inside the postgres container.
# Requires the postgres service to be running (npm run db:up).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/db/migrations"
COMPOSE_CMD="$ROOT_DIR/scripts/docker-compose.sh"
CORE_TABLES=(
  themes
  sources
  source_runs
  raw_snapshots
  normalized_records
  changes
  events
  notifications
)

list_core_tables_sql() {
  local table_list
  table_list=$(printf "'%s'," "${CORE_TABLES[@]}")
  table_list="${table_list%,}"

  cat <<SQL
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ($table_list)
ORDER BY table_name;
SQL
}

list_existing_core_tables() {
  "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
    psql -U postgres -d info_monitor -t -A -c "$(list_core_tables_sql)"
}

apply_migration_file() {
  local file="$1"
  local fname="$2"
  local container_path="/tmp/info-monitor-migration-$fname"

  "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" cp "$file" "postgres:$container_path" >/dev/null

  if "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
    psql -U postgres -d info_monitor -v ON_ERROR_STOP=1 -f "$container_path" >/dev/null 2>&1; then
    "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
      psql -U postgres -d info_monitor -c "INSERT INTO _migrations (name) VALUES ('$fname') ON CONFLICT DO NOTHING;" >/dev/null
    "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
      sh -lc "rm -f '$container_path'" >/dev/null 2>&1 || true
    return 0
  fi

  "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
    sh -lc "rm -f '$container_path'" >/dev/null 2>&1 || true
  return 1
}

# Ensure postgres is running
if ! "$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U postgres -d info_monitor >/dev/null 2>&1; then
  echo "PostgreSQL is not ready. Start it first: npm run db:up"
  exit 1
fi

# Create migrations tracking table if not exists
"$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d info_monitor -c "
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  " >/dev/null

# Get already-applied migrations
applied=$("$COMPOSE_CMD" -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d info_monitor -t -A -c "SELECT name FROM _migrations;" 2>/dev/null || echo "")

applied_count=0
skipped_count=0
force_reapply_all=0
core_tables_present=$(list_existing_core_tables)
core_table_count=$(printf "%s\n" "$core_tables_present" | sed '/^\s*$/d' | wc -l | tr -d ' ')

if echo "$applied" | grep -qFx "0001_initial.sql" && [[ "$core_table_count" -eq 0 ]]; then
  echo "Detected migration history without core schema; replaying migrations to recover schema."
  force_reapply_all=1
fi

for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  fname=$(basename "$file")
  if [[ "$force_reapply_all" -eq 0 ]] && echo "$applied" | grep -qFx "$fname"; then
    skipped_count=$((skipped_count + 1))
    continue
  fi

  echo "Applying migration: $fname"
  if apply_migration_file "$file" "$fname"; then
    applied_count=$((applied_count + 1))
  else
    echo "  ↳ Failed to apply $fname"
    exit 1
  fi
done

final_core_tables=$(list_existing_core_tables)
final_core_table_count=$(printf "%s\n" "$final_core_tables" | sed '/^\s*$/d' | wc -l | tr -d ' ')

if [[ "$final_core_table_count" -ne "${#CORE_TABLES[@]}" ]]; then
  echo "Migration finished but core tables are still missing."
  echo "Expected ${#CORE_TABLES[@]} core tables in public schema, found $final_core_table_count."
  echo "Visible core tables:"
  printf "%s\n" "$final_core_tables"
  exit 1
fi

if [[ $applied_count -eq 0 && $skipped_count -eq 0 ]]; then
  echo "All migrations already applied."
else
  echo "Done: $applied_count applied, $skipped_count skipped."
fi
