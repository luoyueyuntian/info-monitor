from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from info_monitor_worker.adapters.registry import get_adapter
from info_monitor_worker.db import create_db_engine
from info_monitor_worker.detectors import get_detector
from info_monitor_worker.event_rules.financial_direction import FinancialDirectionRule
from info_monitor_worker.event_rules.price_30d_low import ThirtyDayLowRule
from info_monitor_worker.models import SourceContext, ThemeContext
from info_monitor_worker.normalizers.registry import get_normalizer
from info_monitor_worker.repositories import (
    fetch_pending_runs,
    find_min_price_in_last_30_days,
    find_normalized_record_by_fingerprint,
    find_normalized_record_by_logical_key,
    insert_change,
    insert_event,
    insert_normalized_record,
    insert_notification,
    insert_raw_snapshot,
    mark_run_completed,
    mark_run_failed,
    mark_run_running,
    update_normalized_record,
)
from info_monitor_worker.utils import create_id, fingerprint_for_value, to_json


class WorkerService:
    def __init__(self) -> None:
        self.engine = create_db_engine()
        self.price_low_rule = ThirtyDayLowRule()
        self.financial_direction_rule = FinancialDirectionRule()

    def run_once(self) -> int:
        processed = 0

        with self.engine.begin() as connection:
            pending_runs = fetch_pending_runs(connection)

        for run in pending_runs:
            self._process_run(run)
            processed += 1

        return processed

    def _should_check_latest_only(
        self,
        normalized_record,
        latest_occurred_at: datetime | None,
    ) -> bool:
        if latest_occurred_at is None:
            return True

        record_occurred_at = datetime.fromisoformat(normalized_record.occurred_at.replace("Z", "+00:00"))
        return record_occurred_at == latest_occurred_at

    def _create_notification(
        self,
        connection,
        *,
        event_id: str,
        event_title: str,
        event_summary: str,
        signal: str,
    ) -> None:
        insert_notification(
            connection=connection,
            notification_id=create_id("notification"),
            event_id=event_id,
            channel="in_app",
            status="pending",
            payload_json=to_json(
                {
                    "title": event_title,
                    "summary": event_summary,
                    "signal": signal,
                }
            ),
        )

    def _emit_event_with_notification(
        self,
        connection,
        *,
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
        evidence: list[str],
    ) -> None:
        event_id = insert_event(
            connection=connection,
            event_id=create_id("event"),
            run_id=run_id,
            theme_id=theme_id,
            source_id=source_id,
            change_id=change_id,
            event_key=event_key,
            event_type=event_type,
            signal=signal,
            title=title,
            summary=summary,
            occurred_at=occurred_at,
            evidence_json=to_json(evidence),
        )
        self._create_notification(
            connection=connection,
            event_id=event_id,
            event_title=title,
            event_summary=summary,
            signal=signal,
        )

    def _emit_new_release_event(
        self,
        connection,
        *,
        run_id: str,
        theme: ThemeContext,
        source: SourceContext,
        change_id: str,
        normalized_record,
        event_key: str,
        signal: str,
    ) -> None:
        direction_label = normalized_record.content.get("direction_label")
        direction_reason = normalized_record.content.get("direction_reason")
        summary = f"Detected a new official release for theme {theme.theme_name}."

        if direction_label and direction_label != "neutral":
            summary = (
                f"Detected a new official release for theme {theme.theme_name}. "
                f"Preliminary direction: {direction_label}."
            )

        self._emit_event_with_notification(
            connection=connection,
            run_id=run_id,
            theme_id=theme.theme_id,
            source_id=source.source_id,
            change_id=change_id,
            event_key=event_key,
            event_type="new_release",
            signal=signal,
            title=normalized_record.title,
            summary=summary,
            occurred_at=normalized_record.occurred_at,
            evidence=[
                f"Title: {normalized_record.title}",
                f"Publisher: {normalized_record.content.get('publisher', source.source_name)}",
                f"URL: {normalized_record.source_url or normalized_record.content.get('url', '')}",
                (
                    f"Direction: {direction_label} ({direction_reason})"
                    if direction_label
                    else "Direction: unavailable"
                ),
            ],
        )

    def _evaluate_events(
        self,
        connection,
        *,
        theme: ThemeContext,
        source: SourceContext,
        run_id: str,
        change_id: str,
        normalized_record,
        record_identity: str,
        latest_occurred_at: datetime | None,
    ) -> None:
        """Evaluate event rules for a normalized record based on its info_type."""
        info_type = theme.info_type

        if info_type == "price":
            if not self._should_check_latest_only(normalized_record, latest_occurred_at):
                return

            historical_min = find_min_price_in_last_30_days(
                connection=connection,
                theme_id=theme.theme_id,
                spec=normalized_record.content.get("spec"),
                occurred_at=normalized_record.occurred_at,
            )
            rule_result = self.price_low_rule.evaluate(normalized_record, historical_min)

            if rule_result.triggered:
                event_key = (
                    f"{theme.theme_id}:{source.source_id}:price_low:"
                    f"{record_identity}:{normalized_record.occurred_at}"
                )
                self._emit_event_with_notification(
                    connection=connection,
                    run_id=run_id,
                    theme_id=theme.theme_id,
                    source_id=source.source_id,
                    change_id=change_id,
                    event_key=event_key,
                    event_type="price_low",
                    signal=rule_result.signal,
                    title=rule_result.title,
                    summary=rule_result.summary,
                    occurred_at=normalized_record.occurred_at,
                    evidence=rule_result.evidence,
                )

        elif info_type == "news_announcement":
            if self._should_check_latest_only(normalized_record, latest_occurred_at):
                event_key = (
                    f"{theme.theme_id}:{source.source_id}:new_announcement:"
                    f"{record_identity}:{normalized_record.occurred_at}"
                )
                self._emit_new_release_event(
                    connection,
                    run_id=run_id,
                    theme=theme,
                    source=source,
                    change_id=change_id,
                    normalized_record=normalized_record,
                    event_key=event_key,
                    signal="new_announcement",
                )

        elif info_type == "content_update":
            if self._should_check_latest_only(normalized_record, latest_occurred_at):
                event_key = (
                    f"{theme.theme_id}:{source.source_id}:content_update:"
                    f"{record_identity}:{normalized_record.occurred_at}"
                )
                self._emit_new_release_event(
                    connection,
                    run_id=run_id,
                    theme=theme,
                    source=source,
                    change_id=change_id,
                    normalized_record=normalized_record,
                    event_key=event_key,
                    signal="content_update",
                )

        elif info_type == "financial_event":
            if self._should_check_latest_only(normalized_record, latest_occurred_at):
                direction_result = self.financial_direction_rule.evaluate(normalized_record)

                if direction_result.triggered:
                    event_key = (
                        f"{theme.theme_id}:{source.source_id}:financial_direction:"
                        f"{record_identity}:{normalized_record.occurred_at}"
                    )
                    self._emit_event_with_notification(
                        connection=connection,
                        run_id=run_id,
                        theme_id=theme.theme_id,
                        source_id=source.source_id,
                        change_id=change_id,
                        event_key=event_key,
                        event_type="financial_direction",
                        signal=direction_result.signal,
                        title=direction_result.title,
                        summary=direction_result.summary,
                        occurred_at=normalized_record.occurred_at,
                        evidence=direction_result.evidence,
                    )
                else:
                    event_key = (
                        f"{theme.theme_id}:{source.source_id}:new_financial_event:"
                        f"{record_identity}:{normalized_record.occurred_at}"
                    )
                    self._emit_new_release_event(
                        connection,
                        run_id=run_id,
                        theme=theme,
                        source=source,
                        change_id=change_id,
                        normalized_record=normalized_record,
                        event_key=event_key,
                        signal="new_financial_event",
                    )

    def _process_run(self, run: Dict[str, Any]) -> None:
        theme = ThemeContext(
            theme_id=run["theme_id"],
            theme_name=run["theme_name"],
            info_type=run["info_type"],
        )
        source = SourceContext(
            source_id=run["source_id"],
            source_name=run["source_name"],
            source_type=run["source_type"],
            adapter_key=run["adapter_key"],
            config=run["source_config"] or {},
        )
        run_id = run["run_id"]

        try:
            with self.engine.begin() as connection:
                mark_run_running(connection, run_id)

                adapter = get_adapter(source.adapter_key)
                raw_result = adapter.fetch(theme, source)
                raw_payload = adapter.map_to_normalizer_input(raw_result)
                insert_raw_snapshot(
                    connection=connection,
                    snapshot_id=create_id("snapshot"),
                    run_id=run_id,
                    theme_id=theme.theme_id,
                    source_id=source.source_id,
                    payload_json=to_json(raw_payload),
                )

                normalizer = get_normalizer(theme.info_type)
                normalized_records = normalizer.normalize(raw_payload)
                latest_occurred_at = None

                if source.config.get("emit_events_on_latest_only") and normalized_records:
                    latest_occurred_at = max(
                        datetime.fromisoformat(record.occurred_at.replace("Z", "+00:00"))
                        for record in normalized_records
                    )

                detector = get_detector(theme.info_type)

                for normalized_record in normalized_records:
                    logical_key = normalized_record.logical_key
                    fingerprint = fingerprint_for_value(
                        {
                            "title": normalized_record.title,
                            "occurred_at": normalized_record.occurred_at,
                            "content": normalized_record.content,
                        }
                    )

                    # Look up existing record
                    existing_record = None
                    if logical_key:
                        existing_record = find_normalized_record_by_logical_key(
                            connection=connection,
                            theme_id=theme.theme_id,
                            source_id=source.source_id,
                            logical_key=logical_key,
                        )

                    if not existing_record:
                        existing_record = find_normalized_record_by_fingerprint(
                            connection=connection,
                            theme_id=theme.theme_id,
                            source_id=source.source_id,
                            fingerprint=fingerprint,
                        )

                    # Use detector to determine change type
                    change_result = detector.detect_change(
                        normalized_record,
                        existing_record,
                        fingerprint=fingerprint,
                    )

                    # Skip unchanged records
                    if change_result.is_unchanged:
                        continue

                    # Persist the normalized record
                    if change_result.is_new:
                        insert_normalized_record(
                            connection=connection,
                            record_id=change_result.record_id,
                            run_id=run_id,
                            theme_id=theme.theme_id,
                            source_id=source.source_id,
                            info_type=theme.info_type,
                            occurred_at=normalized_record.occurred_at,
                            title=normalized_record.title,
                            logical_key=logical_key,
                            fingerprint=fingerprint,
                            content_json=to_json(normalized_record.content),
                        )
                    else:
                        update_normalized_record(
                            connection=connection,
                            record_id=change_result.record_id,
                            run_id=run_id,
                            occurred_at=normalized_record.occurred_at,
                            title=normalized_record.title,
                            fingerprint=fingerprint,
                            content_json=to_json(normalized_record.content),
                        )

                    # Record the change
                    record_identity = logical_key or fingerprint
                    change_key = f"{source.source_id}:{change_result.change_type}:{record_identity}:{fingerprint}"

                    change_id = insert_change(
                        connection=connection,
                        change_id=create_id("change"),
                        run_id=run_id,
                        theme_id=theme.theme_id,
                        source_id=source.source_id,
                        normalized_record_id=change_result.record_id,
                        change_key=change_key,
                        change_type=change_result.change_type,
                        summary=change_result.change_summary,
                        details_json=to_json(
                            {
                                **change_result.details,
                                "source_name": source.source_name,
                                "source_type": source.source_type,
                                "adapter_key": source.adapter_key,
                                "info_type": theme.info_type,
                            }
                        ),
                    )

                    # Evaluate event rules
                    self._evaluate_events(
                        connection,
                        theme=theme,
                        source=source,
                        run_id=run_id,
                        change_id=change_id,
                        normalized_record=normalized_record,
                        record_identity=record_identity,
                        latest_occurred_at=latest_occurred_at,
                    )

                mark_run_completed(connection, run_id, source.source_id)
        except Exception as error:
            with self.engine.begin() as connection:
                mark_run_failed(connection, run_id, source.source_id, str(error))
            raise
