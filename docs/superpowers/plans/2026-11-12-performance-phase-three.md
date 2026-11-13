# Performance phase three implementation plan

> **For agentic workers:** Execute inline using superpowers:executing-plans, test-driven development and independent final review.

**Goal:** Safely overlap slow source fetching while keeping ownership exclusive and database transactions short.
**Spec:** User-approved optimization analysis and instruction to continue with Worker atomic claiming, short transactions and bounded concurrency.
**Architecture:** PostgreSQL source-row locks and SKIP LOCKED atomically claim one task per source, with a unique running-source constraint. Persist claim tokens, renewable leases and attempt counts. A bounded persistent thread pool submits only free slots; heartbeat renews active tokens. Fetch/normalization/enrichment precede the fenced write transaction; search writes defer until commit.
**Tech Stack:** Python stdlib concurrency, SQLAlchemy/psycopg, PostgreSQL; no external queue or new dependency.

## Global constraints
- Preserve earlier fixes, API/frontend contracts, event rules, test/replay semantics and source pause flags.
- Default concurrency 2, configurable 1–8; default lease 600 seconds (minimum 60), max recovery attempts 3; heartbeat limited by a configurable maximum task runtime (default 1800 seconds).
- Claim tokens fence stale writes and error updates; same-source running tasks remain serialized, and theme writes serialize to preserve cross-source price/event rules.
- No network requests, LLM calls or search writes inside persistence transactions.
- Recovery only handles expired leases and legacy stale running rows; do not purge run history or production data.
- Migrate additively after backing up and stopping old Worker. Rebuild full Worker, preserve rollback image, verify real PostgreSQL concurrency before production deployment.

## Review focus
- Two workers cannot claim the same run/source, including interleaving claims.
- Active tokens renew; expired ownership cannot complete or fail a newer attempt.
- Retry cap fails exhausted claims and keeps test runs from changing source health.
- Replay/test modes and persistence rollback remain intact; network failures release DB resources.
- HTTP limiter is thread-safe; concurrency does not bypass domain pacing; shutdown drains tasks.

## Tasks
- [x] Write failing PostgreSQL tests for claim exclusivity, leases, stale writer fencing, recovery and test health isolation.
- [x] Add lease migration/repository operations and bounded concurrent service runtime with heartbeat and clean shutdown.
- [x] Move external operations out of transactions; defer/batch search indexing until commit; preserve event logic.
- [x] Make HTTP pacing/connection reuse safe for concurrent threads; validate with offline transport tests.
- [x] Run worker/scheduler suites, integration tests and independent review; resolve/document baseline test defects before full image rebuild.
- [x] Build full image, test it on an isolated server database, back up/migrate/deploy, verify live collection and API health, retain rollback instructions.

## Rulings
- Reuse the current checkout because this task continues existing deployed but uncommitted fixes.
- Source-row locks are acquired before a fresh-statement check for running tasks; unique partial index enforces the invariant in the database.
- Indexing remains best-effort after commit; a durable outbox is a later reliability step.
- Lease recovery cannot kill an unresponsive Python thread; a maximum renewal horizon prevents stale commits, while process supervision handles stuck threads.


## Verification results
- Worker: 252 tests passed with isolated PostgreSQL 18, including concurrent claims, source serialization, expiry/reclaim tokens, recovery caps, stale success/failure fencing, heartbeat SKIP LOCKED, actual background heartbeat renewal during blocked fetch, transaction-free fetch/enrichment/indexing, and HTTP thread isolation/pacing.
- API: 129 tests passed including 9 PostgreSQL integration cases; frontend: 146 passed; scheduler: 9 passed. Workspace typecheck/build and Python compilation passed. One existing asyncio.get_event_loop deprecation warning remains in the old enrichment wrapper.
- Fixed pre-existing test defects: two HK quote fixtures had date/time at indices 19/20 instead of actual feed indices 17/18; Yahoo mapping test now mocks transport instead of calling the internet. Removed an obsolete global httpx module stub that polluted other tests.
- Independent review found no actionable defects; 7 focused offline tests independently passed.
- Production PostgreSQL 16 clone smoke: two Worker instances (two slots each) replayed 17 representative real snapshots, all completed once, no failures. Clone and temporary verification containers removed afterward.
- Production additive migration applied after stopping legacy Worker and backing up. No duplicate running source existed before migration. No production records purged.
- Live A-share and HK quote checks: both completed with attempt_count=1, both claims/leases cleared; source pause flags all unchanged.
- SIGTERM smoke on isolated clone: exited code 0 in 1 second. Production Worker source hash matches installed service module.
- Post-deploy API loopback: health ~1 ms, dashboard ~37 ms, event page ~13 ms. Worker connections idle with no open transactions after collection; no duplicate running sources.
- Transient Eastmoney disconnects reproduced on both old/new images, then sources recovered successfully via existing retry scheduling. Missing-URL sources still require valid configuration and are not a Worker concurrency regression.

## Deployment and rollback
- Worker image: info-monitor-worker:perf-phase-three (also latest). Rollback: info-monitor-worker:before-perf-phase-three.
- Server backups/artifacts: /home/xhh-linux/backups/info-monitor/perf-phase-three/; clone smoke log /tmp/info-monitor-phase-three-clone.log.
- Stop all lease-aware Worker instances before reverting to legacy. Requeue remaining running claims only after their processes have exited, using the documented SQL in apps/python-worker/README.md, then restore the saved image tag. Leave additive columns/indexes in place.
- Default production concurrency is 2; lease 600 seconds; maximum recovery attempts 3; renewal horizon 1800 seconds; Docker stop grace 90 seconds.
- Separate-source fetches may complete out of order; write transactions are mutually exclusive per theme, with existing predicates/idempotency preserved. No global chronological watermark is introduced.
- Preserved earlier dirty work and existing source pause flags; no Git commits created.
