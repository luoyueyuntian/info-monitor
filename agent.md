# Agent Guide for `info-monitor`

This file is the entry point for coding agents working in this repository.
Read this page first, then continue into the focused docs only as needed.

## What This Repo Is

`info-monitor` is a monorepo for a personal information monitoring workspace.
It already has a working vertical slice across:

- scheduler
- worker
- API
- frontend

The end-to-end path to preserve is:

1. scheduler enqueues runs
2. worker fetches and stores raw payloads
3. worker normalizes records and emits changes/events
4. API exposes the resulting state
5. frontend renders the result

## Read Order

Start here, then open the smallest next document that matches the task:

1. `docs/agents/project-overview.md`
2. `docs/agents/runtime-and-commands.md`
3. `docs/agents/architecture.md`
4. `docs/agents/change-rules.md`

## Quick Map

- `apps/frontend`: Vue 3 UI
- `apps/api`: Fastify API
- `apps/python-worker`: ingestion, normalization, event generation
- `apps/python-scheduler`: scheduling and run creation
- `db/migrations`: PostgreSQL migrations
- `scripts`: seed, migration, and preview helpers
- `docs`: product and architecture context

## Quick Commands

```bash
npm run preview
npm run typecheck
npm run build
```

## Code Organization Rules

- Do not keep growing a page/view file once it starts mixing layout, state,
  data mapping, and interaction logic
- Frontend pages under `apps/frontend/src/views` should act as composition
  layers; extract reusable or logically distinct sections into components
- For frontend extraction order, split components with their own independent
  state first, then split components that can be cleanly controlled by props
- Page files under `apps/frontend/src/views` should follow route-oriented
  directories instead of a flat file list
- Each page entry file should be named `index.vue`; distinguish pages by
  directory name rather than by `*View.vue` filenames
- Page-private components should live under that page directory's `components`
  folder instead of a shared top-level bucket
- Prefer splitting by domain or feature, not by generic file type alone
- Avoid large "god files" in frontend views, API routes, or Python services;
  if one file owns multiple responsibilities, split it
- Reuse shared presentation or transformation logic from dedicated modules
  instead of duplicating it across pages

See `docs/agents/architecture.md` and `docs/agents/change-rules.md` for the
more specific rules.

## Important Reminder

Prefer editing source files only. Avoid hand-editing generated artifacts such as:

- `apps/python-worker/build`
- `apps/python-worker/src/info_monitor_worker.egg-info`
- `apps/python-scheduler/build`
- `apps/python-scheduler/src/info_monitor_scheduler.egg-info`
- `node_modules`
