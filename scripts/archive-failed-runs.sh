#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
archive_dir="${INFO_MONITOR_ARCHIVE_DIR:-$ROOT_DIR/data/archive}"
mkdir -p "$archive_dir"
ARCHIVE_UID="$(id -u)" ARCHIVE_GID="$(id -g)" INFO_MONITOR_ARCHIVE_DIR="$archive_dir" \
  bash "$ROOT_DIR/scripts/docker-compose.sh" --profile maintenance run --rm --no-deps maintenance "$@"
