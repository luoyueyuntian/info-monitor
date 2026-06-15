from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Any, Dict

from info_monitor_scheduler.db import create_db_engine
from info_monitor_scheduler.holiday_calendars import get_holiday_calendar
from info_monitor_scheduler.repositories import enqueue_run, fetch_schedulable_sources, has_open_run
from info_monitor_scheduler.utils import create_id


def _parse_iso_datetime(value: Any):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _parse_timezone(value: Any) -> timezone:
    if not value:
        return timezone.utc

    text = str(value).strip()

    if text.upper() == "UTC":
        return timezone.utc

    sign = 1
    if text.startswith("-"):
        sign = -1
        text = text[1:]
    elif text.startswith("+"):
        text = text[1:]

    if ":" in text:
        hour_text, minute_text = text.split(":", 1)
    else:
        hour_text, minute_text = text, "00"

    try:
        hours = int(hour_text)
        minutes = int(minute_text)
    except ValueError:
        return timezone.utc

    return timezone(sign * timedelta(hours=hours, minutes=minutes))


def _parse_local_time(value: Any) -> time | None:
    if not value:
        return None

    text = str(value).strip()
    try:
        return time.fromisoformat(text)
    except ValueError:
        return None


def _parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value

    if value is None:
        return default

    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "y", "on"}:
        return True
    if text in {"false", "0", "no", "n", "off"}:
        return False

    return default


def _parse_skip_dates_local(value: Any) -> set[str]:
    if isinstance(value, list):
        return {str(item).strip() for item in value if str(item).strip()}

    if isinstance(value, str):
        return {item.strip() for item in value.split(",") if item.strip()}

    return set()


def _is_allowed_local_trading_day(now_utc: datetime, config: Dict[str, Any], schedule_tz: timezone) -> bool:
    now_local = now_utc.astimezone(schedule_tz)
    if _parse_bool(config.get("run_weekdays_only"), default=False) and now_local.weekday() >= 5:
        return False

    holiday_calendar_name = str(config.get("holiday_calendar") or "").strip()
    holiday_dates = get_holiday_calendar(holiday_calendar_name)
    holiday_dates.update(_parse_skip_dates_local(config.get("skip_dates_local")))

    if now_local.date().isoformat() in holiday_dates:
        return False

    return True


def _is_after_local_schedule_window(
    now_utc: datetime,
    latest_success_at: datetime | None,
    run_after_time_local: time | None,
    schedule_tz: timezone,
) -> bool:
    if run_after_time_local is None:
        return True

    now_local = now_utc.astimezone(schedule_tz)
    scheduled_today_local = datetime.combine(
        now_local.date(),
        run_after_time_local,
        tzinfo=schedule_tz,
    )

    if now_local < scheduled_today_local:
        return False

    if latest_success_at is None:
        return True

    latest_local = latest_success_at.astimezone(schedule_tz)
    if latest_local >= scheduled_today_local:
        return False

    return True


def _is_due(source: Dict[str, Any]) -> bool:
    config = source.get("config") or {}
    interval_seconds = int(config.get("schedule_interval_seconds", 3600))
    latest_success_at = _parse_iso_datetime(source.get("latest_success_at"))
    now_utc = datetime.now(timezone.utc)
    run_after_time_local = _parse_local_time(config.get("run_after_time_local"))
    schedule_tz = _parse_timezone(config.get("schedule_timezone"))

    if not _is_allowed_local_trading_day(now_utc=now_utc, config=config, schedule_tz=schedule_tz):
        return False

    if run_after_time_local is not None:
        return _is_after_local_schedule_window(
            now_utc=now_utc,
            latest_success_at=latest_success_at,
            run_after_time_local=run_after_time_local,
            schedule_tz=schedule_tz,
        )

    if latest_success_at is None:
        return True

    return latest_success_at <= now_utc - timedelta(seconds=interval_seconds)


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
