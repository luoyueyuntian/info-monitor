# Info Monitor — Project Context

## Architecture

- **Frontend**: Vue 3 + Vite + TypeScript, `apps/frontend/`
- **API**: Fastify + Kysely (PostgreSQL), `apps/api/`
- **Python Worker**: Adapters + Normalizers + Detectors + Event Rules, `apps/python-worker/`
- **Python Scheduler**: Polls DB for pending runs, enqueues them on schedule, `apps/python-scheduler/`
- **Shared Contracts**: TypeScript types in `packages/shared-contracts/`

## Key Pattern: Mock vs DB Dual Mode

Every service function has `if (!db)` branching. `getDatabase()` returns null when `DATABASE_URL` is not set, triggering mock mode with in-memory arrays from `apps/api/src/lib/mock-fixtures.ts`.

**CRITICAL**: Changes to service functions MUST update BOTH branches. Tests run in mock mode only (no DB in CI). The DB path is effectively untested unless manually verified.

## Key Pattern: Frontend Fallback

Frontend `api.ts` uses `requestJson(path, fallback)` — fetches API, falls back to hardcoded data on failure. The fallback data in `api.ts` must stay in sync with the API response shape and the mock fixtures.

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
