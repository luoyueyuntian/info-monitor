# AI Development Tasks

Updated: 2026-06-12

This file is a direct execution backlog for coding agents working in this
repository.

Use it when the goal is to continue development without re-planning the
product from scratch.

## Global Instructions

- Read the related files before editing.
- Make code changes directly; do not only provide a proposal.
- Reuse existing shared contracts, demo scene definitions, fallback data, and
  mock data patterns when possible.
- Keep frontend page entry files thin; extract page-private components under
  the route directory's `components/` folder when needed.
- If API response shapes change, update
  `apps/frontend/src/lib/api.ts` accordingly.
- Run the minimum verification commands listed for the task.
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

## Task 1: Price Theme Continuous Snapshot Compare Panel

- Goal: Add a dedicated compare panel in the price theme detail page that
  shows how multiple sources changed over the most recent 3-5 snapshots.
- Inputs:
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `apps/frontend/src/lib/api.ts`
  - existing price compare / trend components and tests
- Required output:
  - a new panel or card for multi-source recent price comparison
  - clear emphasis for lowest source
  - clear emphasis for spread widening vs narrowing
  - no removal of the existing compare card; this is a deeper view
- Acceptance:
  - user can quickly tell which source stays lowest
  - user can see whether a source is rebounding
  - user can tell whether the spread is expanding or converging
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 2: Financial Event Direction Rhythm Board

- Goal: Add a compact rhythm board for the latest 3-5 financial-event rounds,
  so the user can see whether liquidity direction is strengthening, switching,
  or staying neutral.
- Inputs:
  - `apps/frontend/src/views/themes/[themeId]/components/`
  - `apps/frontend/src/lib/api.ts`
  - existing financial-event compare / analysis UI
- Required output:
  - a board that shows recent direction, amount, and term
  - a current interpretation: strengthening / switching / neutral
  - wording must stay as decision support, not investment advice
- Acceptance:
  - user does not need to read each raw record to understand recent direction
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 3: Inbox Entry to Theme Change Chain

- Goal: Let inbox sections jump more directly into the most relevant theme
  change view instead of only linking to generic event lists.
- Inputs:
  - `apps/frontend/src/views/inbox/components/`
  - `apps/frontend/src/views/themes/[themeId]/components/`
- Required output:
  - price themes should prefer `trend` or compare-related views
  - financial-event themes should prefer `analysis` or the new rhythm board
  - official-release themes should prefer `timeline` or `analysis`
- Acceptance:
  - inbox becomes a faster entry into "what changed" rather than just "what
    event exists"
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 4: Unified Source Health Explanation Layer

- Goal: Explain why a source is abnormal and what the impact is on theme
  judgment.
- Inputs:
  - `apps/api/src/services/source-health-service.ts`
  - source status page and source detail page components
  - inbox source-related sections
  - theme detail source-related sections
- Required output:
  - unified explanation for recent failure
  - unified explanation for long time without updates
  - unified explanation for manual pause
  - unified explanation for pending backlog
  - a lightweight "impact on current judgment" indicator
- Acceptance:
  - user can tell whether an issue affects conclusion quality or only affects
    timeliness
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - `npm --workspace @info-monitor/api test`

## Task 5: Theme Review Notes

- Goal: Allow user-authored review notes on a theme detail page.
- Inputs:
  - theme detail frontend files
  - API theme-related files
  - DB migrations if needed
- Required output:
  - save a review note text
  - show last updated time
  - keep structure simple so labels / stage can be added later
- Acceptance:
  - user can create, update, and read review notes for a theme
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`
  - if DB changes are added, include migration verification

## Task 6: Event Usefulness Feedback

- Goal: Capture whether an event was useful, noisy, or still needs observation.
- Inputs:
  - event detail page
  - event workbench
  - API event-related files
  - DB migrations if needed
- Required output:
  - three feedback states: useful / noise / watch
  - store feedback for later rule tuning
  - no need to build an auto-learning loop yet
- Acceptance:
  - user can submit feedback from event detail
  - user can submit feedback from the workbench
  - stored feedback can be read back
- Minimum verification:
  - `npm run typecheck`
  - `npm run build`

## Task 7: Notification Page Interaction Tests

- Goal: Add frontend tests that lock down notification preset, status filter,
  and sorting interactions.
- Inputs:
  - `apps/frontend/src/views/notifications/index.vue`
  - related test files to add
- Required output:
  - tests for preset switching
  - tests for status filter switching
  - tests for sort switching
  - tests that ensure signal-subset state is preserved or cleared correctly
- Acceptance:
  - the recent notification-page state bugs cannot silently regress
- Minimum verification:
  - `npm --workspace @info-monitor/frontend test`
  - `npm run typecheck`

## Task 8: Shared Notification Theme / Template Tests

- Goal: Add tests for shared notification label, color, priority, and template
  behavior.
- Inputs:
  - `packages/shared-contracts/src/notification-theme.ts`
  - API notification tests if shared behavior is asserted there
- Required output:
  - tests for `getSignalLabel`
  - tests for `getSignalColors`
  - tests for `getSignalPriority`
  - tests for `renderNotification`
- Acceptance:
  - terminology or signal-mapping regressions are caught automatically
- Minimum verification:
  - `npm --workspace @info-monitor/api test`
  - `npm run typecheck`

## Not Recommended Right Now

Do not prioritize these until the core workbench becomes more stable in real
use:

- multi-user support
- permission system
- generic rule DSL
- large chart platform
- fully productized notification center
- no-code configuration system
- complex public-opinion analysis
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
