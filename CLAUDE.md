# Info Monitor — Project Context

## Architecture

- **Frontend**: Vue 3 + Vite + TypeScript, `apps/frontend/`
- **API**: Fastify + Kysely (PostgreSQL), `apps/api/`
- **Python Worker**: Adapters + Normalizers + Detectors + Event Rules, `apps/python-worker/`
- **Python Scheduler**: Polls DB for pending runs, enqueues them on schedule, `apps/python-scheduler/`
- **Shared Contracts**: TypeScript types in `packages/shared-contracts/`

## Key Pattern: Database Required at Runtime

API runtime now requires `DATABASE_URL`. `getDatabase()` throws when the database connection string is missing; runtime mock mode has been removed.

**CRITICAL**: Service and route behavior should assume a real database is present at runtime. Existing API tests currently cover the no-DB failure path and selected pure helpers, but they still do not provide broad real-DB coverage.

## Key Pattern: Frontend Uses Strict API Calls

Frontend API access should assume the backend is available. Do not add new runtime fallback datasets or silent mock responses in `apps/frontend/src/lib/api.ts`.

## Timezone

Product uses Asia/Shanghai (UTC+8). All user-facing dates must be in this timezone. Backend uses `toISOString()` (UTC) — convert before display.

## Python Dependencies

Explicit deps in `apps/python-worker/pyproject.toml` and `apps/python-scheduler/pyproject.toml`. If you import a package, declare it in the relevant `pyproject.toml` — don't rely on transitive deps.

## Code Review

Use the code-review skill at `~/.claude/skills/code-review.md` for systematic reviews. It includes a blind-spot checklist derived from past review failures.

## Verification Commands

```bash
npm run typecheck          # All workspaces
npm run build              # All workspaces
npm --workspace @info-monitor/api test
npm --workspace @info-monitor/frontend test
npm run test:python-worker # Python worker pytest
```
