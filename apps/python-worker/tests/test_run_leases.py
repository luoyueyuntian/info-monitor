"""Real PostgreSQL concurrency tests; opt in with TEST_DATABASE_URL."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from info_monitor_worker.repositories import (
    claim_pending_runs, recover_expired_runs, renew_run_leases, verify_run_claim,
    mark_run_completed,
)

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="requires isolated PostgreSQL")


@pytest.fixture
def queue_db():
    url = os.environ["TEST_DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1)
    schema = "lease_test_" + uuid4().hex
    admin = create_engine(url)
    with admin.begin() as c:
        c.exec_driver_sql(f"create schema {schema}")
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    try:
        with engine.begin() as c:
            root = Path(__file__).resolve().parents[3]
            for migration in sorted((root / "db/migrations").glob("*.sql")):
                c.exec_driver_sql(migration.read_text())
            c.exec_driver_sql("""
                insert into themes(id,name,theme_type,info_type) values ('t1','One','price','price'),('t2','Two','price','price');
                insert into sources(id,theme_id,name,source_type,adapter_key) values
                  ('s1','t1','One','api','demo_price_feed'),('s2','t1','Two','api','demo_price_feed'),('s3','t2','Three','api','demo_price_feed');
                insert into source_runs(id,theme_id,source_id,trigger_type,status,created_at) values
                  ('r1','t1','s1','scheduled','pending','2026-01-01'),('r2','t1','s1','scheduled','pending','2026-01-02'),
                  ('r3','t1','s2','scheduled','pending','2026-01-03'),('r4','t2','s3','test','pending','2026-01-04');
            """)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as c:
            c.exec_driver_sql(f"drop schema {schema} cascade")
        admin.dispose()


def claim(engine, limit=1):
    with engine.begin() as c:
        return claim_pending_runs(c, limit=limit, lease_seconds=60)


def test_two_workers_claim_disjoint_runs_and_sources(queue_db):
    barrier = Barrier(2)
    def worker():
        with queue_db.begin() as c:
            barrier.wait(timeout=5)
            return claim_pending_runs(c, limit=2, lease_seconds=60)
    with ThreadPoolExecutor(max_workers=2) as pool:
        groups = list(pool.map(lambda _: worker(), range(2)))
    runs = [run for group in groups for run in group]
    assert len(runs) == 3
    assert len({r["run_id"] for r in runs}) == 3
    assert len({r["source_id"] for r in runs}) == 3
    assert claim(queue_db) == []
    with queue_db.begin() as c:
        mark_run_completed(c, "r1", "s1")
    assert claim(queue_db)[0]["run_id"] == "r2"


def test_expired_lease_is_reclaimed_with_a_new_token(queue_db):
    old = claim(queue_db)[0]
    with queue_db.begin() as c:
        c.execute(text("update source_runs set lease_expires_at=now()-interval '1 second' where id=:id"), {"id": old["run_id"]})
        assert recover_expired_runs(c, lease_seconds=60, max_attempts=3) == 1
    new = claim(queue_db)[0]
    assert new["run_id"] == old["run_id"]
    assert new["claim_token"] != old["claim_token"]
    with queue_db.begin() as c:
        assert not verify_run_claim(c, old["run_id"], old["claim_token"])
        assert verify_run_claim(c, new["run_id"], new["claim_token"])


def test_renewal_respects_tokens_and_maximum_runtime(queue_db):
    run = claim(queue_db)[0]
    with queue_db.begin() as c:
        assert renew_run_leases(c, {run["run_id"]: "wrong"}, lease_seconds=60, max_run_seconds=1800) == 0
        assert renew_run_leases(c, {run["run_id"]: run["claim_token"]}, lease_seconds=60, max_run_seconds=1800) == 1
        c.execute(text("update source_runs set started_at=now()-interval '1 hour' where id=:id"), {"id": run["run_id"]})
        assert renew_run_leases(c, {run["run_id"]: run["claim_token"]}, lease_seconds=60, max_run_seconds=1800) == 0


def test_exhausted_test_claim_does_not_change_source_health(queue_db):
    with queue_db.begin() as c:
        c.exec_driver_sql("update source_runs set status='completed' where id!='r4'")
    run = claim(queue_db)[0]
    assert run["trigger_type"] == "test"
    with queue_db.begin() as c:
        c.exec_driver_sql("update source_runs set lease_expires_at=now()-interval '1 second',attempt_count=3 where id='r4'")
        assert recover_expired_runs(c, lease_seconds=60, max_attempts=3) == 1
        assert c.exec_driver_sql("select status from source_runs where id='r4'").scalar_one() == "failed"
        assert c.exec_driver_sql("select latest_failure_at from sources where id='s3'").scalar_one() is None


def test_exhausted_production_claim_updates_failure_health(queue_db):
    claim(queue_db)
    with queue_db.begin() as c:
        c.exec_driver_sql("update source_runs set lease_expires_at=now()-interval '1 second',attempt_count=3 where id='r1'")
        assert recover_expired_runs(c, lease_seconds=60, max_attempts=3) == 1
        assert c.exec_driver_sql("select latest_failure_at from sources where id='s1'").scalar_one() is not None


def test_locked_sources_do_not_block_other_claims(queue_db):
    with queue_db.begin() as locked:
        locked.exec_driver_sql("select id from sources where id='s1' for update")
        claimed = claim(queue_db, limit=2)
        assert {r["source_id"] for r in claimed} == {"s2", "s3"}


def test_heartbeat_skips_a_run_locked_by_its_write_transaction(queue_db):
    run = claim(queue_db)[0]
    with queue_db.begin() as writer:
        assert verify_run_claim(writer, run["run_id"], run["claim_token"])
        with queue_db.begin() as heartbeat:
            heartbeat.exec_driver_sql("set local statement_timeout='1s'")
            assert renew_run_leases(heartbeat, {run["run_id"]: run["claim_token"]}) == 0
