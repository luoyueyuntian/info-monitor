# Remaining performance optimization implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans, TDD and an independent final review.

**Goal:** Complete the remaining agreed performance work without changing business classification or deleting production history by default.
**Spec:** User's approved optimization analysis, completed phases 1–3 and explicit request to finish remaining work.
**Architecture:** Share pure workspace selection/summary logic between API and frontend; scoped workspace endpoints replace global event transfers. Aggregate operational metrics in SQL. Add measured query indexes. Lazy-load registered chart modules, compress responses, expose bounded Prometheus metrics and wire the existing scraper. Provide reversible, bounded archival of old failed runs with no dependent records, defaulting to preview.
**Tech Stack:** TypeScript/Vue/Kysely/PostgreSQL, Python/SQLAlchemy, Fastify compression, existing Prometheus.

## Constraints and review focus
- Preserve counts, source metadata used by catalog matching, classification precedence and detail context.
- Do not silently cap events used for global diagnostics. Workspace responses contain the complete scoped event set.
- Successful API writes invalidate server workspace cache; in-flight old loads cannot refill it. Worker changes have a short bounded cache TTL.
- Metrics use route templates, never IDs/queries in labels. SSE remains uncompressed and timers are closed with the app.
- Preserve Shanghai dates; operational error aggregation is equivalent to the old implementation.
- Archive only old failed runs with no FK dependents; take and fsync a checksummed backup before any deletion. Preview is default. Restore and FK-race safety are tested. No production archival deletion is authorized or scheduled automatically.
- Indexes are additive; use concurrent builds and validity checks in production, normal migration SQL in transactional tests.
- Preserve prior uncommitted fixes, source pauses and rollback images. No unrelated monitoring jobs modified.

## Tasks
- [x] Add tests then move shared workspace selection/summary into shared contracts; add scoped/index API and migrate workspace consumers.
- [x] Aggregate operational metrics and latest warning-source reads in SQL; add missing range/FK lookup indexes.
- [x] Add API latency/SQL/pool/event-loop/queue metrics and connect the existing Prometheus scraper after configuration validation.
- [x] Add Brotli/gzip and static cache headers; verify payload equivalence and streaming exclusion.
- [x] Register only used chart modules, lazy-load the runtime and clean up observers/frames on unmount; verify bundle/network behavior.
- [x] Add preview/apply/restore archival CLI with isolated PostgreSQL safety tests; run production preview only.
- [x] Run all suites, real database tests, typecheck/build, independent review and candidate smoke; deploy with backups and rollback.
- [x] Verify real browser workspace totals/charts, compressed sizes, Prometheus target and archive preview; clean temporary resources.

## Decisions
- Continue in the existing checkout because all earlier phases are deployed but uncommitted.
- No broad schema partitioning, read replicas or Redis: current database is about 78 MB and query/dataflow fixes have stronger evidence.
- Archive application is an explicit maintenance command, not an automatic cleanup policy. Deployment will not delete production history.


## Verification results
- API: 141 tests passed, including 12 real PostgreSQL cases; frontend: 150 tests passed; Worker: 260 tests passed with PostgreSQL, plus targeted 15 lease/maintenance tests after the final index replacement; scheduler: 9 passed. Typecheck and full workspace build passed. Existing asyncio enrichment deprecation warning remains.
- Independent review found no actionable issues, including cache generation/WeakMap fences, static cache metadata override, concurrent FK protection, restore conflicts and persistent-volume validation.
- PostgreSQL 16 production clone: old classification bundle and new shared functions matched across 1,953 baseline events and all four workspaces, including summary and priority ordering. New endpoints matched the original classifier on 1,954 current clone events. Source metadata stayed complete.
- Clone maintenance smoke archived exactly 2 eligible empty failed runs, restored both, repeated restore without duplication, and preserved all dependent record counts. Production maintenance command was preview only: eligible 111,480, deleted 0, archive null.
- Brotli/gzip round-trip and hash-asset/HTML cache tests passed; candidate SSE remained uncompressed. Prometheus promtool accepted exported metrics and the merged configuration.
- Production Prometheus job info_monitor_performance is UP with real up=1 samples; all earlier jobs preserved. No new alert/notification rules enabled.
- Actual browser: workspace index made one summary request, zero global event-list requests and zero chart-chunk requests. Price trend view loaded one chart chunk and rendered two nonzero Canvas charts. Scoped stock dashboard used its workspace endpoint, not the global event list.
- Frontend build: generic vendor chunk 1.28 KB (previously ~1.13 MB); chart chunk 601.88 KB / 203.64 KB gzip, requested only by chart views. This does not mean all initial JavaScript is 1.28 KB; Vue/application chunks remain.
- Final server-loopback medians across 5 gzip requests: source status 6.2 ms / 2,967 bytes; workspace index 1.09 ms / 1,883 bytes (first cache miss ~84 ms); stock workspace 4.15 ms / 28,555 bytes; dashboard 26.96 ms / 7,421 bytes; operational metrics 19.72 ms / 1,242 bytes; daily summary 3.97 ms / 1,493 bytes.

## Measured index correction
- The new global source_runs(created_at) range index initially made latest-per-source queries choose a global ordered scan: ~14,182 unrelated rows filtered per source, ~65k buffer hits, ~72 ms.
- Migration 0027 adds source_id,created_at DESC,id DESC and removes the covered original source/time index. Clone EXPLAIN became ~0.39 ms with ~100 buffer accesses. Production concurrent build/validity checks completed and API source status returned to ~6 ms.
- Both 0026 and 0027 were applied with concurrent index builds in production; tables analyzed and migrations recorded. No production business rows deleted.

## Deployment / rollback / limits
- Complete API/frontend image info-monitor-api:perf-final deployed; rollback image info-monitor-api:before-perf-final retained. Separate info-monitor-maintenance:perf-final image provides the opt-in CLI; production Worker/Scheduler remain unchanged.
- Server artifacts/backups: /home/xhh-linux/backups/info-monitor/perf-final/. Prometheus backup: prometheus-before.yml; API/data measurements and clone smoke results stored alongside it.
- Reverting API to a version without metrics also requires removing only the new info_monitor_performance scrape job (preserve later edits to other jobs), validating with promtool and reloading Prometheus. Additive indexes can remain; the replacement source index covers the removed prefix.
- Server workspace cache is 5 seconds and client workspace reads 10 seconds; successful API mutations invalidate both. External Worker updates have bounded TTL freshness. Derived data is keyed weakly by immutable base versions.
- Archival is not scheduled or applied automatically. Operators must choose a retention policy and explicitly apply batches with persistent backups. Production history remains intact.
- All temporary database/container/browser resources created for verification were cleaned. Earlier source pause/configuration fixes and dirty work preserved; no Git commits created.
- Compression reference: https://github.com/fastify/fastify-compress (Fastify 5 compatibility, encoding negotiation and streaming options).
