# Architecture Notes

## Frontend

- Source of truth is under `apps/frontend/src`
- API contract types are mirrored in `apps/frontend/src/lib/api.ts`
- Views live under `apps/frontend/src/views` and should be organized to mirror
  route structure instead of staying flat
- Each page entry should use `index.vue`
- Page-private components should live in a `components` folder adjacent to the
  page entry directory
- Views should be thin composition layers for route-level concerns
- When a view contains a distinct panel, list, form, toolbar, filter area, or
  detail block, prefer extracting it into a component instead of keeping the
  whole page in one file
- Prefer this frontend extraction order:
  1. components with their own independent local state or interaction cycle
  2. components that are fully driven by props and emit events upward
  3. pure presentational fragments only when they improve readability or reuse
- Shared display logic, formatting, and mapping code should live in `lib`,
  stores, or dedicated feature modules instead of inside multiple views
- Prefer preserving the current route/view split instead of introducing broad
  shared abstractions too early

Good default split for frontend work:

1. view: route wiring and page composition
2. component: isolated UI section or interaction block
3. store/lib: state, API calls, formatting, mapping, reusable helpers

## API

- Source of truth is under `apps/api/src`
- `src/app.ts` wires route registration
- `src/config.ts` defines runtime defaults
- Route handlers delegate to `src/services`
- Keep route files thin and move business logic into focused service modules
- If a service starts handling unrelated responsibilities, split it by domain
  behavior instead of accumulating conditional branches
- The API now requires a real database at runtime; do not add new mock-backed
  execution paths when `DATABASE_URL` is absent

## Worker

- Adapters fetch source payloads
- Normalizers convert raw payloads into canonical records by `info_type`
- Repositories persist data
- Event rules emit signals from qualifying changes
- Keep adapter, normalizer, repository, and rule logic separate; do not merge
  multiple stages into a single large module

When adding a new source pipeline, keep the responsibility split:

1. adapter fetches and maps input
2. normalizer shapes canonical records
3. repository persists data
4. event rule emits signal only when needed

## Scheduler

- Scheduler decides whether a source is due
- Scheduler enqueues runs
- Scheduler should not perform fetch/normalize logic
