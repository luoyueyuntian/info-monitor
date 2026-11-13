# Stability follow-up plan

> Execute inline with TDD and independent review; preserve all earlier deployed changes.

**Goal:** Stop automatic retry churn for sources that cannot fetch because their mandatory URL is absent.
**Evidence:** Overnight services stable, no pending/running backlog; 132 of 136 recent failures came from Official Announcement API without config.url. Sina returned HTTP200 with current price0, which must not be fabricated into a price.
**Approach:** Fetch adapter_key with scheduler candidates. Before interval checks, skip only known URL-required adapters with missing/non-string/blank URLs. Dedicated official adapters without URL config remain schedulable. Do not change is_paused, status, history or manual/test entrypoints. After a valid URL is supplied, the normal schedule and retry cooldown govern resumption.

- [x] Write failing tests for known URL-required adapters, malformed/blank URLs, valid URL recovery, dedicated adapters and repository metadata.
- [x] Implement scheduler preflight and run complete scheduler tests.
- [x] Independent review; build/verify candidate with real database read-only (no enqueues), deploy with rollback.
- [x] Verify no new scheduled invalid-source runs across a poll, healthy API/Prometheus and source pause flags unchanged.


## Verification
- Overnight API healthy for ~13 hours, Worker up ~17 hours, no pending/running backlog. Last-12-hour sample completed 341 runs; error grouping showed 132 missing-URL failures and 4 temporary no-valid-price failures.
- Red baseline: 25 scheduler test failures; final suite: 37 passed. Independent review also reran all 37 and found no actionable issues.
- Candidate read-only production smoke checked 18 enabled sources, skipped the one incomplete generic announcement source, and retained dedicated-adapter scheduling.
- Deployed complete scheduler image info-monitor-scheduler:source-preflight. Rollback image info-monitor-scheduler:before-source-preflight retained; no schema changes or history deletion.
- After 142 seconds across multiple scheduler polls: zero newly scheduled missing-URL runs; all source is_paused flags matched baseline. Runtime/service source hashes matched.
- API/Worker continued running. API health HTTP200; dashboard ~31 ms, operational metrics ~23 ms; Prometheus up=1.
- Sina returned HTTP200 with current price0 during diagnosis; no price was fabricated. Later production success at 2026-11-13 09:27 Asia/Shanghai confirmed automatic recovery.
- Backup and result: /home/xhh-linux/backups/info-monitor/stability-20261113/verification.json.
- API/frontend/Worker code and user source configuration unchanged in this follow-up. Incomplete sources still require a valid URL before actual collection can resume.

## Source continuation
- Remaining generic sources are draft/unconfigured templates, not discoverable public APIs: Taobao/PDD/JD/second-hand require concrete products/categories and an authorized API; generic official announcements do not identify an institution. User clarification requested for targets and existing API/config paths; no credentials invented or sample data substituted.
- SMZDM ordinary access recovered on a single normal read, yielding 20 parsed items without a CAPTCHA. Restored the specific source previously paused by this task, preserving its six-hour interval and adding a 1,800-second failure cooldown. Configuration backed up at /home/xhh-linux/backups/info-monitor/stability-20261113/smzdm-before-restore.json.
- Scheduled production run run_747e6bb4-c8b5-4f25-a27e-bbc254a4578f completed with attempt_count=1 and no error at 2026-11-13 09:59:19 Asia/Shanghai. Source enabled; automatic failure fallback was prepared but not needed. No CAPTCHA bypass performed.
- SSE/SZSE/HKEX each recorded 4 successful runs within the last 24-hour query window, confirming existing first-party feeds remain active.
