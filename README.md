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

## Runtime Roles

1. `frontend` — Vue 3 + Vite + TypeScript
2. `api` — Fastify + Kysely (PostgreSQL)
3. `python-scheduler` — polls DB for pending runs, enqueues them on schedule
4. `python-worker` — executes runs: adapters → normalizers → detectors → event rules → notifications

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

### Frontend

- **Workspace system** — workspace switcher (home), workspace-scoped dashboard/actions/topics/sources/reports, with specialized board components for three workspace types: generic Workspace, StockMarket, CompetitorWatch
- **Legacy views** — inbox, themes (list/detail/create), events (list/detail), sources (detail/health/status), notifications (list/audit/timeline), watchlist, weekly review, settings
- **Event feedback** — inline feedback cards on events, feedback stats
- **Source health** — health explanations, operational metrics
- **Stock market close report** — authority aggregation, report history, per-date view, config
- **Daily summary / Weekly summary** — delivery, history, comparison, config, export
- **Notification management** — audit log, timeline, preferences, batch operations, retry
- **User preferences** — theme favorites, saved views
- **Frontend API access** — strict backend requests via `requestJsonStrict`

### API (Fastify + Kysely)

- 15 route modules covering: health, dashboard, events (incl. feedback), themes (incl. daily-activity, price-comparison, review-note), sources (incl. presets, validate, test-run, replay, config-history, config-rollback, health), notifications (incl. batch ops, retry, send, coalesce), notification-audit, notification-preferences, rule-configurations, daily-summary, weekly-summary, stock-market-close-report, channel-config, user-preferences
- Database-backed service layer with runtime `DATABASE_URL` requirement; some service tests still exercise null-DB branches
- 23 shared PostgreSQL migrations covering all core entities
- 14 service test files covering API service behavior

### Python Worker

- **28 adapters** — demo price feed, Eastmoney (stock kline, daily billboard, market overview), Sina (stock price, gold price), Yahoo Finance, PBC (news, open market, treasury yield), CSRC/CBIRC/NDRC/SSE/SZSE/HKEX announcements, stats data release, GitHub releases, RSS feed, generic scrapers (price list, HTML price list, announcement list, news announcement list, content update list)
- **5 normalizers** — price, news announcement, financial event, content update
- **12 detectors** — price_30d_low, price_breakout, consecutive_movement, keyword_match, financial_direction, macro_deviation, RSI/MACD/KDJ/Bollinger/moving-average signals
- **2 event rules** — record_change (generic), plus detector-driven rules

### Python Scheduler

- Polls DB for pending source runs, respects holiday calendars
- Enqueues runs on configurable schedule via `SCHEDULER_POLL_SECONDS`

### Verified End-to-End Flows

- Price monitoring: seeded theme → queued run → Eastmoney kline → normalized price records → 30-day low event
- Official announcements: PBC news list → normalized news/announcement records → `new_announcement` event
- Structured financial events: PBC open market announcements → normalized financial_event records → `new_financial_event` event
- Stock market close report: authority aggregation → report generation → delivery
- Notification flow: worker → API → frontend notification center, including audit log and retry
- Recent operation feedback flows across event detail, event workbench, theme detail, inbox, and theme center
- Local demo data covers price, content update, open market operation, and official release scenarios through preview seeds and demo fixtures

## Current Status

The project has a fully functional vertical slice across all four runtime roles
(frontend, API, python-scheduler, python-worker). The workspace system supports
multiple monitoring paradigms (generic, stock market, competitor watch). Next
steps include deepening event logic for investment themes, expanding technical
indicator detectors, and productizing the weekly review flow.
