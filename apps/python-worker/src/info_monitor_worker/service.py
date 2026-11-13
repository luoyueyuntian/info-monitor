from __future__ import annotations

from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock, Thread
import logging

from sqlalchemy import text
from info_monitor_worker.config import load_config
from typing import Any, Dict

from info_monitor_worker.adapters.registry import get_adapter
from info_monitor_worker.article_queue import enqueue_article
from info_monitor_worker.db import create_db_engine
from info_monitor_worker.detectors import get_detector
from info_monitor_worker.event_rules.boll_signal import BOLLSignalRule
from info_monitor_worker.event_rules.financial_direction import FinancialDirectionRule
from info_monitor_worker.event_rules.kdj_signal import KDJSignalRule
from info_monitor_worker.event_rules.macd_signal import MACDSignalRule
from info_monitor_worker.event_rules.moving_average_signal import MovingAverageSignalRule
from info_monitor_worker.event_rules.rsi_signal import RSISignalRule
from info_monitor_worker.info_types import canonicalize_info_type
from info_monitor_worker.event_rules.price_30d_low import ThirtyDayLowRule
from info_monitor_worker.models import SourceContext, ThemeContext
from info_monitor_worker.normalizers.registry import get_normalizer
from info_monitor_worker.repositories import (
    claim_pending_runs,
    recover_expired_runs,
    renew_run_leases,
    verify_run_claim,
    fetch_snapshot_payload,
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
    update_normalized_record,
)
from info_monitor_worker.enrichment import enrich_record_sync
from info_monitor_worker.search_indexer import defer_indexing, index_event, index_normalized_record, index_notification

from info_monitor_worker.utils import create_id, fingerprint_for_value, to_json

logger = logging.getLogger(__name__)


class WorkerService:
    def __init__(self, *, engine=None, config=None) -> None:
        self.config = config or load_config()
        self.engine = engine if engine is not None else create_db_engine()
        self._owns_engine = engine is None
        self._executor = ThreadPoolExecutor(max_workers=self.config.concurrency, thread_name_prefix="source-run")
        self._futures = {}
        self._claims = {}
        self._lock = Lock()
        self._stopped = Event()
        self._heartbeat = Thread(target=self._renew_active, name="worker-leases", daemon=True)
        self._heartbeat.start()
        self.price_low_rule = ThirtyDayLowRule()
        self.financial_direction_rule = FinancialDirectionRule()
        self.rsi_signal_rule = RSISignalRule()
        self.macd_signal_rule = MACDSignalRule()
        self.kdj_signal_rule = KDJSignalRule()
        self.boll_signal_rule = BOLLSignalRule()
        self.ma_signal_rule = MovingAverageSignalRule()
    def _renew_active(self) -> None:
        interval = min(30, max(5, self.config.lease_seconds // 3))
        while not self._stopped.wait(interval):
            with self._lock:
                claims = dict(self._claims)
            if claims:
                try:
                    with self.engine.begin() as connection:
                        renew_run_leases(connection, claims, self.config.lease_seconds, self.config.max_run_seconds)
                except Exception:
                    logger.exception("Could not renew active run leases")

    def run_once(self) -> int:
        if self._stopped.is_set():
            raise RuntimeError("Worker service is closed")
        with self._lock:
            done = [(run_id, future) for run_id, future in self._futures.items() if future.done()]
            for run_id, _ in done:
                del self._futures[run_id]
                self._claims.pop(run_id, None)
            active_ids = list(self._futures)
        for run_id, future in done:
            try:
                future.result()
            except Exception:
                logger.exception("Unhandled task failure for %s", run_id)
        slots = self.config.concurrency - len(active_ids)
        with self.engine.begin() as connection:
            recover_expired_runs(connection, self.config.lease_seconds, self.config.max_attempts)
            runs = claim_pending_runs(connection, slots, self.config.lease_seconds,
                                      self.config.max_run_seconds, exclude_run_ids=active_ids) if slots else []
        for run in runs:
            with self._lock:
                self._claims[run["run_id"]] = run["claim_token"]
                self._futures[run["run_id"]] = self._executor.submit(self._process_run, run)
        return len(runs)

    def close(self) -> None:
        # Keep renewing leases while in-flight work drains.
        self._executor.shutdown(wait=True)
        self._stopped.set()
        self._heartbeat.join(timeout=5)
        if self._owns_engine:
            self.engine.dispose()

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
    ) -> str:
        notification_id = create_id("notification")
        insert_notification(
            connection=connection,
            notification_id=notification_id,
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
        return notification_id

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
        notification_id = self._create_notification(
            connection=connection,
            event_id=event_id,
            event_title=title,
            event_summary=summary,
            signal=signal,
        )
        # Index for search (best-effort, non-blocking)
        try:
            index_event({
                "id": event_id,
                "title": title,
                "summary": summary,
                "signal": signal,
                "evidence": evidence,
                "themeId": theme_id,
                "occurredAt": occurred_at,
                "status": "open",
            })
            index_notification({
                "id": notification_id,
                "title": title,
                "summary": summary,
                "signal": signal,
                "eventId": event_id,
                "status": "pending",
            })
        except Exception:
            pass  # Search indexing is best-effort

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
            # Always evaluate technical indicator rules (independent of latest-only check)
            indicators = normalized_record.content.get("indicators")
            if indicators:
                indicator_rules = [
                    ("rsi_signal", "rsi_signal", self.rsi_signal_rule),
                    ("macd_signal", "macd_signal", self.macd_signal_rule),
                    ("kdj_signal", "kdj_signal", self.kdj_signal_rule),
                    ("boll_signal", "boll_signal", self.boll_signal_rule),
                    ("ma_signal", "ma_signal", self.ma_signal_rule),
                ]
                for event_type, event_key_suffix, rule in indicator_rules:
                    rule_result = rule.evaluate(normalized_record)
                    if rule_result.triggered:
                        indicator_event_key = (
                            f"{theme.theme_id}:{source.source_id}:{event_key_suffix}:"
                            f"{record_identity}:{normalized_record.occurred_at}"
                        )
                        self._emit_event_with_notification(
                            connection=connection,
                            run_id=run_id,
                            theme_id=theme.theme_id,
                            source_id=source.source_id,
                            change_id=change_id,
                            event_key=indicator_event_key,
                            event_type=event_type,
                            signal=rule_result.signal,
                            title=rule_result.title,
                            summary=rule_result.summary,
                            occurred_at=normalized_record.occurred_at,
                            evidence=rule_result.evidence,
                        )

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
            info_type=canonicalize_info_type(run["info_type"]),
        )
        source = SourceContext(
            source_id=run["source_id"],
            source_name=run["source_name"],
            source_type=run["source_type"],
            adapter_key=run["adapter_key"],
            config=run["source_config"] or {},
        )
        run_id = run["run_id"]
        is_test = run.get("trigger_type") == "test"
        is_replay = run.get("trigger_type") == "replay"
        replay_snapshot_id = run.get("replay_snapshot_id")

        try:
            with self.engine.begin() as connection:
                if not verify_run_claim(connection, run_id, run["claim_token"]):
                    return
                if is_replay and replay_snapshot_id:
                    snapshot = fetch_snapshot_payload(connection, replay_snapshot_id)
                    if not snapshot:
                        raise ValueError(f"Replay snapshot {replay_snapshot_id} not found")
                    raw_payload = snapshot["payload_json"]
                    if isinstance(raw_payload, str):
                        import json
                        raw_payload = json.loads(raw_payload)

            if not (is_replay and replay_snapshot_id):
                adapter = get_adapter(source.adapter_key)
                raw_result = adapter.fetch(theme, source)
                raw_payload = adapter.map_to_normalizer_input(raw_result)
            normalizer = get_normalizer(theme.info_type)
            normalized_records = normalizer.normalize(raw_payload)
            for record in normalized_records if not is_test else []:
                enrichment = enrich_record_sync(title=record.title, content=record.content,
                                                info_type=theme.info_type, source_name=source.source_name)
                if enrichment and enrichment.summary:
                    record.content["_enrichment"] = {
                        "summary": enrichment.summary, "sentiment": enrichment.sentiment,
                        "impact": enrichment.impact, "entities": enrichment.entities,
                    }

            with defer_indexing(), self.engine.begin() as connection:
                if not verify_run_claim(connection, run_id, run["claim_token"]):
                    return
                # Preserve ordering of cross-source event/price checks within a theme.
                connection.execute(text("select pg_advisory_xact_lock(hashtextextended(:theme_id, 0))"),
                                   {"theme_id": theme.theme_id})
                if is_test:
                    # Test run: write snapshot with results, skip production writes
                    sample_records = []
                    for record in normalized_records[:20]:
                        sample_records.append({
                            "title": record.title,
                            "occurred_at": record.occurred_at,
                            "info_type": theme.info_type,
                            "content": record.content,
                        })

                    insert_raw_snapshot(
                        connection=connection,
                        snapshot_id=create_id("snapshot"),
                        run_id=run_id,
                        theme_id=theme.theme_id,
                        source_id=source.source_id,
                        payload_json=to_json({
                            "raw_payload": raw_payload,
                            "normalized_records": sample_records,
                            "total_records": len(normalized_records),
                            "is_test_run": True,
                        }),
                    )
                else:
                    # Production run: full pipeline
                    insert_raw_snapshot(
                        connection=connection,
                        snapshot_id=create_id("snapshot"),
                        run_id=run_id,
                        theme_id=theme.theme_id,
                        source_id=source.source_id,
                        payload_json=to_json(raw_payload),
                    )

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

                        if theme.info_type == 'news_announcement' and not is_replay:
                            article_url = normalized_record.source_url or normalized_record.content.get('url')
                            if isinstance(article_url, str):
                                enqueue_article(connection, article_url, normalized_record.title)

                        # Index for search (best-effort)
                        try:
                            index_normalized_record({
                                "id": change_result.record_id,
                                "title": normalized_record.title,
                                "content": str(normalized_record.content),
                                "infoType": theme.info_type,
                                "themeId": theme.theme_id,
                                "sourceId": source.source_id,
                            })
                        except Exception:
                            pass

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

                mark_run_completed(connection, run_id, source.source_id, is_test=is_test)
        except Exception as error:
            with self.engine.begin() as connection:
                if verify_run_claim(connection, run_id, run["claim_token"]):
                    mark_run_failed(connection, run_id, source.source_id, str(error), is_test=is_test)
            print(f"Run {run_id} failed for source {source.source_id}: {error}")
