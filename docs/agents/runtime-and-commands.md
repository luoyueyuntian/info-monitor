# Runtime And Commands

## Default Local Runtime

- Frontend dev server: `http://localhost:5173`
- API base URL: `http://localhost:3001/api`
- API host/port: `0.0.0.0:3001`
- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/info_monitor`

## Important Environment Variables

Defined in `.env.example`:

- `DATABASE_URL`
- `VITE_API_BASE_URL`
- `API_PORT`
- `API_HOST`
- `CORS_ORIGIN`
- `RAW_STORAGE_DIR`
- `SCHEDULER_POLL_SECONDS`

## Common Commands

From the repository root:

```bash
npm install --cache ./.npm-cache
npm run db:up
npm run db:migrate
npm run db:seed:demo
npm run preview
```

Focused commands:

```bash
npm run dev:frontend
npm run dev:api
npm run typecheck
npm run build
npm run preview:prepare
```

## Demo Helpers

```bash
npm run db:seed:eastmoney-demo
npm run db:seed:pbc-news-demo
npm run db:seed:pbc-open-market-demo
npm run db:seed:stats-data-release-demo

npm run db:enqueue:demo
npm run db:enqueue:eastmoney-demo
npm run db:enqueue:pbc-news-demo
npm run db:enqueue:pbc-open-market-demo
npm run db:enqueue:stats-data-release-demo
```

## Python App Setup

Worker:

```bash
cd apps/python-worker
python3 -m venv .venv
env PIP_CACHE_DIR=../../.pip-cache .venv/bin/pip install .
env DATABASE_URL=postgresql://postgres:postgres@localhost:5432/info_monitor \
  PYTHONPATH=src .venv/bin/python -m info_monitor_worker.main
```

Scheduler:

```bash
cd apps/python-scheduler
python3 -m venv .venv
env PIP_CACHE_DIR=../../.pip-cache .venv/bin/pip install .
env DATABASE_URL=postgresql://postgres:postgres@localhost:5432/info_monitor \
  PYTHONPATH=src .venv/bin/python -m info_monitor_scheduler.main
```
