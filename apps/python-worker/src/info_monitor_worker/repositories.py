from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection


def claim_pending_runs(
    connection: Connection, limit: int = 5, lease_seconds: int = 600, max_run_seconds: int = 1800,
    exclude_run_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    # Source locks serialize claimers. The following statement gets a fresh
    # READ COMMITTED snapshot after locking, so a newly committed running task
    # cannot be missed by a concurrent claimer.
    sources = connection.execute(text("""
        select s.id from sources s
        where exists (select 1 from source_runs r where r.source_id=s.id and r.status='pending' and r.id <> all(cast(:excluded as text[])))
          and not exists (select 1 from source_runs r where r.source_id=s.id and r.status='running')
        order by (select min(r.created_at) from source_runs r where r.source_id=s.id and r.status='pending'), s.id
        limit :limit for update of s skip locked
    """), {"limit": limit, "excluded": exclude_run_ids or []}).scalars().all()
    claimed = []
    for source_id in sources:
        row = connection.execute(text("""
            with candidate as (
                select r.id from source_runs r
                where r.source_id=:source_id and r.status='pending' and r.id <> all(cast(:excluded as text[]))
                  and not exists (select 1 from source_runs active where active.source_id=:source_id and active.status='running')
                order by r.created_at, r.id limit 1 for update of r skip locked
            ), claimed as (
                update source_runs r set status='running', started_at=now(), finished_at=null,
                  error_message=null, claim_token=:token, attempt_count=attempt_count+1,
                  lease_expires_at=now()+make_interval(secs => :lease)
                from candidate where r.id=candidate.id returning r.*
            )
            select r.id as run_id, r.theme_id, r.source_id, r.trigger_type, r.replay_snapshot_id,
              r.claim_token, r.attempt_count, t.name as theme_name, t.info_type,
              s.name as source_name, s.source_type, s.adapter_key, s.config as source_config
            from claimed r join themes t on t.id=r.theme_id join sources s on s.id=r.source_id
        """), {"source_id": source_id, "token": uuid4().hex,
               "lease": min(lease_seconds, max_run_seconds), "excluded": exclude_run_ids or []}).first()
        if row:
            claimed.append(dict(row._mapping))
    return claimed


def verify_run_claim(connection: Connection, run_id: str, token: str) -> bool:
    return connection.execute(text("""
        select id from source_runs where id=:id and status='running'
          and claim_token=:token and lease_expires_at>now() for update
    """), {"id": run_id, "token": token}).first() is not None


def renew_run_leases(
    connection: Connection, claims: Dict[str, str], lease_seconds: int = 600,
    max_run_seconds: int = 1800,
) -> int:
    renewed = 0
    for run_id, token in claims.items():
        result = connection.execute(text("""
            with active as (
                select id from source_runs where id=:id and claim_token=:token and status='running'
                  and lease_expires_at>now() and started_at+make_interval(secs => :maximum)>now()
                for update skip locked
            )
            update source_runs r set lease_expires_at=least(
                now()+make_interval(secs => :lease), r.started_at+make_interval(secs => :maximum))
            from active where r.id=active.id
        """), {"id": run_id, "token": token, "lease": lease_seconds, "maximum": max_run_seconds})
        renewed += result.rowcount
    return renewed


def recover_expired_runs(connection: Connection, lease_seconds: int = 600, max_attempts: int = 3) -> int:
    rows = connection.execute(text("""
        with expired as (
            select id from source_runs where status='running'
              and coalesce(lease_expires_at, coalesce(started_at,created_at)+make_interval(secs => :lease))<=now()
            order by created_at limit 100 for update skip locked
        )
        update source_runs r set
          status=case when attempt_count>=:maximum then 'failed' else 'pending' end,
          claim_token=null, lease_expires_at=null,
          finished_at=case when attempt_count>=:maximum then now() else null end,
          error_message='Worker lease expired; recovery attempt limit applies'
        from expired where r.id=expired.id
        returning r.id, r.source_id, r.trigger_type, r.status
    """), {"lease": lease_seconds, "maximum": max_attempts}).all()
    for row in rows:
        if row.status == "failed":
            mark_run_failed(connection, row.id, row.source_id,
                            "Worker lease expired; maximum recovery attempts reached",
                            is_test=row.trigger_type == "test")
    return len(rows)


def mark_run_completed(connection: Connection, run_id: str, source_id: str, is_test: bool = False) -> None:
    connection.execute(
        text(
            """
            update source_runs
            set status = 'completed',
                claim_token = null, lease_expires_at = null,
                finished_at = now(),
                error_message = null
            where id = :run_id
            """
        ),
        {"run_id": run_id},
    )
    # Test runs should not update source-level health metrics
    if not is_test:
        connection.execute(
            text(
                """
                update sources
                set latest_success_at = now(),
                    status = case when is_paused then status else 'healthy' end,
                    updated_at = now()
                where id = :source_id
                """
            ),
            {"source_id": source_id},
        )


def mark_run_failed(connection: Connection, run_id: str, source_id: str, error_message: str, is_test: bool = False) -> None:
    connection.execute(
        text(
            """
            update source_runs
            set status = 'failed',
                claim_token = null, lease_expires_at = null,
                finished_at = now(),
                error_message = :error_message
            where id = :run_id
            """
        ),
        {"run_id": run_id, "error_message": error_message[:1000]},
    )
    # Test runs should not update source-level health metrics
    if not is_test:
        connection.execute(
            text(
                """
                update sources
                set latest_failure_at = now(),
                    status = 'warning',
                    updated_at = now()
                where id = :source_id
                """
            ),
            {"source_id": source_id},
        )


def fetch_snapshot_payload(
    connection: Connection,
    snapshot_id: str,
) -> Optional[Dict[str, Any]]:
    """Fetch a stored raw snapshot payload by ID for replay."""
    row = connection.execute(
        text(
            """
            select
              id,
              source_run_id,
              theme_id,
              source_id,
              payload_json
            from raw_snapshots
            where id = :snapshot_id
            """
        ),
        {"snapshot_id": snapshot_id},
    ).first()

    return dict(row._mapping) if row else None


def insert_raw_snapshot(
    connection: Connection,
    snapshot_id: str,
    run_id: str,
    theme_id: str,
    source_id: str,
    payload_json: str,
) -> None:
    connection.execute(
        text(
            """
            insert into raw_snapshots (
              id,
              source_run_id,
              theme_id,
              source_id,
              payload_json
            ) values (
              :id,
              :run_id,
              :theme_id,
              :source_id,
              cast(:payload_json as jsonb)
            )
            """
        ),
        {
            "id": snapshot_id,
            "run_id": run_id,
            "theme_id": theme_id,
            "source_id": source_id,
            "payload_json": payload_json,
        },
    )


def insert_normalized_record(
    connection: Connection,
    record_id: str,
    run_id: str,
    theme_id: str,
    source_id: str,
    info_type: str,
    occurred_at: str,
    title: str,
    logical_key: Optional[str],
    fingerprint: str,
    content_json: str,
) -> None:
    connection.execute(
        text(
            """
            insert into normalized_records (
              id,
              source_run_id,
              theme_id,
              source_id,
              info_type,
              occurred_at,
              title,
              logical_key,
              fingerprint,
              content
            ) values (
              :id,
              :run_id,
              :theme_id,
              :source_id,
              :info_type,
              :occurred_at,
              :title,
              :logical_key,
              :fingerprint,
              cast(:content_json as jsonb)
            )
            """
        ),
        {
            "id": record_id,
            "run_id": run_id,
            "theme_id": theme_id,
            "source_id": source_id,
            "info_type": info_type,
            "occurred_at": occurred_at,
            "title": title,
            "logical_key": logical_key,
            "fingerprint": fingerprint,
            "content_json": content_json,
        },
    )


def find_normalized_record_by_logical_key(
    connection: Connection,
    theme_id: str,
    source_id: str,
    logical_key: str,
) -> Optional[Dict[str, Any]]:
    row = connection.execute(
        text(
            """
            select
              id,
              occurred_at,
              title,
              fingerprint,
              content
            from normalized_records
            where theme_id = :theme_id
              and source_id = :source_id
              and logical_key = :logical_key
            order by created_at desc
            limit 1
            """
        ),
        {
            "theme_id": theme_id,
            "source_id": source_id,
            "logical_key": logical_key,
        },
    ).first()

    return dict(row._mapping) if row else None


def find_normalized_record_by_fingerprint(
    connection: Connection,
    theme_id: str,
    source_id: str,
    fingerprint: str,
) -> Optional[Dict[str, Any]]:
    row = connection.execute(
        text(
            """
            select
              id,
              occurred_at,
              title,
              fingerprint,
              content
            from normalized_records
            where theme_id = :theme_id
              and source_id = :source_id
              and fingerprint = :fingerprint
            limit 1
            """
        ),
        {
            "theme_id": theme_id,
            "source_id": source_id,
            "fingerprint": fingerprint,
        },
    ).first()

    return dict(row._mapping) if row else None


def update_normalized_record(
    connection: Connection,
    record_id: str,
    run_id: str,
    occurred_at: str,
    title: str,
    fingerprint: str,
    content_json: str,
) -> None:
    connection.execute(
        text(
            """
            update normalized_records
            set
              source_run_id = :run_id,
              occurred_at = :occurred_at,
              title = :title,
              fingerprint = :fingerprint,
              content = cast(:content_json as jsonb)
            where id = :record_id
            """
        ),
        {
            "record_id": record_id,
            "run_id": run_id,
            "occurred_at": occurred_at,
            "title": title,
            "fingerprint": fingerprint,
            "content_json": content_json,
        },
    )


def find_change_by_identity(
    connection: Connection,
    theme_id: str,
    source_id: str,
    normalized_record_id: str,
    change_type: str,
    summary: str,
) -> Optional[Dict[str, Any]]:
    row = connection.execute(
        text(
            """
            select id, change_key
            from changes
            where theme_id = :theme_id
              and source_id = :source_id
              and normalized_record_id = :normalized_record_id
              and change_type = :change_type
              and summary = :summary
            order by detected_at desc
            limit 1
            """
        ),
        {
            "theme_id": theme_id,
            "source_id": source_id,
            "normalized_record_id": normalized_record_id,
            "change_type": change_type,
            "summary": summary,
        },
    ).first()

    return dict(row._mapping) if row else None


def insert_change(
    connection: Connection,
    change_id: str,
    run_id: str,
    theme_id: str,
    source_id: str,
    normalized_record_id: str,
    change_key: str,
    change_type: str,
    summary: str,
    details_json: str,
) -> str:
    existing_row = find_change_by_identity(
        connection=connection,
        theme_id=theme_id,
        source_id=source_id,
        normalized_record_id=normalized_record_id,
        change_type=change_type,
        summary=summary,
    )

    if existing_row:
        connection.execute(
            text(
                """
                update changes
                set
                  source_run_id = :run_id,
                  change_key = :change_key,
                  details = cast(:details_json as jsonb)
                where id = :id
                """
            ),
            {
                "id": existing_row["id"],
                "run_id": run_id,
                "change_key": change_key,
                "details_json": details_json,
            },
        )
        return existing_row["id"]

    result = connection.execute(
        text(
            """
            insert into changes (
              id,
              source_run_id,
              theme_id,
              source_id,
              normalized_record_id,
              change_key,
              change_type,
              summary,
              details
            ) values (
              :id,
              :run_id,
              :theme_id,
              :source_id,
              :normalized_record_id,
              :change_key,
              :change_type,
              :summary,
              cast(:details_json as jsonb)
            )
            on conflict (change_key) do update
            set
              source_run_id = excluded.source_run_id,
              normalized_record_id = excluded.normalized_record_id,
              summary = excluded.summary,
              details = excluded.details
            returning id
            """
        ),
        {
            "id": change_id,
            "run_id": run_id,
            "theme_id": theme_id,
            "source_id": source_id,
            "normalized_record_id": normalized_record_id,
            "change_key": change_key,
            "change_type": change_type,
            "summary": summary,
            "details_json": details_json,
        },
    ).first()

    if result:
        return result._mapping["id"]

    existing_row = connection.execute(
        text(
            """
            select id
            from changes
            where change_key = :change_key
            limit 1
            """
        ),
        {"change_key": change_key},
    ).one()

    return existing_row._mapping["id"]


def find_event_by_identity(
    connection: Connection,
    theme_id: str,
    source_id: str,
    event_type: str,
    title: str,
    occurred_at: str,
) -> Optional[Dict[str, Any]]:
    row = connection.execute(
        text(
            """
            select id, event_key
            from events
            where theme_id = :theme_id
              and source_id = :source_id
              and event_type = :event_type
              and title = :title
              and occurred_at = :occurred_at
            order by created_at desc
            limit 1
            """
        ),
        {
            "theme_id": theme_id,
            "source_id": source_id,
            "event_type": event_type,
            "title": title,
            "occurred_at": occurred_at,
        },
    ).first()

    return dict(row._mapping) if row else None


def insert_event(
    connection: Connection,
    event_id: str,
    run_id: str,
    theme_id: str,
    source_id: str,
    change_id: str,
    event_key: str,
    event_type: str,
    signal: str,
    title: str,
    summary: str,
    occurred_at: str,
    evidence_json: str,
) -> str:
    existing_row = find_event_by_identity(
        connection=connection,
        theme_id=theme_id,
        source_id=source_id,
        event_type=event_type,
        title=title,
        occurred_at=occurred_at,
    )

    if existing_row:
        connection.execute(
            text(
                """
                update events
                set
                  source_run_id = :run_id,
                  change_id = :change_id,
                  event_key = :event_key,
                  signal = :signal,
                  summary = :summary,
                  evidence = cast(:evidence_json as jsonb)
                where id = :id
                """
            ),
            {
                "id": existing_row["id"],
                "run_id": run_id,
                "change_id": change_id,
                "event_key": event_key,
                "signal": signal,
                "summary": summary,
                "evidence_json": evidence_json,
            },
        )
        return existing_row["id"]

    result = connection.execute(
        text(
            """
            insert into events (
              id,
              source_run_id,
              theme_id,
              source_id,
              change_id,
              event_key,
              event_type,
              signal,
              title,
              summary,
              evidence,
              occurred_at
            ) values (
              :id,
              :run_id,
              :theme_id,
              :source_id,
              :change_id,
              :event_key,
              :event_type,
              :signal,
              :title,
              :summary,
              cast(:evidence_json as jsonb),
              :occurred_at
            )
            on conflict (event_key) do update
            set
              source_run_id = excluded.source_run_id,
              change_id = excluded.change_id,
              signal = excluded.signal,
              title = excluded.title,
              summary = excluded.summary,
              evidence = excluded.evidence,
              occurred_at = excluded.occurred_at
            returning id
            """
        ),
        {
          "id": event_id,
          "run_id": run_id,
          "theme_id": theme_id,
          "source_id": source_id,
          "change_id": change_id,
          "event_key": event_key,
          "event_type": event_type,
          "signal": signal,
          "title": title,
          "summary": summary,
          "evidence_json": evidence_json,
          "occurred_at": occurred_at,
        },
    ).first()

    if result:
        return result._mapping["id"]

    existing_row = connection.execute(
        text(
            """
            select id
            from events
            where event_key = :event_key
            limit 1
            """
        ),
        {"event_key": event_key},
    ).one()

    return existing_row._mapping["id"]


def find_notification_by_event_and_channel(
    connection: Connection,
    event_id: str,
    channel: str,
) -> Optional[Dict[str, Any]]:
    row = connection.execute(
        text(
            """
            select id
            from notifications
            where event_id = :event_id
              and channel = :channel
            order by created_at desc
            limit 1
            """
        ),
        {
            "event_id": event_id,
            "channel": channel,
        },
    ).first()

    return dict(row._mapping) if row else None


def insert_notification(
    connection: Connection,
    notification_id: str,
    event_id: str,
    channel: str,
    status: str,
    payload_json: str,
) -> str:
    existing_row = find_notification_by_event_and_channel(
        connection=connection,
        event_id=event_id,
        channel=channel,
    )

    if existing_row:
        # Update existing notification: reset status to pending and update payload
        # This ensures re-notification when event content changes
        # Also reset retry tracking so stale retry state doesn't carry over
        connection.execute(
            text(
                """
                update notifications
                set
                  payload = cast(:payload_json as jsonb),
                  status = 'pending',
                  sent_at = null,
                  retry_count = 0,
                  last_retry_at = null,
                  next_retry_at = null
                where id = :id
                """
            ),
            {
                "id": existing_row["id"],
                "payload_json": payload_json,
            },
        )
        return existing_row["id"]

    result = connection.execute(
        text(
            """
            insert into notifications (
              id,
              event_id,
              channel,
              status,
              payload
            ) values (
              :id,
              :event_id,
              :channel,
              :status,
              cast(:payload_json as jsonb)
            )
            returning id
            """
        ),
        {
            "id": notification_id,
            "event_id": event_id,
            "channel": channel,
            "status": status,
            "payload_json": payload_json,
        },
    ).first()

    return result._mapping["id"] if result else notification_id


def find_min_price_in_last_30_days(
    connection: Connection,
    theme_id: str,
    spec: Optional[str],
    occurred_at: str,
) -> Optional[float]:
    if spec is None:
        row = connection.execute(
            text(
                """
                select min((content ->> 'price')::numeric) as min_price
                from normalized_records
                where theme_id = :theme_id
                  and info_type = 'price'
                  and occurred_at >= cast(:occurred_at as timestamptz) - interval '30 days'
                  and occurred_at < cast(:occurred_at as timestamptz)
                """
            ),
            {"theme_id": theme_id, "occurred_at": occurred_at},
        ).one()
    else:
        row = connection.execute(
            text(
                """
                select min((content ->> 'price')::numeric) as min_price
                from normalized_records
                where theme_id = :theme_id
                  and info_type = 'price'
                  and content ->> 'spec' = :spec
                  and occurred_at >= cast(:occurred_at as timestamptz) - interval '30 days'
                  and occurred_at < cast(:occurred_at as timestamptz)
                """
            ),
            {"theme_id": theme_id, "spec": spec, "occurred_at": occurred_at},
        ).one()

    min_price = row._mapping["min_price"]
    return float(min_price) if min_price is not None else None
