"""Tests for notification repository idempotency."""

from __future__ import annotations

from info_monitor_worker.repositories import insert_notification


class _FakeRow:
    def __init__(self, mapping):
        self._mapping = mapping


class _FakeResult:
    def __init__(self, mapping):
        self._mapping = mapping

    def first(self):
        if self._mapping is None:
            return None
        return _FakeRow(self._mapping)


class _FakeConnection:
    def __init__(self, results):
        self._results = list(results)
        self.calls = []

    def execute(self, statement, params):
        self.calls.append((str(statement), params))
        mapping = self._results.pop(0) if self._results else None
        return _FakeResult(mapping)


def test_insert_notification_inserts_when_missing():
    connection = _FakeConnection(
        [
            None,
            {"id": "notification-new"},
        ]
    )

    notification_id = insert_notification(
        connection=connection,
        notification_id="notification-new",
        event_id="event-1",
        channel="in_app",
        status="pending",
        payload_json='{"title":"hello"}',
    )

    assert notification_id == "notification-new"
    assert len(connection.calls) == 2
    assert "insert into notifications" in connection.calls[1][0].lower()


def test_insert_notification_reuses_existing_event_channel_pair():
    connection = _FakeConnection(
        [
            {"id": "notification-existing"},
            None,
        ]
    )

    notification_id = insert_notification(
        connection=connection,
        notification_id="notification-new",
        event_id="event-1",
        channel="in_app",
        status="pending",
        payload_json='{"title":"updated"}',
    )

    assert notification_id == "notification-existing"
    assert len(connection.calls) == 2
    assert "update notifications" in connection.calls[1][0].lower()
    assert "insert into notifications" not in connection.calls[1][0].lower()
