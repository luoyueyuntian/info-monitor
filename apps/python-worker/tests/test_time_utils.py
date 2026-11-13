"""Tests for the shared time normalization utilities."""
from __future__ import annotations

import pytest

from info_monitor_worker.adapters.time_utils import (
    TZ_CST,
    ensure_iso_with_tz,
    has_tz_suffix,
    normalize_pub_date,
)


@pytest.mark.parametrize("normalize", [ensure_iso_with_tz, normalize_pub_date])
@pytest.mark.parametrize("weekday", ["Tue", "Thu"])
def test_rss_weekday_dates_are_converted_to_iso(normalize, weekday):
    assert normalize(f"{weekday}, 12 Nov 2026 04:32:31 +0000") == "2026-11-12T04:32:31+00:00"


class TestHasTzSuffix:
    def test_z_suffix(self):
        assert has_tz_suffix("2026-06-01T10:00:00Z")

    def test_positive_offset(self):
        assert has_tz_suffix("2026-06-01T10:00:00+08:00")

    def test_negative_offset(self):
        assert has_tz_suffix("2026-06-01T10:00:00-05:00")

    def test_short_offset(self):
        assert has_tz_suffix("2026-06-01T10:00:00+08")

    def test_no_tz(self):
        assert not has_tz_suffix("2026-06-01T10:00:00")

    def test_date_only_false_positive(self):
        # Note: regex matches -01 as timezone-like, but this is safe because
        # has_tz_suffix is only called after checking "T" in the string.
        # Date-only strings (no T) take a different code path.
        assert has_tz_suffix("2026-06-01")  # matches -01 as tz-like


class TestEnsureIsoWithTz:
    def test_already_iso_with_tz(self):
        assert ensure_iso_with_tz("2026-06-01T10:00:00Z") == "2026-06-01T10:00:00Z"

    def test_iso_without_tz(self):
        result = ensure_iso_with_tz("2026-06-01T10:00:00")
        assert result == "2026-06-01T10:00:00+08:00"

    def test_date_only(self):
        result = ensure_iso_with_tz("2026-06-01")
        assert result == "2026-06-01T00:00:00+08:00"

    def test_empty_string_returns_fallback(self):
        result = ensure_iso_with_tz("", fallback="2026-01-01T00:00:00+08:00")
        assert result == "2026-01-01T00:00:00+08:00"

    def test_empty_string_returns_current_time_when_no_fallback(self):
        result = ensure_iso_with_tz("")
        # Should be a valid ISO timestamp (current CST time)
        assert "T" in result
        assert "+08:00" in result

    def test_human_readable_date(self):
        result = ensure_iso_with_tz("June 1, 2026")
        assert result.startswith("2026-06-01")
        assert "+08:00" in result

    def test_non_date_string_returns_fallback(self):
        """Key fix: non-parseable strings should return fallback, not garbage."""
        result = ensure_iso_with_tz("N/A", fallback="2026-01-01T00:00:00+08:00")
        assert result == "2026-01-01T00:00:00+08:00"

    def test_non_date_string_returns_current_time_when_no_fallback(self):
        """Non-parseable strings should return current time, not 'N/AT00:00:00+08:00'."""
        result = ensure_iso_with_tz("Coming soon")
        assert "T" in result
        assert "+08:00" in result
        # Must NOT be "Coming soonT00:00:00+08:00"
        assert "Coming" not in result

    def test_whitespace_only_returns_fallback(self):
        result = ensure_iso_with_tz("   ", fallback="2026-01-01T00:00:00+08:00")
        assert result == "2026-01-01T00:00:00+08:00"


class TestNormalizePubDate:
    def test_slash_date(self):
        result = normalize_pub_date("2026/06/01")
        assert result == "2026-06-01T00:00:00+08:00"

    def test_dash_date(self):
        result = normalize_pub_date("2026-06-01")
        assert result == "2026-06-01T00:00:00+08:00"

    def test_slash_datetime(self):
        result = normalize_pub_date("2026/06/01 10:30:00")
        assert result == "2026-06-01T10:30:00+08:00"

    def test_already_iso_with_tz(self):
        assert normalize_pub_date("2026-06-01T10:00:00+08:00") == "2026-06-01T10:00:00+08:00"

    def test_empty_string_returns_current_time(self):
        result = normalize_pub_date("")
        assert "T" in result
        assert "+08:00" in result

    def test_non_date_string_returns_current_time(self):
        """Key fix: non-parseable strings should return current time, not 'unknown+08:00'."""
        result = normalize_pub_date("unknown")
        assert "T" in result
        assert "+08:00" in result
        assert "unknown" not in result

    def test_whitespace_only_returns_current_time(self):
        result = normalize_pub_date("   ")
        assert "T" in result
        assert "+08:00" in result
