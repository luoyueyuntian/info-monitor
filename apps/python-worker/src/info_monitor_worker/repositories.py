from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.engine import Connection


def fetch_pending_runs(connection: Connection, limit: int = 5) -> List[Dict[str, Any]]:
    rows = connection.execute(
        text(
            """
            select
              sr.id as run_id,
              sr.theme_id as theme_id,
              sr.source_id as source_id,
              sr.trigger_type as trigger_type,
              t.name as theme_name,
              t.info_type as info_type,
              s.name as source_name,
              s.source_type as source_type,
              s.adapter_key as adapter_key,
              s.config as source_config
            from source_runs sr
            inner join themes t on t.id = sr.theme_id
            inner join sources s on s.id = sr.source_id
            where sr.status = 'pending'
            order by sr.created_at asc
            limit :limit
            """
        ),
        {"limit": limit},
    )
    return [dict(row._mapping) for row in rows]


def mark_run_running(connection: Connection, run_id: str) -> None:
    connection.execute(
        text(
            """
            update source_runs
            set status = 'running',
                started_at = now()
            where id = :run_id
            """
        ),
        {"run_id": run_id},
    )


def mark_run_completed(connection: Connection, run_id: str, source_id: str) -> None:
    connection.execute(
        text(
            """
            update source_runs
            set status = 'completed',
                finished_at = now(),
                error_message = null
            where id = :run_id
            """
        ),
        {"run_id": run_id},
    )
    connection.execute(
        text(
            """
            update sources
            set latest_success_at = now(),
                updated_at = now()
            where id = :source_id
            """
        ),
        {"source_id": source_id},
    )


def mark_run_failed(connection: Connection, run_id: str, source_id: str, error_message: str) -> None:
    connection.execute(
        text(
            """
            update source_runs
            set status = 'failed',
                finished_at = now(),
                error_message = :error_message
            where id = :run_id
            """
        ),
        {"run_id": run_id, "error_message": error_message[:1000]},
    )
    connection.execute(
        text(
            """
            update sources
            set latest_failure_at = now(),
                updated_at = now()
            where id = :source_id
            """
        ),
        {"source_id": source_id},
    )


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
