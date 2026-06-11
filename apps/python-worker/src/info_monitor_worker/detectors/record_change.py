"""Generic record change detector — handles all info_types with a common pattern."""

from __future__ import annotations

from typing import Any, Dict, Optional

from info_monitor_worker.detectors.base import BaseDetector, ChangeResult
from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.utils import create_id


# Default summaries per info_type and change kind
_SUMMARIES: Dict[str, Dict[str, str]] = {
    "price": {
        "created": "Stored a new normalized price snapshot.",
        "updated": "Updated an existing normalized price snapshot.",
    },
    "content_update": {
        "created": "Stored a new normalized content update record.",
        "updated": "Updated an existing normalized content update record.",
    },
    "news_announcement": {
        "created": "Stored a new normalized official announcement record.",
        "updated": "Updated an existing normalized official announcement record.",
    },
    "financial_event": {
        "created": "Stored a new normalized financial event record.",
        "updated": "Updated an existing normalized financial event record.",
    },
}

_FALLBACK_SUMMARIES = {
    "created": "Stored a new normalized record.",
    "updated": "Updated an existing normalized record.",
}


class RecordChangeDetector(BaseDetector):
    """Detects whether a normalized record is new, updated, or unchanged.

    This is the default detector used for all info_types. It compares the
    incoming record's fingerprint against the existing record to determine
    if content has changed.
    """

    info_type = "*"

    def detect_change(
        self,
        normalized_record: NormalizedRecord,
        existing_record: Optional[Dict[str, Any]],
        *,
        fingerprint: str,
    ) -> ChangeResult:
        info_type = normalized_record.record_type
        type_summaries = _SUMMARIES.get(info_type, _FALLBACK_SUMMARIES)

        # No existing record → new record
        if existing_record is None:
            return ChangeResult(
                is_new=True,
                is_updated=False,
                is_unchanged=False,
                change_type="record_created",
                change_summary=type_summaries["created"],
                existing_record=None,
                record_id=create_id("record"),
                details=self._build_details(normalized_record),
            )

        # Existing record with same fingerprint → unchanged
        if existing_record.get("fingerprint") == fingerprint:
            return ChangeResult(
                is_new=False,
                is_updated=False,
                is_unchanged=True,
                change_type="",
                change_summary="",
                existing_record=existing_record,
                record_id=existing_record["id"],
                details={},
            )

        # Existing record with different fingerprint → updated
        return ChangeResult(
            is_new=False,
            is_updated=True,
            is_unchanged=False,
            change_type="record_updated",
            change_summary=type_summaries["updated"],
            existing_record=existing_record,
            record_id=existing_record["id"],
            details=self._build_details(normalized_record),
        )

    def _build_details(self, record: NormalizedRecord) -> Dict[str, Any]:
        return {
            "title": record.title,
            "logical_key": record.logical_key,
            "source_url": record.source_url,
            "occurred_at": record.occurred_at,
            **{k: v for k, v in record.content.items() if k in ("price", "spec", "operation_type")},
        }
