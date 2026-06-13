# AI Development Tasks

Updated: 2026-06-13

This file is the current next-stage execution backlog for coding agents
working in this repository.

Use it when the goal is to continue product development from the current
information workbench baseline without reopening broad product planning.

The current product is no longer in pure scaffolding mode. A working vertical
slice already exists across:

1. scheduler
2. worker
3. API
4. frontend workbench
5. notifications
6. daily summary

The next stage should focus on making the system more reusable for real
personal monitoring work, especially around source onboarding, real-source
coverage, analysis assistance, and operational reliability.

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

## Task 1: Productize the New-Source Onboarding Flow

- Goal: Turn "adding a source" from a code-only workflow into a guided product
  workflow that still allows source-specific adapter code.
- Inputs:
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `apps/frontend/src/views/sources/`
  - `apps/frontend/src/lib/api.ts`
  - `apps/api/src/routes/sources.ts`
  - `apps/api/src/services/source-service.ts`
  - `packages/shared-contracts/src/`
- Required output:
  - an "add source" entry that supports choosing a source type
  - source-type-aware configuration fields
  - a pre-save validation result in the UI
  - a clear source setup status after creation:
    - draft
    - ready to test
    - active
  - backend support for storing onboarding metadata if needed
- Acceptance:
  - a user can create a new source without manually editing seed data or SQL
  - the system makes clear what still needs to be configured before the source
    can run
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 2: Add Source Test-Run and Parse Preview

- Goal: Let the user verify a source configuration before enabling it in the
  scheduler.
- Inputs:
  - `apps/frontend/src/views/sources/[sourceId]/components/`
  - `apps/api/src/routes/sources.ts`
  - `apps/api/src/services/source-service.ts`
  - `apps/python-worker/src/info_monitor_worker/adapters/`
  - `apps/python-worker/src/info_monitor_worker/service.py`
- Required output:
  - a manual "test source" action on source detail
  - a preview result that shows at minimum:
    - fetch result summary
    - parse result summary
    - sample normalized records
    - detected issues or warnings
  - a clear difference between:
    - test run
    - scheduled production run
  - if a test run cannot be fully executed in the current architecture,
    provide the nearest safe implementation that still previews the adapter
    result through API + worker integration
- Acceptance:
  - before activating a source, the user can confirm whether the source can be
    fetched and parsed correctly
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:python-worker`

## Task 3: Add the First Real Second-Hand Price Monitoring Source

- Goal: Move the price-monitoring scenario from demo-oriented infrastructure to
  a first real consumer use case.
- Inputs:
  - `apps/python-worker/src/info_monitor_worker/adapters/`
  - `apps/python-worker/src/info_monitor_worker/normalizers/price.py`
  - `apps/python-worker/src/info_monitor_worker/event_rules/`
  - `apps/api/src/services/theme-service.ts`
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `docs/`
- Required output:
  - one real list-style second-hand price source integration
  - support for "same configuration across platforms" comparison if the chosen
    source shape allows it
  - at minimum preserve or improve these price signals:
    - recent 30-day low
    - notable drop versus recent median or average
  - demo seed or setup documentation for this source
  - clear theme-side presentation of cross-source price context
- Acceptance:
  - the platform can monitor a real second-hand product price scenario instead
    of only stock/demo price data
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:python-worker`

## Task 4: Add Product Update and Announcement Monitoring as a Reusable Path

- Goal: Make "content update / product release / official announcement"
  monitoring a first-class reusable capability.
- Inputs:
  - `apps/python-worker/src/info_monitor_worker/adapters/generic_content_update_list.py`
  - `apps/python-worker/src/info_monitor_worker/normalizers/content_update.py`
  - `apps/python-worker/src/info_monitor_worker/event_rules/keyword_match.py`
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `apps/frontend/src/views/inbox/components/`
  - `docs/new-source-integration.md`
- Required output:
  - one concrete real-source integration for product updates or announcements
  - reusable source config conventions for this source family
  - topic extraction improvements where needed
  - event presentation that distinguishes:
    - new function / capability update
    - marketing / campaign update
    - official announcement / notice
- Acceptance:
  - the platform can monitor a real "what changed recently" product or
    announcement source and surface it clearly in the workbench
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:python-worker`

## Task 5: Add Analysis Assist for Bullish / Bearish / Neutral Financial Events

- Goal: Upgrade financial-event monitoring from "new data arrived" to "what is
  the likely direction and why".
- Inputs:
  - `apps/python-worker/src/info_monitor_worker/normalizers/financial_event.py`
  - `apps/python-worker/src/info_monitor_worker/event_rules/financial_direction.py`
  - `apps/api/src/services/event-service.ts`
  - `apps/api/src/services/daily-summary-service.ts`
  - `apps/frontend/src/views/events/[eventId]/components/`
  - `apps/frontend/src/views/inbox/components/`
- Required output:
  - explicit direction tagging for relevant financial events:
    - bullish
    - bearish
    - neutral
  - direction rationale or evidence summary in event detail
  - summary-level aggregation that shows recent directional balance for a theme
    or section when possible
  - keep this as decision support, not auto-action
- Acceptance:
  - macro / policy / financial event items are easier to interpret without
    manually reading each raw item from scratch
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`
  - `npm run test:python-worker`

## Task 6: Formalize Theme-Level Notification Rules and Channel Persistence

- Goal: Make notifications durable and useful once real sources increase.
- Inputs:
  - `apps/frontend/src/views/settings/notifications.vue`
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `apps/api/src/routes/notification-preferences.ts`
  - `apps/api/src/routes/channel-config.ts`
  - `apps/api/src/services/notification-preference-service.ts`
  - `apps/api/src/services/notification-channels.ts`
- Required output:
  - backend-persisted channel configuration for supported channels
  - theme-level notification preferences
  - signal-type-level notification preferences where practical
  - basic delivery noise controls at minimum:
    - mute
    - frequency guard or dedupe
    - quiet hours placeholder or initial implementation
  - UI that clearly explains what will be sent and why
- Acceptance:
  - the user can control which themes and signal types actually notify them
    without editing local storage or code
- Minimum verification:
  - `npm run typecheck`
  - `npm --workspace @info-monitor/api test`
  - `npm --workspace @info-monitor/frontend test`

## Task 7: Add Review Timeline and Multi-Day Workbench Replay

- Goal: Strengthen the platform's value as an information workbench instead of
  only an alert list.
- Inputs:
  - `apps/api/src/services/daily-summary-history.ts`
  - `apps/api/src/services/theme-service.ts`
  - `apps/frontend/src/views/inbox/components/`
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - DB migration if needed
- Required output:
  - a theme-level timeline or review stream
  - ability to review recent days of events, summaries, and notable changes
  - stronger comparison views such as:
    - today vs yesterday
    - this week vs last week
  - a lightweight weekly review surface if it fits cleanly into the existing UI
- Acceptance:
  - the user can use the platform for daily review and weekly replay, not only
    for immediate alert consumption
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 8: Improve Run Reliability, Failure Diagnosis, and Replay Controls

- Goal: Make real-source operation maintainable as the number of adapters grows.
- Inputs:
  - `apps/frontend/src/views/sources/status/components/`
  - `apps/frontend/src/views/sources/[sourceId]/components/`
  - `apps/api/src/routes/source-health.ts`
  - `apps/api/src/services/source-health-service.ts`
  - `apps/api/src/services/source-service.ts`
  - `apps/python-worker/src/info_monitor_worker/`
- Required output:
  - clearer source health states and failure classification
  - replay or rerun controls for failed or suspicious runs
  - source-level issue notes or operator hints
  - better diagnostics for "no event generated" cases
  - if feasible, lightweight adapter drift signals such as:
    - parsed count dropped sharply
    - required field missing
    - page structure likely changed
- Acceptance:
  - when a real source breaks or silently degrades, the user can locate the
    issue and retry with less manual investigation
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - `npm --workspace @info-monitor/api test`

## Not Recommended Right Now

Do not prioritize these until the real-source loop becomes stable in
day-to-day use:

- multi-user support
- permission system
- public sharing or SaaS packaging
- generic no-code source builder
- large chart analysis platform
- advanced public-opinion NLP stack
- auto-trading or auto-execution

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
