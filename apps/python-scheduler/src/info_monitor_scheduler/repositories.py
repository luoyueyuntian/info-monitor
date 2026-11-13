from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.engine import Connection


def fetch_schedulable_sources(connection: Connection) -> List[Dict[str, Any]]:
    rows = connection.execute(
        text(
            """
            select
              s.id as source_id,
              s.theme_id as theme_id,
              s.config as config,
              s.adapter_key as adapter_key,
              s.is_paused as is_paused,
              s.latest_success_at as latest_success_at,
              s.latest_failure_at as latest_failure_at
            from sources s
            where s.is_paused = false
            order by s.created_at asc
            """
        )
    )
    return [dict(row._mapping) for row in rows]


def has_open_run(connection: Connection, source_id: str) -> bool:
    row = connection.execute(
        text(
            """
            select 1
            from source_runs
            where source_id = :source_id
              and status in ('pending', 'running')
            limit 1
            """
        ),
        {"source_id": source_id},
    ).first()
    return row is not None


def enqueue_run(connection: Connection, run_id: str, theme_id: str, source_id: str) -> None:
    connection.execute(
        text(
            """
            insert into source_runs (
              id,
              theme_id,
              source_id,
              trigger_type,
              status
            ) values (
              :id,
              :theme_id,
              :source_id,
              'scheduled',
              'pending'
            )
            """
        ),
        {"id": run_id, "theme_id": theme_id, "source_id": source_id},
    )
