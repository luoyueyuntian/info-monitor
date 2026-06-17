# Workspace Module Boundaries Design

> Scope: business workspaces in the frontend product shell, not npm workspaces.

## Goal

Reshape the product so the four business workspaces can evolve in parallel without continuing to accumulate logic in `App.vue` and stock-market-only branches. The left sidebar should remain a stable workspace switcher and must not render stock-specific report content.

## Current Problems

1. Workspace identity is mostly a frontend concern.
   The frontend loads global `themes/events/sources` and slices them locally via `buildWorkspaceDataset()`.
2. The app shell contains product logic.
   `App.vue` renders stock-only sidebar cards and branches into `StockMarketAppShell`.
3. Route structure looks generic, but behavior is not.
   Workspace route entry files branch on `isStockMarket`, which encourages future workspaces to add more top-level conditions.
4. Detail pages contain embedded workspace assumptions.
   Event, theme, and source detail pages hardcode stock-market return flows and stock-specific investigation actions.

## Target Architecture

### 1. Platform Shell

The platform shell is responsible only for:

- brand frame
- left workspace switcher
- current workspace header
- current workspace section navigation
- rendering the active route content

The shell must not contain workspace-specific report summaries, stock-only cards, or section-specific data polling.

### 2. Workspace Module Layer

Each business workspace gets a module boundary in the frontend:

- static definition
- section navigation metadata
- section view registration
- future workspace-specific detail enhancers and API adapters

The near-term module contract is intentionally small. The first extraction target is section metadata and section component resolution, because those are the main sources of top-level branching today.

### 3. Progressive Data Boundary Shift

This change does not fully migrate workspace scoping into the API yet. Instead it prepares for that move by:

- centralizing workspace identifiers and section metadata
- reducing frontend shell coupling
- making future workspace-specific data loaders attach to a module instead of to `App.vue`

Later work will move workspace scoping from frontend keyword classification to API-owned workspace scope responses.

## Frontend Structure

Planned structure:

```text
apps/frontend/src/workspaces/
  catalog.ts
  registry.ts
  section-resolver.ts
  types.ts
```

Responsibilities:

- `catalog.ts`: shared workspace definitions and section labels
- `registry.ts`: pure lookup helpers for nav and section metadata
- `section-resolver.ts`: maps `(workspaceId, section)` to the registered section view component
- `types.ts`: shared workspace shell and section types

## UX Decision

The left sidebar remains stable across all workspaces and contains only:

- product brand block
- workspace list

Stock-market-specific quick report links move out of the sidebar. In this phase they are removed from the shell rather than relocated into a new global container.

## Implementation Phases

### Phase 1

- Add workspace module metadata files
- Simplify `App.vue` so the left sidebar only shows workspaces
- Use one generic top content header for all workspaces
- Replace route-level `isStockMarket` branches with section component resolution through the workspace registry

### Phase 2

- Move stock-specific detail context/actions into workspace module hooks
- Introduce workspace-scoped frontend loaders
- Add API contracts for workspace summaries and scoped datasets

### Phase 3

- Move workspace classification/scoping into API and persistence model
- Remove frontend-owned keyword classification as the source of truth
- Extract shared functionality only after at least two workspaces converge on the same behavior

## Constraints

- Preserve current route URLs
- Preserve current stock-market feature pages
- Do not remove mock-mode compatibility
- Do not force premature abstraction across all four workspaces
- Keep current sidebar width and general shell layout behavior stable

## Success Criteria

1. `App.vue` no longer contains stock-market sidebar report cards or stock-only shell wrappers.
2. Workspace route entry files resolve views via workspace registry instead of explicit `isStockMarket` checks.
3. New workspace-specific section implementations can be added without editing `App.vue`.
4. The left sidebar always displays only the workspace list.
