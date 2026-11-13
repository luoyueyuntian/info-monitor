News original reader implementation
1. Add additive news_articles cache/job table and safe bounded HTML text extractor. RED: extraction, URL security, queue lease tests; GREEN implementation.
2. Enqueue news URLs during normal production ingestion; dedicated single article consumer independent of source runs. API derives URL from existing event and only queues/reads cache. RED service/route tests; GREEN implementation.
3. Add escaped article reader to event details, async status polling, retry and provenance. RED lifecycle/render tests; GREEN implementation.
4. Run full verification, independent read-only review, isolated PostgreSQL16 end-to-end checks; deploy build-first with rollback and verify live article reading if SSH authorized.
Review focus: SSRF and redirects/DNS rebinding; no summary presented as original; no network in DB transaction/API; HTML XSS; queue token fencing/lease recovery; old-event lazy backfill; preserve existing list performance/source flags.
Ruling: Current API has removed mock mode; follow actual database-only contract rather than resurrecting stale mock fixtures.

Scope: User chose webpage news only; PDFs retain source links.
