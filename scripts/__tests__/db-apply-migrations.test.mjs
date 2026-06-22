import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawn } from "node:child_process";

async function runCommand(command, args, cwd, env) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test("db-apply-migrations replays tracked migrations when core tables are missing", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "info-monitor-migrate-"));

  try {
    const scriptsDir = path.join(tempRoot, "scripts");
    const migrationsDir = path.join(tempRoot, "db", "migrations");
    const fakeContainerDir = path.join(tempRoot, "fake-container");

    await mkdir(scriptsDir, { recursive: true });
    await mkdir(migrationsDir, { recursive: true });
    await mkdir(fakeContainerDir, { recursive: true });

    const sourceScript = await readFile(
      path.resolve("scripts/db-apply-migrations.sh"),
      "utf8",
    );

    await writeFile(path.join(scriptsDir, "db-apply-migrations.sh"), sourceScript);
    await chmod(path.join(scriptsDir, "db-apply-migrations.sh"), 0o755);

    await writeFile(
      path.join(migrationsDir, "0001_initial.sql"),
      "create table if not exists themes (id text primary key);\n",
    );
    await writeFile(
      path.join(migrationsDir, "0002_add_theme_name.sql"),
      "alter table themes add column if not exists name text;\n",
    );

    const composeStub = `#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="\${FAKE_LOG_FILE:?}"
STATE_FILE="\${FAKE_STATE_FILE:?}"
TABLES_FILE="\${FAKE_TABLES_FILE:?}"
CONTAINER_DIR="\${FAKE_CONTAINER_DIR:?}"

printf '%s\\n' "$*" >> "$LOG_FILE"

args=("$@")
if [[ "\${#args[@]}" -ge 2 && "\${args[0]}" == "-f" ]]; then
  args=("\${args[@]:2}")
fi

case "\${args[0]}" in
  exec)
    idx=1
    if [[ "\${args[$idx]}" == "-T" ]]; then
      idx=$((idx + 1))
    fi

    service="\${args[$idx]}"
    idx=$((idx + 1))
    cmd="\${args[$idx]}"
    idx=$((idx + 1))

    if [[ "$service" != "postgres" ]]; then
      echo "unexpected service: $service" >&2
      exit 1
    fi

    case "$cmd" in
      pg_isready)
        exit 0
        ;;
      psql)
        joined="\${args[*]}"

        if [[ "$joined" == *"CREATE TABLE IF NOT EXISTS _migrations"* ]]; then
          exit 0
        fi

        if [[ "$joined" == *"SELECT name FROM _migrations"* ]]; then
          cat "$STATE_FILE"
          exit 0
        fi

        if [[ "$joined" == *"information_schema.tables"* || "$joined" == *"FROM information_schema.tables"* ]]; then
          cat "$TABLES_FILE"
          exit 0
        fi

        if [[ "$joined" == *"INSERT INTO _migrations"* ]]; then
          exit 0
        fi

        migration_path=""
        for ((i = idx; i < \${#args[@]}; i++)); do
          if [[ "\${args[$i]}" == "-f" ]]; then
            migration_path="\${args[$((i + 1))]}"
            break
          fi
        done

        if [[ -z "$migration_path" ]]; then
          echo "expected migration file path" >&2
          exit 1
        fi

        if [[ "$migration_path" == "/dev/stdin" ]]; then
          exit 0
        fi

        migration_file="$CONTAINER_DIR/$(basename "$migration_path")"
        if [[ ! -f "$migration_file" ]]; then
          echo "missing staged migration: $migration_file" >&2
          exit 1
        fi

        base="$(basename "$migration_path")"
        printf 'applied:%s\\n' "$base" >> "$LOG_FILE"
        if [[ "$base" == "info-monitor-migration-0001_initial.sql" ]]; then
          cat <<'EOF' > "$TABLES_FILE"
themes
sources
source_runs
raw_snapshots
normalized_records
changes
events
notifications
EOF
        fi
        exit 0
        ;;
      sh)
        exit 0
        ;;
    esac
    ;;
  cp)
    src="\${args[1]}"
    dest="\${args[2]}"
    cp "$src" "$CONTAINER_DIR/$(basename "$dest")"
    printf 'copied:%s\\n' "$(basename "$dest")" >> "$LOG_FILE"
    exit 0
    ;;
esac

echo "unexpected command: $*" >&2
exit 1
`;

    await writeFile(path.join(scriptsDir, "docker-compose.sh"), composeStub);
    await chmod(path.join(scriptsDir, "docker-compose.sh"), 0o755);

    const logFile = path.join(tempRoot, "compose.log");
    const stateFile = path.join(tempRoot, "migrations-state.txt");
    const tablesFile = path.join(tempRoot, "tables-state.txt");

    await writeFile(logFile, "");
    await writeFile(stateFile, "0001_initial.sql\n0002_add_theme_name.sql\n");
    await writeFile(tablesFile, "");

    const result = await runCommand(
      "bash",
      ["./scripts/db-apply-migrations.sh"],
      tempRoot,
      {
        ...process.env,
        FAKE_LOG_FILE: logFile,
        FAKE_STATE_FILE: stateFile,
        FAKE_TABLES_FILE: tablesFile,
        FAKE_CONTAINER_DIR: fakeContainerDir,
      },
    );

    assert.equal(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

    const log = await readFile(logFile, "utf8");

    assert.match(log, /cp .*0001_initial\.sql postgres:\/tmp\//);
    assert.match(log, /cp .*0002_add_theme_name\.sql postgres:\/tmp\//);
    assert.match(log, /applied:info-monitor-migration-0001_initial\.sql/);
    assert.match(log, /applied:info-monitor-migration-0002_add_theme_name\.sql/);
    assert.doesNotMatch(log, /\/dev\/stdin/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
