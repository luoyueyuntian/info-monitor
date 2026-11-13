"""Preview or reversibly archive old failed runs with no dependent records."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile
from uuid import uuid4

from sqlalchemy import text
from info_monitor_worker.db import create_db_engine


def _layout(connection):
    row = connection.execute(text("""select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid='source_runs'::regclass""")).one()
    quote = connection.dialect.identifier_preparer.quote
    target = f"{quote(row.nspname)}.{quote(row.relname)}"
    refs = connection.execute(text("""
        select n.nspname, t.relname, a.attname, p.attname as parent_column,
          array_length(f.conkey,1) as key_count
        from pg_constraint f join pg_class t on t.oid=f.conrelid
        join pg_namespace n on n.oid=t.relnamespace
        join pg_attribute a on a.attrelid=f.conrelid and a.attnum=f.conkey[1]
        join pg_attribute p on p.attrelid=f.confrelid and p.attnum=f.confkey[1]
        where f.contype='f' and f.confrelid='source_runs'::regclass
    """)).all()
    guards = []
    for ref in refs:
        if ref.key_count != 1 or ref.parent_column != "id":
            raise ValueError("Unsupported foreign key; archive requires manual schema review")
        guards.append(f"not exists (select 1 from {quote(ref.nspname)}.{quote(ref.relname)} child where child.{quote(ref.attname)}=r.id)")
    return target, quote, " and ".join(guards) or "true"


def _write_archive(directory: Path, rows, database: str):
    directory.mkdir(parents=True, exist_ok=True)
    payload = "".join(json.dumps(dict(row), default=lambda value: value.isoformat(), ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows)
    checksum = hashlib.sha256(payload.encode()).hexdigest()
    header = {"format": "info-monitor-empty-failed-runs-v1", "database": database, "rows": len(rows), "sha256": checksum}
    destination = directory / (datetime.now(timezone.utc).strftime("failed-runs-%Y%m%dT%H%M%SZ-") + uuid4().hex + ".jsonl")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory, prefix=".archive-", delete=False) as stream:
            temporary = Path(stream.name)
            os.chmod(temporary, 0o600)
            stream.write(json.dumps(header, separators=(",", ":")) + "\n" + payload)
            stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, destination)
        descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
        try: os.fsync(descriptor)
        finally: os.close(descriptor)
    finally:
        if temporary and temporary.exists(): temporary.unlink()
    return destination, checksum


def archive_failed_runs(engine, *, days=90, limit=500, backup_dir=None, apply=False):
    if not 7 <= days <= 3650 or not 1 <= limit <= 1000:
        raise ValueError("days must be 7–3650 and batch size 1–1000")
    if apply and backup_dir is None:
        raise ValueError("An explicit persistent backup directory is required for apply")
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with engine.begin() as connection:
        connection.exec_driver_sql("set transaction isolation level read committed")
        connection.exec_driver_sql("set local lock_timeout='2s'; set local statement_timeout='30s'")
        target, _, guards = _layout(connection)
        condition = f"r.status='failed' and r.created_at<:cutoff and r.finished_at<:cutoff and {guards}"
        eligible = connection.execute(text(f"select count(*) from {target} r where {condition}"), {"cutoff": cutoff}).scalar_one()
        result = {"mode": "apply" if apply else "preview", "eligible": eligible, "batch_limit": limit, "deleted": 0, "archive": None}
        if not apply or not eligible: return result
        rows = connection.execute(text(f"select r.* from {target} r where {condition} order by r.finished_at,r.id limit :limit for update of r skip locked"), {"cutoff": cutoff, "limit": limit}).mappings().all()
        if not rows: return result
        database = connection.exec_driver_sql("select current_database()").scalar_one()
        archive, checksum = _write_archive(Path(backup_dir), rows, database)
        # A fresh statement rechecks child references after the parent locks were
        # obtained, preventing a stale initial snapshot from causing cascades.
        removed = connection.execute(text(f"delete from {target} r where r.id=any(:ids) and {condition} returning r.id"),
                                     {"ids": [row["id"] for row in rows], "cutoff": cutoff}).all()
        if len(removed) != len(rows):
            raise RuntimeError("References changed; deletion rolled back and backup retained")
        result.update(deleted=len(removed), archive=str(archive), sha256=checksum)
    return result


def restore_archive(engine, path, *, apply=False):
    path = Path(path)
    if path.stat().st_size > 16 * 1024 * 1024: raise ValueError("Archive exceeds size limit")
    header_line, payload = path.read_text(encoding="utf-8").split("\n", 1)
    header = json.loads(header_line)
    if header.get("format") != "info-monitor-empty-failed-runs-v1" or hashlib.sha256(payload.encode()).hexdigest() != header.get("sha256"):
        raise ValueError("Archive format or checksum is invalid")
    rows = [json.loads(line) for line in payload.splitlines() if line]
    if len(rows) != header.get("rows") or len(rows) > 1000 or len({row["id"] for row in rows}) != len(rows):
        raise ValueError("Invalid archive row count")
    result = {"mode": "restore" if apply else "restore-preview", "rows": len(rows), "restored": 0}
    if not apply: return result
    with engine.begin() as connection:
        connection.exec_driver_sql("set local lock_timeout='2s'; set local statement_timeout='30s'")
        target, quote, _ = _layout(connection)
        columns = set(connection.execute(text("select attname from pg_attribute where attrelid='source_runs'::regclass and attnum>0 and not attisdropped")).scalars())
        for row in rows:
            if row.get("status") != "failed" or not set(row).issubset(columns): raise ValueError("Archive columns or status are incompatible")
            names = list(row); selected = ",".join(quote(name) for name in names)
            before = ",".join("old." + quote(name) for name in names)
            after = ",".join("restored." + quote(name) for name in names)
            params = {"payload": json.dumps(row), "id": row["id"]}
            compare = text(f"select row({before}) is not distinct from row({after}) from {target} old cross join jsonb_populate_record(null::{target},cast(:payload as jsonb)) restored where old.id=:id for update of old")
            existing = connection.execute(compare, params).scalar_one_or_none()
            if existing is False: raise ValueError("Conflicting existing run; restore rolled back")
            if existing is True: continue
            inserted = connection.execute(text(f"insert into {target} ({selected}) select {selected} from jsonb_populate_record(null::{target},cast(:payload as jsonb)) on conflict(id) do nothing returning id"), params).scalar_one_or_none()
            if inserted is None and connection.execute(compare, params).scalar_one_or_none() is not True:
                raise ValueError("Conflicting concurrent restore")
            result["restored"] += inserted is not None
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--backup-dir")
    parser.add_argument("--restore")
    parser.add_argument("--apply", action="store_true", help="explicitly apply one bounded archive/restore batch")
    args = parser.parse_args()
    archive_root = os.getenv("INFO_MONITOR_ARCHIVE_ROOT")
    if args.apply and not args.restore and archive_root:
        root = Path(archive_root).resolve()
        directory = Path(args.backup_dir).resolve() if args.backup_dir else None
        if directory is None or (directory != root and root not in directory.parents):
            parser.error("backup-dir must be inside the configured persistent archive volume")
    engine = create_db_engine()
    try:
        result = restore_archive(engine, args.restore, apply=args.apply) if args.restore else archive_failed_runs(engine, days=args.days, limit=args.batch_size, backup_dir=args.backup_dir, apply=args.apply)
        print(json.dumps(result, ensure_ascii=False))
    finally: engine.dispose()


if __name__ == "__main__": main()
