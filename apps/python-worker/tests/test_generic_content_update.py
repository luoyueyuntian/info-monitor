"""Tests for generic_content_update_list adapter."""
import pytest
from info_monitor_worker.adapters.generic_content_update_list import _parse_time_node
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz, has_tz_suffix


class TestEnsureIsoWithTz:
    def test_iso_date_only(self):
        assert ensure_iso_with_tz("2024-06-01") == "2024-06-01T00:00:00+08:00"

    def test_iso_with_tz_positive(self):
        assert ensure_iso_with_tz("2024-06-01T10:30:00+08:00") == "2024-06-01T10:30:00+08:00"

    def test_iso_with_tz_negative(self):
        assert ensure_iso_with_tz("2024-06-01T10:30:00-05:00") == "2024-06-01T10:30:00-05:00"

    def test_iso_with_z(self):
        assert ensure_iso_with_tz("2024-06-01T10:30:00Z") == "2024-06-01T10:30:00Z"

    def test_iso_with_lowercase_z(self):
        assert ensure_iso_with_tz("2024-06-01T10:30:00z") == "2024-06-01T10:30:00z"

    def test_no_tz_appends_cst(self):
        result = ensure_iso_with_tz("2024-06-01T10:30:00")
        assert result == "2024-06-01T10:30:00+08:00"

    def test_empty_string_returns_current_time(self):
        result = ensure_iso_with_tz("")
        assert "T" in result
        assert "+08:00" in result

    def test_whitespace_only_returns_current_time(self):
        result = ensure_iso_with_tz("   ")
        assert "T" in result
        assert "+08:00" in result

    def test_human_readable(self):
        result = ensure_iso_with_tz("June 1, 2024")
        assert "2024" in result
        assert "+08:00" in result or "T" in result

    def test_non_date_returns_fallback(self):
        """Non-parseable strings return fallback, not garbage."""
        result = ensure_iso_with_tz("N/A", fallback="2024-01-01T00:00:00+08:00")
        assert result == "2024-01-01T00:00:00+08:00"

    def test_non_date_returns_current_time_when_no_fallback(self):
        result = ensure_iso_with_tz("Coming soon")
        assert "T" in result
        assert "+08:00" in result
        assert "Coming" not in result


class TestHasTzSuffix:
    def test_positive_offset(self):
        assert has_tz_suffix("2024-06-01T10:00:00+08:00") is True

    def test_negative_offset(self):
        assert has_tz_suffix("2024-06-01T10:00:00-05:00") is True

    def test_z_suffix(self):
        assert has_tz_suffix("2024-06-01T10:00:00Z") is True

    def test_lowercase_z(self):
        assert has_tz_suffix("2024-06-01T10:00:00z") is True

    def test_no_tz(self):
        assert has_tz_suffix("2024-06-01T10:00:00") is False


class TestParseTimeNode:
    def test_none_returns_default(self):
        assert _parse_time_node(None, "default", "fallback") == "default"

    def test_none_returns_fallback_when_default_empty(self):
        assert _parse_time_node(None, "", "fallback") == "fallback"
