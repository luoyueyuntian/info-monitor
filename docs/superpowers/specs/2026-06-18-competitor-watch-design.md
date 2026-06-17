# Competitor Watch Workspace Design

## Goal

Turn `competitor-watch` from a generic shared workspace shell into a dedicated competitor-intelligence workspace that helps product and operations work through product moves, release activity, content changes, and source confidence without requiring backend contract changes.

## Current Problems

1. The workspace is correctly classified, but not correctly expressed.
   `content_update` themes already flow into `competitor-watch`, yet the workspace still renders the shared dashboard, actions board, and topics board.
2. The UI currently shows generic workload state instead of competitor judgment state.
   Users can see counts and event lists, but they cannot quickly answer which competitor is most active, what kind of move happened, or whether a change looks like a release, campaign, pricing move, or docs update.
3. Existing data is underused.
   Event fixtures and API contracts already expose fields such as `event.context.object_name`, `event.context.update_type`, `title`, `summary`, `theme.latestInsight`, and source health, but the shared views do not organize them into competitor-specific signals.
4. The stock-market workspace has already proven the module pattern.
   `stock-market` uses workspace-specific section boards via `section-resolver.ts`, while `competitor-watch` still falls back to shared boards for every section.

## Product Decision

This iteration will make `competitor-watch` own three sections:

- `dashboard`
- `actions`
- `topics`

The following sections stay shared for now:

- `sources`
- `reports`

This is an intentional scope boundary. It gives the workspace a clear identity without expanding into every section in one pass.

## Constraints

- Do not change backend APIs or shared contracts.
- Do not change API mock/DB branching behavior.
- Continue using frontend-derived workspace datasets from `buildWorkspaceDataset()`.
- Continue using existing event status transitions: `open`, `tracking`, `ignored`.
- Continue formatting user-facing dates with the Asia/Shanghai-aware helpers in `presentation.ts`.
- Keep existing route URLs unchanged.

## Target UX

### 1. Dashboard: Competitor Action Radar

The dashboard should answer four questions at a glance:

1. Which competitors or monitored products are moving the most?
2. What type of moves are happening right now?
3. Which events should be judged first?
4. Which sources are too weak to trust without validation?

Planned structure:

- hero banner with competitor-specific positioning text
- four top metrics:
  - active objects
  - new actions in the last 24 hours
  - open actions
  - warning sources
- action pulse panel grouped by action type
- priority actions panel listing the most urgent events
- active objects panel showing the busiest monitored competitors/products
- source caution panel showing sources in warning state

The dashboard should feel like an action radar, not a generic analytics overview.

### 2. Actions: Competitor Triage Board

The actions page should help users perform first-pass judgment on incoming signals.

Planned behavior:

- retain filters and status operations from the shared board
- add competitor-specific grouping by action type
- show each card with:
  - object name
  - action type
  - theme name
  - occurred time
  - summary
  - priority label
  - status actions
- preserve `updateEventStatus()` as the only mutation path

Primary action buckets:

- function and release
- pricing and packaging
- campaign and content
- docs and support
- other signals

The page should help users move from “something changed” to “what kind of move is this and do I keep tracking it?”

### 3. Topics: Competitor Profile Wall

The topics page should turn themes into long-lived competitor intelligence assets.

Each topic card should summarize:

- monitored object/theme name
- latest move time
- latest move type
- open action count
- tracking action count
- source count
- source health
- short observation recommendation

Topic groupings should reflect monitoring state rather than generic status only:

- high-frequency movers
- objects needing source validation
- objects already in sustained tracking

This makes the topic page feel like a wall of competitor profiles instead of a flat theme list.

## Data Strategy

No API changes are required. The frontend should derive competitor intelligence from existing workspace-scoped data.

### Existing Fields To Reuse

- `event.context.object_name`
- `event.context.update_type`
- `event.context.url`
- `event.title`
- `event.summary`
- `event.infoType`
- `theme.name`
- `theme.latestInsight`
- `theme.latestEventSignal`
- `theme.latestEventAt`
- `source.status`
- `source.latestRunAt`

### Derived Concepts

Add a small competitor-specific intelligence layer at:

`apps/frontend/src/workspaces/competitor-watch/intelligence.ts`

Suggested derived concepts:

- `CompetitorActionType`
- `CompetitorActionPulse`
- `CompetitorFocusObject`
- `CompetitorActionBucket`
- `CompetitorTopicCard`

### Resolution Rules

#### Object Name

Resolve object name in this order:

1. `event.context.object_name` when present and non-empty
2. `theme.name`

#### Action Type

Resolve action type in this order:

1. `event.context.update_type`
2. keyword inference from `event.title` and `event.summary`
3. fallback to `other`

Normalized display groups:

- `feature_release`
- `pricing_packaging`
- `campaign_content`
- `docs_support`
- `other`

Suggested inference cues:

- feature/release/version/update/dev mode/changelog -> `feature_release`
- pricing/plan/package/enterprise/billing -> `pricing_packaging`
- campaign/activity/launch/social/content/marketing -> `campaign_content`
- help/docs/guide/support/faq -> `docs_support`

These cues should stay lightweight and deterministic. This layer is a display organizer, not a classifier with product risk.

### Degradation Rules

The workspace must degrade gently when structured fields are missing:

- missing `update_type` -> infer from title/summary, else `other`
- missing `object_name` -> use `theme.name`
- missing recent events for a theme -> still render topic cards with a “暂无近期动作” style summary
- warning or sparse sources -> raise caution messaging instead of hiding the object

## Frontend Structure

### Section Resolution

Update `apps/frontend/src/workspaces/section-resolver.ts` so `competitor-watch` resolves:

- `dashboard` -> competitor-specific dashboard board
- `actions` -> competitor-specific actions board
- `topics` -> competitor-specific topics board

Keep:

- `sources` -> shared sources board
- `reports` -> shared reports board

### New Components

Create:

- `apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/CompetitorWatchDashboardBoard.vue`
- `apps/frontend/src/views/workspace/[workspaceId]/actions/components/CompetitorWatchActionsBoard.vue`
- `apps/frontend/src/views/workspace/[workspaceId]/topics/components/CompetitorWatchTopicsBoard.vue`

### Shared Dependencies To Reuse

- `useWorkspaceData()`
- `WorkspacePageHeader.vue`
- `updateEventStatus()`
- `scoreWorkspaceEventPriority()`
- `sortWorkspaceEvents()`
- `workspaceReferenceNow()`
- formatting and label helpers from `presentation.ts`

## Page-Level Data Flow

### Dashboard Flow

1. Load workspace-scoped `themes`, `events`, and `sources` through `useWorkspaceData()`
2. Compute `referenceNow`
3. Feed dataset into competitor intelligence helpers
4. Render:
   - metrics
   - action pulse
   - priority events
   - focus objects
   - warning sources

### Actions Flow

1. Load workspace dataset through `useWorkspaceData()`
2. Filter and sort events using existing filters plus competitor-derived action type
3. Bucket filtered events by competitor action type
4. Render grouped cards
5. Use `updateEventStatus()` for all state transitions
6. Refresh workspace data after mutation

### Topics Flow

1. Load workspace dataset through `useWorkspaceData()`
2. Aggregate events and sources per theme
3. Build competitor topic cards
4. Partition cards by monitoring state
5. Render grouped sections with card-level recommendations

## Error Handling And Empty States

- If the workspace is missing, keep current redirect behavior.
- If a competitor bucket has no events, render a calm empty message instead of collapsing the layout.
- If there are no competitor themes yet, use the workspace empty-state copy from the catalog.
- If warning sources exist, surface them explicitly rather than blending them into generic metrics.
- Avoid blocking rendering when structured event context is incomplete.

## Testing Strategy

### 1. Resolver Coverage

Update:

- `apps/frontend/src/workspaces/section-resolver.test.ts`

New expectations:

- `competitor-watch/dashboard` resolves to a competitor-specific board
- `competitor-watch/actions` resolves to a competitor-specific board
- `competitor-watch/topics` resolves to a competitor-specific board
- `competitor-watch/sources` still resolves to `shared/sources`

### 2. Competitor Intelligence Unit Tests

Add a new test file for the competitor helper layer that uses existing mock fixtures:

- `Figma Product Updates`
- `Vue.js 版本发布`

Verify at least:

- object name resolution
- action type resolution
- pulse grouping
- focus object ordering
- topic card recommendation behavior

### 3. Regression Coverage

Keep current workspace registry tests passing:

- workspace identifiers remain unchanged
- section metadata remains stable

No backend tests are required for this iteration because the change is frontend-only and should reuse current mock-mode data.

## Implementation Order

1. Add competitor intelligence helper and unit tests
2. Register competitor-specific section resolution
3. Build competitor dashboard board
4. Build competitor actions board
5. Build competitor topics board
6. Run frontend tests and workspace-level verification

## Success Criteria

1. Entering `/workspace/competitor-watch/dashboard` shows competitor-specific radar content instead of the shared dashboard.
2. Entering `/workspace/competitor-watch/actions` shows grouped competitor action triage instead of the shared three-column generic board.
3. Entering `/workspace/competitor-watch/topics` shows grouped competitor profile cards instead of the shared topic asset wall.
4. The workspace continues to function with existing mock fixtures and current API responses.
5. `sources` and `reports` remain unchanged and shared.
