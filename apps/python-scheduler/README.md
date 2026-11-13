# Python Scheduler

Owns:

- source scheduling
- run creation
- retry timing
- pause and resume aware polling

Sources are polled every `SCHEDULER_POLL_SECONDS` (default 30 seconds).
After a failure newer than the last success, scheduled retries wait at least
`config.retry_interval_seconds` (default 300 seconds, minimum 60 seconds).
The normal collection interval, local execution window and trading calendar
still apply. Manual runs are unaffected; paused sources remain paused.

Generic URL-based adapters and RSS feeds without a nonblank string `config.url`
are skipped before automatic scheduling. Dedicated official/quote adapters use
their built-in endpoints and do not require this generic field. Supplying a URL
restores eligibility under the normal interval/cooldown rules. This preflight
does not change source status, pause flags, or manual/test-run behavior.
