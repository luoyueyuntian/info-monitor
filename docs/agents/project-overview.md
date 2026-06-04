# Project Overview

## Purpose

This repository is an early-stage monorepo for a personal information
monitoring workspace.

Verified vertical slices already exist for:

- price monitoring
- official news / announcement monitoring
- structured financial event monitoring

## Repository Map

- `apps/frontend`: Vue 3 + Pinia + Vue Router UI
- `apps/api`: Fastify + TypeScript API
- `apps/python-worker`: Python ingestion, normalization, change detection, event generation
- `apps/python-scheduler`: Python source scheduling and run creation
- `db/migrations`: PostgreSQL schema migrations
- `scripts`: local bootstrap, migrations, seeding, and demo helpers
- `docs`: product and architecture context

## Useful Product/Architecture Context

Read these before making a non-trivial product or architecture change:

- `README.md`
- `docs/system-architecture-and-technical-plan-v1-2026-06-01.md`
- `docs/product-requirements-document-v1-2026-06-01.md`
- `docs/core-objects-and-terminology-2026-06-01.md`
