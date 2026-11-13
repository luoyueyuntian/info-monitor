# Performance phase two implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans, test-driven development and independent final review.

**Goal:** Bound event workbench rendering/queries and reduce repeated payload transfer while preserving global workspace diagnostics.
**Architecture:** Add /api/events/page with validated filters and stable cursor pagination, plus compact /api/events?view=compact for complete global summaries. Keep existing full endpoints for compatibility/details. Share short-lived GET cache and invalidate after writes/SSE. Aggregate inbox counts in SQL.
**Spec:** User-approved optimization analysis and instruction to continue.
**Tech Stack:** Fastify/Kysely/PostgreSQL, Vue/TypeScript.

## Global constraints
- Preserve existing complete event endpoint, all workspace classification/counts and detail context.
- Compact context retains publisher, object_name and update_type used by workspace intelligence.
- Workbench diagnostics use complete compact data; render 50 server-paged rows and select only visible rows.
- Cursor preserves PostgreSQL microsecond precision, timestamp ties and sort changes.
- Cancel outdated page requests; failed GETs are not cached; mutation invalidation prevents old in-flight requests repopulating cache.
- Preserve all phase-one/uncommitted fixes; retain deployment rollback images and verify on isolated PostgreSQL before deployment.

## Tasks
- [x] Add failing tests for SQL counts/compact projection/pagination/filtering, GET caching/invalidation and page rendering behavior.
- [x] Implement validated paginated endpoint with bounded page size and SQL filtering; replace inbox count materialization with SQL aggregation.
- [x] Add compact summaries, shared GET cache and invalidation; workbench server paging with global diagnostics and outdated-response guards.
- [x] Run full tests/typecheck/build, real PostgreSQL integration, independent review and candidate smoke test.
- [x] Build complete API/frontend image, deploy with rollback, compare global counts, payload sizes, page boundaries and response times.

## Decisions
- Existing client-side workspace classification stays complete; it is not approximated from a single page.
- Older full-list callers remain compatible. Only fetchEvents uses compact projection; inbox/dashboard detail cards retain full context.
- This phase does not change worker task claiming/concurrency.


## Verification results
- API: 129 tests passed, including 9 real PostgreSQL integration cases. Frontend: 146 tests passed. Typecheck and full workspace build passed.
- Independent review found no actionable issues, including feedback preloading and canonical microsecond cursor validation.
- Production PostgreSQL 16 smoke: traversed all 1,897 events over 10 pages without duplicates or omissions; all original 1,881 baseline IDs retained. Collection added 16 events normally during validation.
- Full event summaries and compact summaries match on all scalar list fields; workspace context keys retained. SQL section aggregates match counts recomputed from the full current data.
- Final server-loopback medians across 5 requests: full events 54.24 ms / 2,490,917 bytes; compact events 28.53 ms / 1,016,958 bytes; page of 50 events 9.53 ms / 26,756 bytes; dashboard 28.92 ms.
- Real Playwright browser: 50 rendered rows, select-all selects only 50, page two changes first event, selection clears after navigation, tracking filter returns zero matching rows as expected. Compact summaries loaded once across paging/filtering; per-row feedback GETs: zero.
- Built complete API/frontend image info-monitor-api:perf-phase-two; deployed API healthy. Scheduler and Worker were not changed in this phase.
- Rollback image: info-monitor-api:before-perf-phase-two. Server verification artifacts: /home/xhh-linux/backups/info-monitor/perf-phase-two/ and /tmp/info-monitor-phase-two-smoke-final.log.

## Rulings and limits
- Global workspace classification/diagnostics still consume complete compact summaries. This preserves counts; server-side workspace aggregates are a later scalability step.
- Browser validation exposed 50 individual feedback lookups per page. Added feedback to the page query via the existing unique event_feedback.event_id relation and an optional preload prop; old component callers still load feedback normally.
- Explicitly label selection as current-page selection. Never bulk-update events from unloaded pages.
- Invalid calendar dates in cursors are rejected as 400 before PostgreSQL execution; preserve six fractional timestamp digits in generated cursors.
- Compare live aggregates against current complete events, rather than demanding historical total equality while collection continues.
- Native browser connector was unavailable; verified deployed behavior with the Playwright CLI instead.
- Earlier uncommitted recovery and phase-one changes preserved; no Git commits created. Worker concurrency/atomic claiming remains outside phase two.
