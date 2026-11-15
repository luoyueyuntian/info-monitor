# Source and theme reading implementation plan

> Execute inline using executing-plans, tests first, final independent review.

Goal: User chose reading by source and theme. Both detail pages must lead with all collected content, independent of events, with a dedicated readable record detail.
Architecture: Scoped paginated content API over normalized_records; reuse isolated article queue/cache for news, financial releases and product updates. Shared reader UI loads saved original separately; PDF remains an external original link. Existing source/theme tooling remains available below content.
Tech stack: Existing Vue/Fastify/Kysely/PostgreSQL, no new dependencies.

- [ ] Task 1: RED API integration tests covering records without events, scoping, title search, pagination, compact status, missing record and safe links; implement content service/routes/contracts and source pagination index.
- [ ] Task 2: RED generalized record article tests including financial/content updates/PDF/price; share queue service between event and record endpoints without external network in HTTP transactions.
- [ ] Task 3: RED reader/browse lifecycle tests, build prominent source/theme content browser and record-first reading page, preserve Shanghai time, abort stale requests, escaped text, scoped return links.
- [ ] Task 4: Full typecheck/build/API+frontend tests with real PG16, read-only fresh-context review, fix findings RED/GREEN. Commit feature branch, build-first API deployment with rollback/additive migration; verify production scoped API and reading.

Review focus: no dependence on events; no whole text in lists; no arbitrary fetch URL; all format/status labels honest; no accidental price-page extraction; exact scoping across pagination/search; aborted/stale UI requests; index for source browsing; migration compatibility; preserve source configs and paused flags.
Ruling: Reuse current clean feature branch and approved existing app design. No new visual system. Runtime mock mode has already been removed; use actual DB-only contracts.
