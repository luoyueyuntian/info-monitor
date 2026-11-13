import json
import os
from pathlib import Path
import pytest
from sqlalchemy import event
from info_monitor_worker.maintenance import archive_failed_runs, restore_archive
from tests.test_run_leases import queue_db

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="requires isolated PostgreSQL")


def seed(engine):
    with engine.begin() as c:
        c.exec_driver_sql("""insert into source_runs(id,theme_id,source_id,trigger_type,status,created_at,finished_at) values
          ('empty','t1','s1','scheduled','failed','2026-01-01','2026-01-01'),
          ('child','t1','s1','scheduled','failed','2026-01-01','2026-01-01'),
          ('success','t1','s1','scheduled','completed','2026-01-01','2026-01-01'),
          ('fresh','t1','s1','scheduled','failed',now(),now());
          insert into raw_snapshots(id,source_run_id,theme_id,source_id,payload_json) values ('snapshot','child','t1','s1','[]');""")


def test_preview_does_not_write_or_remove_history(queue_db, tmp_path):
    seed(queue_db)
    result = archive_failed_runs(queue_db, days=90, limit=500, backup_dir=tmp_path)
    assert result["eligible"] == 1
    assert result["deleted"] == 0
    assert list(tmp_path.iterdir()) == []
    with queue_db.connect() as c:
        assert c.exec_driver_sql("select count(*) from source_runs where id='empty'").scalar_one() == 1


def test_apply_backs_up_only_empty_failed_runs_and_restore_is_idempotent(queue_db, tmp_path):
    seed(queue_db)
    result = archive_failed_runs(queue_db, days=90, limit=500, backup_dir=tmp_path, apply=True)
    assert result["deleted"] == 1
    archive = Path(result["archive"])
    assert archive.exists()
    assert restore_archive(queue_db, archive)["restored"] == 0
    assert restore_archive(queue_db, archive, apply=True)["restored"] == 1
    assert restore_archive(queue_db, archive, apply=True)["restored"] == 0
    with queue_db.connect() as c:
        assert c.exec_driver_sql("select count(*) from source_runs where id in ('empty','child','success','fresh')").scalar_one() == 4
        assert c.exec_driver_sql("select count(*) from raw_snapshots").scalar_one() == 1


def test_unknown_foreign_keys_are_respected(queue_db, tmp_path):
    seed(queue_db)
    with queue_db.begin() as c:
        c.exec_driver_sql("create table extra_reference(id text primary key, run_id text references source_runs(id) on delete cascade); insert into extra_reference values('ref','empty');")
    assert archive_failed_runs(queue_db, backup_dir=tmp_path, apply=True)["deleted"] == 0


def test_corrupt_archive_is_rejected_before_restore(queue_db, tmp_path):
    seed(queue_db)
    result = archive_failed_runs(queue_db, backup_dir=tmp_path, apply=True)
    path = Path(result["archive"])
    path.write_text(path.read_text().replace('"status":"failed"', '"status":"completed"'))
    with pytest.raises(ValueError, match="checksum"):
        restore_archive(queue_db, path, apply=True)


def test_failed_delete_rolls_back_but_keeps_the_backup(queue_db, tmp_path):
    seed(queue_db)
    def fail_delete(conn, cursor, statement, params, context, many):
        if statement.lstrip().lower().startswith("delete from"):
            raise RuntimeError("injected database failure")
    event.listen(queue_db, "before_cursor_execute", fail_delete)
    try:
        with pytest.raises(RuntimeError, match="injected"):
            archive_failed_runs(queue_db, backup_dir=tmp_path, apply=True)
    finally:
        event.remove(queue_db, "before_cursor_execute", fail_delete)
    assert len(list(tmp_path.glob("*.jsonl"))) == 1
    with queue_db.connect() as c:
        assert c.exec_driver_sql("select count(*) from source_runs where id='empty'").scalar_one() == 1


def test_parent_lock_prevents_a_concurrent_child_from_being_cascaded(queue_db, tmp_path, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event
    from sqlalchemy.exc import OperationalError
    import info_monitor_worker.maintenance as maintenance
    seed(queue_db)
    locked, release = Event(), Event()
    original = maintenance._write_archive
    def pause_after_lock(*args, **kwargs):
        locked.set()
        release.wait(timeout=5)
        return original(*args, **kwargs)
    monkeypatch.setattr(maintenance, "_write_archive", pause_after_lock)
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(archive_failed_runs, queue_db, backup_dir=tmp_path, apply=True)
        try:
            assert locked.wait(2)
            with pytest.raises(OperationalError, match="lock timeout"):
                with queue_db.begin() as c:
                    c.exec_driver_sql("set local lock_timeout='200ms'")
                    c.exec_driver_sql("insert into raw_snapshots(id,source_run_id,theme_id,source_id) values ('concurrent','empty','t1','s1')")
        finally:
            release.set()
        assert future.result(timeout=5)["deleted"] == 1
    with queue_db.connect() as c:
        assert c.exec_driver_sql("select count(*) from raw_snapshots where id='snapshot'").scalar_one() == 1


def test_restore_refuses_to_overwrite_a_conflicting_run(queue_db, tmp_path):
    seed(queue_db)
    result = archive_failed_runs(queue_db, backup_dir=tmp_path, apply=True)
    with queue_db.begin() as c:
        c.exec_driver_sql("insert into source_runs(id,theme_id,source_id,trigger_type,status,error_message) values ('empty','t1','s1','manual','failed','keep this value')")
    with pytest.raises(ValueError, match="Conflicting"):
        restore_archive(queue_db, result["archive"], apply=True)
    with queue_db.connect() as c:
        assert c.exec_driver_sql("select error_message from source_runs where id='empty'").scalar_one() == "keep this value"


def test_container_apply_rejects_backup_outside_persistent_volume(monkeypatch, tmp_path):
    import info_monitor_worker.maintenance as maintenance
    monkeypatch.setenv("INFO_MONITOR_ARCHIVE_ROOT", str(tmp_path / "archive"))
    monkeypatch.setattr("sys.argv", ["archive", "--apply", "--backup-dir", str(tmp_path / "ephemeral")])
    monkeypatch.setattr(maintenance, "create_db_engine", lambda: pytest.fail("must validate before connecting"))
    with pytest.raises(SystemExit) as error:
        maintenance.main()
    assert error.value.code == 2
