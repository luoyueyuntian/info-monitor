#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PREPARE_ONLY=0

usage() {
  cat <<'EOF'
Usage: scripts/preview.sh [--prepare-only] [--help]

Options:
  --prepare-only   Prepare the preview environment without starting services.
  --help           Show this help message and exit.
EOF
}

while (($# > 0)); do
  case "$1" in
    --prepare-only)
      PREPARE_ONLY=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf '[preview] Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

API_PID=""
FRONTEND_PID=""
LOOP_PID=""
API_PORT_SELECTED=""
FRONTEND_PORT_SELECTED=""

log() {
  printf '[preview] %s\n' "$1"
}

cleanup() {
  for pid in "$API_PID" "$FRONTEND_PID" "$LOOP_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

ensure_env_file() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    log "Created .env from .env.example"
  fi
}

load_env_file() {
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
}

ensure_node_deps() {
  local needs_install=0

  if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    needs_install=1
  elif [[ ! -d "$ROOT_DIR/node_modules/@info-monitor/shared-contracts" ]]; then
    needs_install=1
  elif [[ ! -L "$ROOT_DIR/node_modules/@info-monitor/shared-contracts" && ! -d "$ROOT_DIR/node_modules/@info-monitor/shared-contracts" ]]; then
    needs_install=1
  fi

  if [[ "$needs_install" -eq 1 ]]; then
    log "Installing Node dependencies"
    npm install --cache ./.npm-cache
  fi
}

ensure_python_app() {
  local app_name="$1"
  local app_dir="$ROOT_DIR/apps/$app_name"
  local venv_dir="$app_dir/.venv"
  local stamp_file="$venv_dir/.installed"
  local pyproject_file="$app_dir/pyproject.toml"

  if [[ ! -d "$venv_dir" ]]; then
    log "Creating virtual environment for $app_name"
    python3 -m venv "$venv_dir"
  fi

  if [[ ! -f "$stamp_file" || "$pyproject_file" -nt "$stamp_file" ]]; then
    log "Installing Python dependencies for $app_name"
    env PIP_CACHE_DIR="$ROOT_DIR/.pip-cache" "$venv_dir/bin/pip" install "$app_dir"
    cleanup_python_generated_artifacts "$app_dir"
    touch "$stamp_file"
  fi
}

cleanup_python_generated_artifacts() {
  local app_dir="$1"

  rm -rf "$app_dir/build"
  find "$app_dir/src" -maxdepth 1 -type d -name '*.egg-info' -prune -exec rm -rf {} +
}

wait_for_postgres() {
  local retries=30
  local count=0

  until docker compose exec -T postgres pg_isready -U postgres -d info_monitor >/dev/null 2>&1; do
    count=$((count + 1))
    if [[ "$count" -ge "$retries" ]]; then
      log "PostgreSQL did not become ready in time"
      return 1
    fi
    sleep 2
  done
}

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

pick_available_port() {
  local requested_port="$1"
  local port="$requested_port"

  while port_in_use "$port"; do
    port=$((port + 1))
  done

  printf '%s\n' "$port"
}

run_migrations_with_retry() {
  local retries=3
  local attempt=0

  until (( attempt >= retries )); do
    if npm run db:migrate; then
      return 0
    fi

    attempt=$((attempt + 1))
    if (( attempt >= retries )); then
      return 1
    fi

    log "Migration attempt ${attempt} failed, retrying..."
    sleep 2
  done
}

prepare_preview_data() {
  local worker_log
  worker_log="$(mktemp "${TMPDIR:-/tmp}/info-monitor-worker-preview.XXXXXX")"

  log "Starting PostgreSQL"
  npm run db:up
  wait_for_postgres

  log "Applying migrations"
  run_migrations_with_retry

  log "Seeding demo themes and sources"
  npm run db:seed:workbench-demo

  log "Queueing demo source runs"
  npm run db:enqueue:workbench-demo

  log "Running worker once to populate initial records"
  if env DATABASE_URL="${DATABASE_URL}" PYTHONPATH="$ROOT_DIR/apps/python-worker/src" \
    "$ROOT_DIR/apps/python-worker/.venv/bin/python" -m info_monitor_worker.main \
    >"$worker_log" 2>&1; then
    log "Initial worker run completed"
  else
    log "Initial worker run failed due to runtime source issues; continuing preview preparation"
    log "Worker log: $worker_log"
  fi
}

background_worker_loop() {
  while true; do
    env DATABASE_URL="${DATABASE_URL}" PYTHONPATH="$ROOT_DIR/apps/python-scheduler/src" \
      "$ROOT_DIR/apps/python-scheduler/.venv/bin/python" -m info_monitor_scheduler.main || true

    env DATABASE_URL="${DATABASE_URL}" PYTHONPATH="$ROOT_DIR/apps/python-worker/src" \
      "$ROOT_DIR/apps/python-worker/.venv/bin/python" -m info_monitor_worker.main || true

    sleep 15
  done
}

start_preview_services() {
  local requested_api_port="${API_PORT:-3001}"
  local requested_frontend_port="${FRONTEND_PORT:-5173}"

  API_PORT_SELECTED="$(pick_available_port "$requested_api_port")"
  FRONTEND_PORT_SELECTED="$(pick_available_port "$requested_frontend_port")"

  if [[ "$API_PORT_SELECTED" != "$requested_api_port" ]]; then
    log "API port $requested_api_port is busy, using $API_PORT_SELECTED instead"
  fi

  if [[ "$FRONTEND_PORT_SELECTED" != "$requested_frontend_port" ]]; then
    log "Frontend port $requested_frontend_port is busy, using $FRONTEND_PORT_SELECTED instead"
  fi

  log "Starting API on http://localhost:${API_PORT_SELECTED}"
  env API_PORT="${API_PORT_SELECTED}" CORS_ORIGIN="http://localhost:${FRONTEND_PORT_SELECTED}" \
    npm run dev:api &
  API_PID=$!

  log "Starting frontend on http://localhost:${FRONTEND_PORT_SELECTED}"
  npm run dev --workspace @info-monitor/frontend -- --host 0.0.0.0 --port "${FRONTEND_PORT_SELECTED}" --strictPort &
  FRONTEND_PID=$!

  log "Starting background scheduler/worker loop"
  background_worker_loop &
  LOOP_PID=$!

  log "Preview is running"
  log "Frontend: http://localhost:${FRONTEND_PORT_SELECTED}"
  log "API: http://localhost:${API_PORT_SELECTED}"

  wait "$API_PID" "$FRONTEND_PID" "$LOOP_PID"
}

ensure_env_file
load_env_file
ensure_node_deps
ensure_python_app "python-worker"
ensure_python_app "python-scheduler"
prepare_preview_data

if [[ "$PREPARE_ONLY" -eq 1 ]]; then
  log "Preview environment prepared"
  exit 0
fi

start_preview_services
