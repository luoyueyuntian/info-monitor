# AI Development Tasks

Updated: 2026-06-14

This file is the current next-stage execution backlog for coding agents
working in this repository.

Use it when the goal is to continue product development from the current
information workbench baseline without reopening broad product planning.

The current product already includes:

1. scheduler / worker / API / frontend baseline
2. source onboarding and source test preview
3. source health and troubleshooting
4. theme timeline and review support
5. notifications
6. daily summary
7. weekly summary baseline
8. theme-level conclusion and event explanation
9. cross-source price comparison baseline
10. watchlist and saved filter view baseline

The next stage should focus on making the platform stronger for real long-term
personal use:

- real source runtime stability
- replay and debugging depth
- stronger buying / waiting judgment for price themes
- weekly review workflows that feel complete

## Global Instructions

- Read the related files before editing.
- Implement directly in code; do not only provide a proposal.
- Reuse existing shared contracts, demo scene definitions, fallback data,
  mock data, and route-oriented frontend structure.
- Keep frontend page entry files thin; extract page-private components under
  the route directory's `components/` folder when appropriate.
- If API response shapes change, update
  `apps/frontend/src/lib/api.ts` accordingly.
- Preserve the current end-to-end path:
  - scheduler enqueues runs
  - worker fetches and stores raw payloads
  - worker normalizes records and emits changes/events
  - API exposes the resulting state
  - frontend renders the result
- Prefer the smallest verification that proves the task is working.
- In the final report, always include:
  - what changed
  - what was verified
  - what remains unverified

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
11. Task 11
12. Task 12

## Direction 1: Replay and Runtime Stability

## Task 1: Implement Historical Snapshot Replay End-to-End

- Goal: Make stored raw snapshots truly reusable for debugging without live
  network fetches.
- Inputs:
  - `apps/api/src/routes/sources.ts`
  - `apps/api/src/services/source-service.ts`
  - `apps/python-worker/src/info_monitor_worker/service.py`
  - `apps/python-worker/src/info_monitor_worker/repositories.py`
  - `apps/frontend/src/views/sources/[sourceId]/components/`
- Required output:
  - a real replay route for selecting a historical snapshot
  - worker support for replay context:
    - skip live fetch
    - re-run normalize / detect / event logic from stored snapshot payload
  - clear replay result display in source detail
  - clear distinction between:
    - live run
    - test run
    - replay run
- Acceptance:
  - a user can pick a historical snapshot and replay parsing from it without a
    fresh upstream request
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`
  - `npm run test:python-worker`

## Task 2: Add Replay Result Comparison View

- Goal: Make replay useful for root-cause analysis, not just as a run type.
- Inputs:
  - `apps/api/src/services/source-service.ts`
  - `apps/frontend/src/views/sources/[sourceId]/components/`
- Required output:
  - compare historical snapshot replay result against:
    - stored snapshot summary
    - previous parse result
    - current live parse if available
  - surface count deltas for:
    - normalized records
    - changes
    - events
  - identify likely failure layer:
    - raw payload issue
    - mapping / extraction issue
    - normalizer issue
    - rule issue
- Acceptance:
  - a user can quickly see what changed between the old and replayed result
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 3: Add Source Config Version Diff

- Goal: Make source config history genuinely useful for debugging.
- Inputs:
  - `apps/api/src/services/source-service.ts`
  - `apps/frontend/src/views/sources/[sourceId]/components/SourceConfigHistoryCard.vue`
  - `db/migrations/0016_source_config_history.sql`
- Required output:
  - diff between current config and historical versions
  - field-level added / removed / changed markers
  - clearer rollback target choice
- Acceptance:
  - a user can understand what changed between config versions without reading
    raw JSON manually
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 4: Bind Source Runs to Config Versions

- Goal: Let users trace each run to the config version that produced it.
- Inputs:
  - `apps/api/src/db/schema.ts`
  - `apps/api/src/services/source-service.ts`
  - `apps/python-worker/src/info_monitor_worker/repositories.py`
  - DB migration if needed
- Required output:
  - source runs store config version or config snapshot reference
  - source detail run list displays config version
  - replay / retry / history views can reference which config version was used
- Acceptance:
  - a user can answer “which config version caused this run?”
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`

## Task 5: Strengthen Real Source Runtime Classification

- Goal: Make long-term live-source operation easier to maintain.
- Inputs:
  - `apps/python-worker/src/info_monitor_worker/`
  - `apps/api/src/services/source-health-service.ts`
  - `apps/frontend/src/views/sources/status/components/`
- Required output:
  - clearer runtime failure classes:
    - upstream unreachable
    - upstream empty
    - parse mismatch
    - normalized zero
    - rule produced nothing
  - better user-facing hints in source health and source detail
  - stronger prioritization for persistent failures
- Acceptance:
  - the user can tell whether a source is broken, stale, drifting, or merely
    quiet
- Minimum verification:
  - `npm run typecheck`
  - `npm run test:python-worker`
  - `npm --workspace @info-monitor/api test`

## Direction 2: Buying and Judgment Quality

## Task 6: Deepen Price Judgment for Real Buying Decisions

- Goal: Make price themes more useful for actual purchase timing.
- Inputs:
  - `apps/api/src/services/theme-service.ts`
  - `apps/frontend/src/views/themes/[themeId]/components/ThemeDetailAnalysisCard.vue`
  - `apps/frontend/src/views/themes/[themeId]/components/theme-detail-source-compare.ts`
- Required output:
  - richer price judgment:
    - worth buying
    - worth waiting
    - worth attention
    - watching
  - clearer explanation of why a price is trusted or questionable
  - stronger tie-in between:
    - latest signal
    - price trend
    - cross-source comparison
- Acceptance:
  - a price theme gives the user a more concrete next-step suggestion
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 7: Add Trust Scoring for Low-Price Candidates

- Goal: Reduce false-positive low-price excitement.
- Inputs:
  - `apps/python-worker/src/info_monitor_worker/normalizers/price.py`
  - `apps/api/src/services/theme-service.ts`
  - `packages/shared-contracts/src/`
- Required output:
  - trust / credibility markers for low-price candidates
  - richer outlier reasons
  - frontend rendering for:
    - likely valid
    - suspicious
    - high-risk low price
- Acceptance:
  - a user can quickly tell whether a low price deserves serious attention
- Minimum verification:
  - `npm run typecheck`
  - `npm run test:python-worker`

## Task 8: Make Theme-Level Support / Conflict More Concrete

- Goal: Upgrade from count-based theme judgment to source-based judgment.
- Inputs:
  - `apps/api/src/services/theme-service.ts`
  - `apps/frontend/src/views/themes/[themeId]/components/ThemeDetailAnalysisCard.vue`
- Required output:
  - supporting sources list with concrete source names or categories
  - conflicting sources list with concrete source names or categories
  - clearer reason for conflict:
    - price divergence
    - source health
    - announcement direction mismatch
    - stale source
- Acceptance:
  - users can understand not just that conflict exists, but where it comes from
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Direction 3: Weekly Review Productization

## Task 9: Add a Dedicated Weekly Review History Page

- Goal: Turn weekly review from a card into a usable review workflow.
- Inputs:
  - `apps/api/src/routes/weekly-summary.ts`
  - `apps/frontend/src/views/inbox/`
  - `apps/frontend/src/lib/api.ts`
- Required output:
  - a dedicated weekly review history page
  - ability to browse prior weeks
  - stronger drill-down from weekly summaries into themes, events, and sources
- Acceptance:
  - a user can revisit multiple prior weekly reviews without relying on the
    homepage card only
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 10: Strengthen Theme-Level Weekly Review Interpretation

- Goal: Make theme-level weekly review useful for recurring decision support.
- Inputs:
  - `apps/frontend/src/views/themes/[themeId]/components/ThemeDetailWeeklyReviewCard.vue`
  - `apps/api/src/services/theme-service.ts`
- Required output:
  - clearer 7 / 14 / 30 day comparisons
  - more meaningful signal distribution interpretation
  - stronger link between theme review and global weekly review
- Acceptance:
  - a user can use the theme page for routine weekly replay without needing
    other pages open
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 11: Improve Weekly Review Export Quality

- Goal: Make weekly review export feel like a useful artifact rather than a raw
  dump.
- Inputs:
  - `apps/api/src/services/weekly-summary-service.ts`
  - `apps/frontend/src/views/inbox/components/HomeInboxWeeklySummaryCard.vue`
- Required output:
  - stronger export formatting
  - cleaner structure for text export
  - optional JSON export shape validation
  - consistent exported language for weekly review sections
- Acceptance:
  - exported weekly review content is readable and shareable without manual
    cleanup
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`

## Task 12: Add End-to-End Quality Gates for Completed Summary Logic

- Goal: Protect the increasingly complex summary and review logic from future
  drift.
- Inputs:
  - `apps/api/src/__tests__/summary-math.test.ts`
  - `scripts/verify-e2e.sh`
  - `apps/frontend/src/views/inbox/components/`
  - `apps/frontend/src/views/notifications/index.vue`
- Required output:
  - stronger API regression tests for summary math
  - stronger script-based verification for:
    - notifications
    - weekly summary
    - source health
    - dashboard
  - optional higher-level frontend regression tests where appropriate
- Acceptance:
  - future changes to summaries and notification flow are more likely to break
    tests before breaking user experience
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`
  - `npm --workspace @info-monitor/frontend test`

## Not Recommended Right Now

Do not prioritize these until the real-source runtime loop and weekly review
workflow become stable in day-to-day use:

- multi-user support
- permission system
- public SaaS packaging
- fully generic no-code source builder
- auto-trading or auto-execution
- heavy charting platform work
- advanced public-opinion NLP stack

## Suggested Agent Prompt

Use the following prompt shape when giving one task to an AI:

1. Read the related files listed in the task.
2. Implement the task directly in code.
3. Reuse existing patterns in this repository.
4. Run the listed minimum verification commands.
5. Report:
   - changed files
   - user-visible behavior changes
   - verification results
   - remaining risks
