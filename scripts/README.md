# Scripts

Ad hoc development and maintenance scripts can live here.

Examples for later:

- local dev bootstrap
- migration runner
- seed data loader
- one-off import helpers

Current demo seed entry points:

- `npm run db:seed:workbench-demo`
  Seeds the full local workbench demo set, including price, content update,
  PBOC news, PBOC open market, and NBS data release themes/sources.
- `npm run db:enqueue:workbench-demo`
  Enqueues runs for the full local workbench demo set after seeding.
