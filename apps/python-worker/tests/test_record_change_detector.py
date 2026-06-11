"""Tests for the RecordChangeDetector and detector registry."""

from __future__ import annotations

from info_monitor_worker.detectors import (
    ChangeResult,
    RecordChangeDetector,
    get_detector,
    register_detector,
)
from info_monitor_worker.detectors.base import BaseDetector
from info_monitor_worker.models import NormalizedRecord


def _make_record(
    *,
    record_type: str = "price",
    title: str = "Test Record",
    occurred_at: str = "2026-06-01T09:30:00Z",
    content: dict | None = None,
    logical_key: str | None = None,
) -> NormalizedRecord:
    return NormalizedRecord(
        record_type=record_type,
        title=title,
        occurred_at=occurred_at,
        content=content or {"price": 3999},
        logical_key=logical_key,
    )


class TestRecordChangeDetector:
    def setup_method(self):
        self.detector = RecordChangeDetector()

    def test_new_record(self):
        record = _make_record()
        fingerprint = "abc123"

        result = self.detector.detect_change(record, None, fingerprint=fingerprint)

        assert result.is_new is True
        assert result.is_updated is False
        assert result.is_unchanged is False
        assert result.change_type == "record_created"
        assert "new" in result.change_summary.lower()
        assert result.record_id is not None
        assert result.existing_record is None

    def test_unchanged_record(self):
        record = _make_record()
        existing = {"id": "existing-123", "fingerprint": "abc123"}
        fingerprint = "abc123"

        result = self.detector.detect_change(record, existing, fingerprint=fingerprint)

        assert result.is_new is False
        assert result.is_updated is False
        assert result.is_unchanged is True
        assert result.change_type == ""
        assert result.record_id == "existing-123"

    def test_updated_record(self):
        record = _make_record()
        existing = {"id": "existing-123", "fingerprint": "old-fingerprint"}
        fingerprint = "new-fingerprint"

        result = self.detector.detect_change(record, existing, fingerprint=fingerprint)

        assert result.is_new is False
        assert result.is_updated is True
        assert result.is_unchanged is False
        assert result.change_type == "record_updated"
        assert "updated" in result.change_summary.lower()
        assert result.record_id == "existing-123"

    def test_price_type_summaries(self):
        record = _make_record(record_type="price")

        new_result = self.detector.detect_change(record, None, fingerprint="fp1")
        assert "price" in new_result.change_summary.lower()

        existing = {"id": "id1", "fingerprint": "old"}
        updated_result = self.detector.detect_change(record, existing, fingerprint="fp2")
        assert "price" in updated_result.change_summary.lower()

    def test_financial_event_type_summaries(self):
        record = _make_record(record_type="financial_event", content={"operation_type": "逆回购"})

        new_result = self.detector.detect_change(record, None, fingerprint="fp1")
        assert "financial event" in new_result.change_summary.lower()

    def test_details_include_key_fields(self):
        record = _make_record(
            content={"price": 3999, "spec": "16G+512G"},
            logical_key="test-key",
        )

        result = self.detector.detect_change(record, None, fingerprint="fp1")

        assert result.details["title"] == "Test Record"
        assert result.details["logical_key"] == "test-key"
        assert result.details["price"] == 3999
        assert result.details["spec"] == "16G+512G"


class TestDetectorRegistry:
    def test_get_default_detector(self):
        detector = get_detector("price")

        assert isinstance(detector, RecordChangeDetector)

    def test_get_detector_for_unknown_type(self):
        detector = get_detector("unknown_type")

        assert isinstance(detector, RecordChangeDetector)

    def test_register_custom_detector(self):
        class CustomDetector(BaseDetector):
            info_type = "custom"

            def detect_change(self, normalized_record, existing_record, *, fingerprint):
                return ChangeResult(
                    is_new=True,
                    is_updated=False,
                    is_unchanged=False,
                    change_type="custom_change",
                    change_summary="Custom change detected.",
                )

        register_detector("custom", CustomDetector())
        detector = get_detector("custom")

        assert isinstance(detector, CustomDetector)

        record = _make_record(record_type="custom")
        result = detector.detect_change(record, None, fingerprint="fp")

        assert result.change_type == "custom_change"

        # Cleanup
        from info_monitor_worker.detectors import registry
        del registry._detectors["custom"]
