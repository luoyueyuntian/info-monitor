from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from info_monitor_scheduler.service import _is_due

NOW = datetime(2026, 11, 12, 5, 0, tzinfo=timezone.utc)


class FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return NOW.astimezone(tz) if tz else NOW.replace(tzinfo=None)


def due(*, failure_age=None, success_age=None, config=None):
    source = {
        "config": config or {},
        "latest_success_at": NOW - timedelta(seconds=success_age) if success_age is not None else None,
        "latest_failure_at": NOW - timedelta(seconds=failure_age) if failure_age is not None else None,
    }
    with patch("info_monitor_scheduler.service.datetime", FrozenDatetime):
        return _is_due(source)


def test_first_failure_waits_five_minutes():
    assert not due(failure_age=30)
    assert not due(failure_age=299)
    assert due(failure_age=300)


def test_old_success_does_not_bypass_recent_failure():
    assert not due(failure_age=30, success_age=7200)


def test_success_after_failure_obeys_regular_interval():
    assert due(failure_age=7200, success_age=3601)
    assert not due(failure_age=7200, success_age=30)


def test_retry_cooldown_is_configurable_and_never_less_than_one_minute():
    assert not due(failure_age=600, config={"retry_interval_seconds": 900})
    assert due(failure_age=900, config={"retry_interval_seconds": 900})
    assert not due(failure_age=30, config={"retry_interval_seconds": 0})
    assert due(failure_age=60, config={"retry_interval_seconds": 0})


def test_daily_schedule_window_still_applies_after_cooldown():
    config = {"run_after_time_local": "16:20", "schedule_timezone": "+08:00"}
    assert not due(failure_age=600, config=config)
    config["run_after_time_local"] = "09:00"
    assert due(failure_age=600, config=config)
    assert not due(failure_age=30, config=config)


def test_never_run_source_is_immediately_due():
    assert due()
