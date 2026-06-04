# Change Rules

## Editing Rules

- Edit source files, not generated output
- Keep changes scoped to the relevant app whenever possible
- Prefer adding or refining modules over extending already-large files
- Do not leave page-level views as the home for large UI sections; extract
  components when a section has its own markup, behavior, or state
- For frontend refactors, prefer splitting stateful sections before splitting
  stateless display blocks
- After stateful sections are extracted, prefer prop-driven components over
  ad hoc template fragments
- Do not add new top-level flat `*View.vue` files under `apps/frontend/src/views`
- Organize pages by route path, keep page entries named `index.vue`, and place
  page-private components in the page directory's `components` folder
- Do not mix routing, API orchestration, heavy presentation mapping, and UI
  interaction details in a single frontend file
- Do not mix HTTP wiring, business rules, and persistence details in a single
  API file
- Name new modules by feature or responsibility so the file boundary is obvious
- Add a new file under `db/migrations` for schema changes; do not rewrite old migrations
- If API response shapes change, update `apps/frontend/src/lib/api.ts`
- If a new ingestion capability is added, wire the full path instead of leaving partial plumbing
- Do not commit secrets or machine-specific absolute paths

Generated artifacts that should usually not be hand-edited:

- `apps/python-worker/build`
- `apps/python-worker/src/info_monitor_worker.egg-info`
- `apps/python-scheduler/build`
- `apps/python-scheduler/src/info_monitor_scheduler.egg-info`
- `node_modules`

## Verification Expectations

Use the smallest verification that proves the change, then expand if the change
crosses boundaries.

- UI-only change: `npm run typecheck` and frontend build if needed
- API-only change: `npm run typecheck`
- Cross-TS-app change: `npm run typecheck` and `npm run build`
- DB or ingestion flow change: run the needed migrations/seeds and execute the relevant worker/scheduler path

There is no dedicated automated test suite yet, so typecheck, build, and
scenario-based manual verification are the main safety nets.

## Good Defaults For Agents

- Prefer `rg` for code search
- Read the existing docs before making architectural changes
- Preserve naming patterns such as `theme_*`, `source_*`, `run_*`
- When touching a large file, first check whether the better fix is to split it
- Keep docs updated when behavior or workflow meaningfully changes
- If a change touches both ingestion and presentation, verify the end-to-end path
