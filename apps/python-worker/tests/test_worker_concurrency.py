from dataclasses import replace
from threading import Event
import time
import os
import pytest

from info_monitor_worker.config import load_config
from info_monitor_worker.service import WorkerService
from tests.test_run_leases import queue_db

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="requires isolated PostgreSQL")


def test_slow_task_does_not_block_claiming_other_sources(queue_db):
    service = WorkerService(engine=queue_db, config=replace(load_config(), concurrency=2))
    slow_started, fast_finished, release = Event(), Event(), Event()
    def process(run):
        if run["run_id"] == "r1":
            slow_started.set()
            release.wait(timeout=5)
        else:
            fast_finished.set()
    service._process_run = process
    try:
        assert service.run_once() == 2
        assert slow_started.wait(2)
        assert fast_finished.wait(2)
        deadline = time.monotonic() + 2
        claimed = 0
        while time.monotonic() < deadline and not claimed:
            claimed = service.run_once()
            if not claimed:
                time.sleep(0.01)
        assert claimed == 1
        assert not release.is_set()
    finally:
        release.set()
        service.close()


def test_fetch_has_no_open_database_transaction_and_stale_owner_is_ignored(queue_db, monkeypatch):
    from sqlalchemy import text
    import info_monitor_worker.service as module
    from info_monitor_worker.repositories import claim_pending_runs
    from info_monitor_worker.models import RawFetchResult
    with queue_db.begin() as c:
        run = claim_pending_runs(c, limit=1)[0]
    service = WorkerService(engine=queue_db, config=replace(load_config(), concurrency=1))
    class Adapter:
        def fetch(self, theme, source):
            assert queue_db.pool.checkedout() == 0
            return RawFetchResult(payload=[{"title": "Price", "price": 100, "currency": "CNY", "spec": "test", "occurred_at": "2026-01-01T00:00:00Z"}])
        def map_to_normalizer_input(self, raw):
            return raw.payload
    monkeypatch.setattr(module, "get_adapter", lambda _: Adapter())
    def enrich(**kwargs):
        assert queue_db.pool.checkedout() == 0
        return None
    monkeypatch.setattr(module, "enrich_record_sync", enrich)
    from types import SimpleNamespace
    from info_monitor_worker import search_indexer
    indexed = []
    def index_documents(documents):
        assert queue_db.pool.checkedout() == 0
        indexed.extend(documents)
    monkeypatch.setattr(search_indexer, "_get_client", lambda: SimpleNamespace(index=lambda _: SimpleNamespace(add_documents=index_documents)))
    try:
        service._process_run(run)
        assert indexed

        with queue_db.connect() as c:
            assert c.execute(text("select status from source_runs where id=:id"), {"id": run["run_id"]}).scalar_one() == "completed"
            assert c.exec_driver_sql("select count(*) from normalized_records").scalar_one() == 1
        # A duplicate delivery with the old token cannot execute again.
        service._process_run(run)
        with queue_db.connect() as c:
            assert c.exec_driver_sql("select count(*) from raw_snapshots").scalar_one() == 1
    finally:
        service.close()


@pytest.mark.parametrize("fail_after_reclaim", [False, True])
def test_old_fetch_cannot_write_or_fail_a_new_attempt(queue_db, monkeypatch, fail_after_reclaim):
    from sqlalchemy import text
    import info_monitor_worker.service as module
    from info_monitor_worker.repositories import claim_pending_runs, recover_expired_runs
    from info_monitor_worker.models import RawFetchResult
    with queue_db.begin() as c:
        old = claim_pending_runs(c, limit=1, lease_seconds=60)[0]
    replacement = []
    class Adapter:
        def fetch(self, theme, source):
            with queue_db.begin() as c:
                c.execute(text("update source_runs set lease_expires_at=now()-interval '1 second' where id=:id"), {"id": old["run_id"]})
                recover_expired_runs(c, lease_seconds=60)
                replacement.extend(claim_pending_runs(c, limit=1, lease_seconds=60))
            if fail_after_reclaim:
                raise ValueError("old fetch failed")
            return RawFetchResult(payload=[{"title": "Price", "price": 100, "currency": "CNY", "spec": "test", "occurred_at": "2026-01-01T00:00:00Z"}])
        def map_to_normalizer_input(self, raw):
            return raw.payload
    monkeypatch.setattr(module, "get_adapter", lambda _: Adapter())
    service = WorkerService(engine=queue_db, config=replace(load_config(), concurrency=1))
    try:
        service._process_run(old)
        with queue_db.connect() as c:
            state = c.execute(text("select status,claim_token from source_runs where id=:id"), {"id": old["run_id"]}).one()
            assert state.status == "running"
            assert state.claim_token == replacement[0]["claim_token"] != old["claim_token"]
            assert c.exec_driver_sql("select count(*) from normalized_records").scalar_one() == 0
            assert c.exec_driver_sql("select latest_failure_at from sources where id='s1'").scalar_one() is None
    finally:
        service.close()


def test_heartbeat_extends_lease_while_fetch_is_still_in_progress(queue_db, monkeypatch):
    from sqlalchemy import text
    import info_monitor_worker.service as module
    from info_monitor_worker.models import RawFetchResult
    started, release = Event(), Event()
    class Adapter:
        def fetch(self, theme, source):
            if source.source_id == "s1":
                started.set()
                release.wait(timeout=35)
            return RawFetchResult(payload=[{"title": "Price", "price": 100, "currency": "CNY", "spec": "test", "occurred_at": "2026-01-01T00:00:00Z"}])
        def map_to_normalizer_input(self, raw):
            return raw.payload
    monkeypatch.setattr(module, "get_adapter", lambda _: Adapter())
    service = WorkerService(engine=queue_db, config=replace(load_config(), concurrency=2, lease_seconds=60))
    try:
        assert service.run_once() == 2
        assert started.wait(2)
        with queue_db.connect() as c:
            initial = c.exec_driver_sql("select lease_expires_at from source_runs where id='r1'").scalar_one()
        deadline = time.monotonic() + 28
        renewed = False
        while time.monotonic() < deadline:
            with queue_db.connect() as c:
                current = c.exec_driver_sql("select lease_expires_at from source_runs where id='r1'").scalar_one()
            if current > initial:
                renewed = True
                break
            time.sleep(0.2)
        assert renewed, "heartbeat did not extend the lease during the blocked fetch"
    finally:
        release.set()
        service.close()
