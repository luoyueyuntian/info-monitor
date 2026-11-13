# Python Worker

Owns:

- source adapters
- raw fetch persistence
- normalization
- change detection
- event generation

The worker atomically claims tasks in short PostgreSQL transactions and performs
fetching, parsing and optional LLM enrichment outside database transactions.
Writes are fenced by claim tokens, serialized per theme, and search indexing is
batched after commit. Only one run per source may be running at a time.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WORKER_CONCURRENCY` | 2 | Concurrent runs, bounded to 1–8 |
| `WORKER_LEASE_SECONDS` | 600 | Lease duration, minimum 60 seconds |
| `WORKER_MAX_ATTEMPTS` | 3 | Maximum claims before an expired task fails |
| `WORKER_MAX_RUN_SECONDS` | 1800 | Absolute maximum lease-renewal horizon |
| `WORKER_POLL_SECONDS` | 30 | Poll/recovery interval |

Active claims are renewed in the background; expired tasks return to pending
unless their attempt limit is exhausted. Stale claim tokens cannot write results
or change the new owner's failure state. Test-run failures do not affect source
health. Lease recovery cannot kill a stuck Python thread: expired results are
discarded and process supervision/restart may still be needed to free that thread.

SIGTERM/SIGINT stop polling and drain in-flight work. Docker allows 90 seconds
before forced shutdown; tasks interrupted by a forced stop are recovered after
their leases expire. Domain pacing is shared across threads in each process;
multiple processes need a separately coordinated global rate limit if required.

Apply `0025_worker_run_leases.sql` before starting this worker. Stop the old
worker before migration/deployment. The migration is additive; rolling back the
worker image does not require dropping lease columns or indexes.

Run PostgreSQL integration tests against an isolated database:

```bash
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/info_monitor_test \
  python -m pytest tests/test_run_leases.py tests/test_worker_concurrency.py -q
```


For an image rollback, first stop **all lease-aware worker instances** and wait
until they have exited. Requeue any interrupted claims only after that stop:

```sql
update source_runs set status = 'pending', claim_token = null,
  lease_expires_at = null, started_at = null, finished_at = null
where status = 'running' and claim_token is not null;
```

Then restore the saved image tag (`info-monitor-worker:before-perf-phase-three`)
and start the single legacy worker. Never requeue claims while their owners are
still running. Leave the additive lease migration in place.

## Reversible archival (preview by default)

From the repository root, build the maintenance image once and preview:

```bash
bash scripts/docker-compose.sh --profile maintenance build maintenance
npm run db:archive -- --days 90 --batch-size 500
```

Only old **failed** runs with no foreign-key dependents are eligible. Successful
runs, active runs, snapshots, records, events and their history are preserved.
The tool discovers incoming foreign keys and rechecks them after locking rows.

For an explicitly chosen retention policy, archive one bounded batch with a
persistent backup directory, or preview/apply a restoration:

```bash
npm run db:archive -- --days 90 --batch-size 500 --apply --backup-dir /archive
npm run db:archive -- --restore /archive/failed-runs-FILENAME.jsonl
npm run db:archive -- --restore /archive/failed-runs-FILENAME.jsonl --apply
```

Files are written atomically, checksummed and fsynced before deletion. A failed
delete leaves the database unchanged and retains the backup. Restoring the same
archive twice is safe; conflicting existing rows abort the restoration. Set
`INFO_MONITOR_ARCHIVE_DIR` to retain files outside the checkout if desired. No
cleanup is enabled or scheduled automatically.

The maintenance profile restricts apply-mode backup paths to its persistent `/archive` volume; paths outside that mount are rejected before connecting. Archiving does not immediately shrink PostgreSQL files; normal vacuum reuses freed pages. No blocking `VACUUM FULL` is run automatically.
