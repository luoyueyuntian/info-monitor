#!/bin/bash
# Apply database migrations by running psql inside the postgres container.
# Requires the postgres service to be running (docker compose up -d postgres).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/db/migrations"

# Ensure postgres is running
if ! docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U postgres -d info_monitor >/dev/null 2>&1; then
  echo "PostgreSQL is not ready. Start it first: docker compose up -d postgres"
  exit 1
fi

# Create migrations tracking table if not exists
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d info_monitor -c "
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  " >/dev/null

# Get already-applied migrations
applied=$(docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d info_monitor -t -A -c "SELECT name FROM _migrations;" 2>/dev/null || echo "")

applied_count=0
skipped_count=0

for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  fname=$(basename "$file")
  if echo "$applied" | grep -qFx "$fname"; then
    continue
  fi

  echo "Applying migration: $fname"
  if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
    psql -U postgres -d info_monitor -v ON_ERROR_STOP=1 -f "/dev/stdin" < "$file" >/dev/null 2>&1; then
    docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
      psql -U postgres -d info_monitor -c "INSERT INTO _migrations (name) VALUES ('$fname') ON CONFLICT DO NOTHING;" >/dev/null
    applied_count=$((applied_count + 1))
  else
    echo "  ↳ Failed to apply $fname"
    exit 1
  fi
done

if [[ $applied_count -eq 0 && $skipped_count -eq 0 ]]; then
  echo "All migrations already applied."
else
  echo "Done: $applied_count applied, $skipped_count skipped."
fi
