# Performance phase one implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve existing uncommitted recovery fixes.

**Goal:** Remove measured dashboard/theme SQL bottlenecks and bound failed-source rescheduling.
**Architecture:** Preaggregate each one-to-many table; batch latest rows using DISTINCT ON. Reuse source failure timestamps for configurable retry cooldown without schema changes. Preserve API response contracts and production scheduling windows.
**Tech Stack:** Vue/TypeScript, Fastify/Kysely/PostgreSQL, Python/SQLAlchemy.
**Spec:** User-approved performance analysis in this chat, first implementation phase.

## Global constraints
- Keep API response shapes, event counts, review metadata and Shanghai schedule semantics.
- No production data deletion or changes to paused sources.
- Existing runtime requires PostgreSQL (legacy mock branches are absent).
- Retain rollback images and verify on an isolated PostgreSQL test database before deployment.

## Review focus
- Empty themes return zero counts and null latest values.
- Multiple sources/runs/events do not multiply counts; tests remain excluded and replay semantics remain unchanged.
- Latest event/record and source status match existing responses, including timestamp ties.
- First-ever failure cools down; successful recovery clears cooldown eligibility; daily windows remain enforced.
- Preserve earlier hotfixes; compare snapshots before/after and measure real endpoints.

## Tasks
- [x] Add PostgreSQL integration coverage for theme counts/latest data and source statuses; demonstrate old query count scales with objects.
- [x] Preaggregate theme summary and batch latest event/record/source-run lookups, retaining original filters.
- [x] Add failing scheduler tests for recent/expired failures, then implement configurable cooldown (default 300 seconds).
- [x] Run API/frontend suites, typecheck/build, scheduler suite and worker suite; document pre-existing failures.
- [x] Review changes; build versioned API/scheduler images, preserve old images and deploy after baseline capture.
- [x] Compare stable response fields, database query count and live timings; confirm worker/scheduler health.

## Decisions
- Reuse suitable current checkout because the task continues its existing uncommitted production recovery work.
- User explicitly requested implementation; proceed inline without another approval handoff.
- Full event pagination and Worker concurrency are subsequent phases, with separate API/UI contracts and task-claim changes.


## Verification results
- API: 124 passing tests, including 4 real PostgreSQL integration cases (isolated PostgreSQL 17; candidate smoke verified production PostgreSQL 16).
- Frontend: 135 passing tests. Scheduler: 9 passing tests. Typecheck and full workspace build passed.
- Worker baseline remains 232 passed / 3 pre-existing failures in test_new_adapters.py: test_parses_hk_format, test_parses_hk_format_with_day_first_dash_date, test_yahoo_symbol_mapped_to_sina. Original code reproduced these failures earlier in this chat; Worker was not redeployed in this phase.
- Independent review: no actionable findings, including the indexed lateral-query refinement.
- Production API and Scheduler rebuilt from full sources; tsx moved to production dependencies to avoid startup downloads.
- Production baseline: themes 2634 ms; dashboard 2619 ms; source status 7.8 ms.
- After deployment (5 requests each, server loopback): themes median 25.25 ms (24.19–37.61); dashboard median 40.86 ms (29.62–53.95); source status median 4.72 ms (4.39–5.31).
- Ten concurrent dashboard requests: all successful, median 291.85 ms, max 303.78 ms. This is a smoke measurement, not a capacity limit.
- Counts and review metadata matched across all 25 production themes. API source hash matched runtime image; deployed scheduler cooldown assertions passed.
- Backup and measurements: /home/xhh-linux/backups/info-monitor/perf-phase-one/ on server.
- Rollback images: info-monitor-api:before-perf-phase-one and info-monitor-scheduler:before-perf-phase-one.

## Execution rulings
- A full build exposed macOS AppleDouble metadata in the transfer archive; repackaged without those binary sidecar files before rebuilding.
- DISTINCT ON over run history regressed source-status latency to ~249 ms; EXPLAIN confirmed external sorting of ~116k rows. Replaced it with one indexed lateral lookup per source inside one SQL statement; query count remains bounded.
- The project-specific ~/.claude/skills/code-review.md was absent; a similarly named installed command targets GitHub PRs and is not applicable here. Used a read-only independent review of the scoped changes instead.
- Preserve existing earlier fixes and uncommitted work; no Git commits or branches created.
