# Scripts

Ad hoc development and maintenance scripts can live here.

Examples for later:

- local dev bootstrap
- migration runner
- seed data loader
- one-off import helpers

Current demo seed entry points:

- `npm run db:seed:workbench-demo`
  Seeds the full local workbench demo set, including:
  - Price: Surface Pro 8, Eastmoney Moutai
  - Content update: Figma
  - News announcement: PBOC News, NBS CPI
  - Financial event: PBOC Open Market
- `npm run db:enqueue:workbench-demo`
  Enqueues runs for the full local workbench demo set after seeding.

Individual seed scripts:

- `npm run db:seed:demo` — Surface Pro 8 price
- `npm run db:seed:eastmoney-demo` — Eastmoney Moutai price
- `npm run db:seed:figma-demo` — Figma content update
- `npm run db:seed:pbc-news-demo` — PBOC news
- `npm run db:seed:pbc-open-market-demo` — PBOC open market
- `npm run db:seed:stats-data-release-demo` — NBS CPI data release
