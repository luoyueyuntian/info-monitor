from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from info_monitor_scheduler.db import create_db_engine
from info_monitor_scheduler.repositories import enqueue_run, fetch_schedulable_sources, has_open_run
from info_monitor_scheduler.utils import create_id


def _parse_iso_datetime(value: Any):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _is_due(source: Dict[str, Any]) -> bool:
    config = source.get("config") or {}
    interval_seconds = int(config.get("schedule_interval_seconds", 3600))
    latest_success_at = _parse_iso_datetime(source.get("latest_success_at"))

    if latest_success_at is None:
        return True

    return latest_success_at <= datetime.now(timezone.utc) - timedelta(seconds=interval_seconds)


class SchedulerService:
    def __init__(self) -> None:
        self.engine = create_db_engine()

    def run_once(self) -> int:
        queued = 0

        with self.engine.begin() as connection:
            sources = fetch_schedulable_sources(connection)

            for source in sources:
                if has_open_run(connection, source["source_id"]):
                    continue

                if not _is_due(source):
                    continue

                enqueue_run(
                    connection=connection,
                    run_id=create_id("run"),
                    theme_id=source["theme_id"],
                    source_id=source["source_id"],
                )
                queued += 1

        return queued
