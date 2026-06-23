# Info Monitor

Personal information workspace for topic-driven monitoring, historical storage,
change detection, and high-signal alerts.

## Workspace Layout

- `apps/frontend`: Vue 3 app
- `apps/api`: Node.js business API
- `apps/python-worker`: Python crawler and processing worker
- `apps/python-scheduler`: Python scheduler
- `packages/shared-contracts`: shared API contract types
- `db/migrations`: shared SQL migrations
- `docs`: product and architecture documents

## Planned Runtime Roles

1. `frontend`
2. `api`
3. `python-scheduler`
4. `python-worker`

## First Run Checklist

1. Copy `.env.example` to `.env`
2. Install Node dependencies with `npm install --cache ./.npm-cache`
3. Start PostgreSQL with `npm run db:up`
4. Apply migrations with `npm run db:migrate`
5. Seed demo data with `npm run db:seed:demo`
6. Create Python virtual environments for the Python apps and install their dependencies

## One-Click Preview

Run everything needed for a local preview:

```bash
npm run preview
```

This will:

1. Ensure `.env` exists
2. Ensure Node dependencies are installed
3. Ensure Python worker and scheduler virtual environments are installed
4. Start PostgreSQL
5. Apply migrations
6. Seed demo and real-source themes
7. Queue initial runs and execute the worker once
8. Start the Node API, Vue frontend, and a background scheduler/worker loop

The preview flow now seeds the full workbench demo set by default, including:

- price monitoring
- Eastmoney stock price demo
- PBOC news demo
- PBOC open market operations demo
- NBS data release demo

If you only want to prepare the environment without starting the servers:

```bash
npm run preview:prepare
```

## Current Dev Commands

### Frontend

```bash
npm run dev:frontend
```

### Node API

```bash
npm run dev:api
```

### Python worker

```bash
cd apps/python-worker
python3 -m venv .venv
source .venv/bin/activate
env PIP_CACHE_DIR=../../.pip-cache .venv/bin/pip install .
env DATABASE_URL=postgresql://postgres:postgres@localhost:5432/info_monitor \
  PYTHONPATH=src .venv/bin/python -m info_monitor_worker.main
```

### Python scheduler

```bash
cd apps/python-scheduler
python3 -m venv .venv
source .venv/bin/activate
env PIP_CACHE_DIR=../../.pip-cache .venv/bin/pip install .
env DATABASE_URL=postgresql://postgres:postgres@localhost:5432/info_monitor \
  PYTHONPATH=src .venv/bin/python -m info_monitor_scheduler.main
```

## End-to-End Demo Flow

1. `npm run db:up`
2. `npm run db:migrate`
3. `npm run db:seed:workbench-demo`
4. Run the Python scheduler once
5. Run the Python worker once
6. Open the frontend or query the API

To enqueue another demo run manually:

```bash
npm run db:enqueue:workbench-demo
```

If you want to seed or enqueue individual demo slices instead:

```bash
npm run db:seed:demo
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

To focus on the real-source price adapter only:

```bash
npm run db:seed:eastmoney-demo
npm run db:enqueue:eastmoney-demo
```

To seed and test the first official announcement source adapter:

```bash
npm run db:seed:pbc-news-demo
npm run db:enqueue:pbc-news-demo
```

To seed and test the first structured official financial-event adapter:

```bash
npm run db:seed:pbc-open-market-demo
npm run db:enqueue:pbc-open-market-demo
```

## What Exists Today

- Vue 3 frontend skeleton with inbox, themes, theme detail, event detail, source status, and theme creation views
- Node.js API skeleton with real route structure and a database-backed service layer that falls back to mock data for local development when `DATABASE_URL` is not configured
- Notification flow now spans worker -> API -> frontend, including a notification center and read-state updates
- Shared PostgreSQL migration for core entities such as themes, sources, runs, raw snapshots, normalized records, changes, and events
- Python worker skeleton with a first demo price-feed adapter, price normalizer, and 30-day low event rule
- Python scheduler skeleton that can enqueue pending source runs for active sources
- Real demo path verified: seeded theme -> queued run -> normalized records -> 30-day low event
- First real-source adapter verified: Eastmoney stock kline -> normalized daily price records
- Official source adapter verified: PBOC news list -> normalized news/announcement records
- Structured financial-event adapter verified: PBOC open market announcements -> normalized financial_event records
- Official-source event flow verified: `new_announcement` and `new_financial_event` can now reach the dashboard
- Recent operation feedback now flows across event detail, event workbench, theme detail, inbox, and theme center
- Local demo data now includes price, content update, open market operation, and official release scenarios in both fallback and seeded paths

## Current Status

The repository is now past pure scaffolding and contains the first verified
vertical slice for the price-monitoring scenario. The next most useful step is
to deepen event logic for investment information themes and add a first
structured official macro data source.
