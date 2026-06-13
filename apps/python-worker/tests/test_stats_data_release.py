"""Tests for stats_data_release_list adapter."""
import pytest
from info_monitor_worker.adapters.stats_data_release_list import classify_release_topic
from info_monitor_worker.adapters.time_utils import normalize_pub_date


class TestNormalizePubDate:
    def test_slash_separated_date(self):
        assert normalize_pub_date("2024/06/01") == "2024-06-01T00:00:00+08:00"

    def test_dash_separated_date(self):
        assert normalize_pub_date("2024-06-01") == "2024-06-01T00:00:00+08:00"

    def test_already_has_tz(self):
        assert normalize_pub_date("2024-06-01T12:00:00+08:00") == "2024-06-01T12:00:00+08:00"

    def test_negative_tz(self):
        assert normalize_pub_date("2024-06-01T12:00:00-05:00") == "2024-06-01T12:00:00-05:00"

    def test_no_tz_with_time(self):
        result = normalize_pub_date("2024-06-01T12:00:00")
        assert result == "2024-06-01T12:00:00+08:00"

    def test_empty_string(self):
        result = normalize_pub_date("")
        assert "2024" in result or "2025" in result or "2026" in result  # Current year

    def test_non_date_returns_current_time(self):
        """Non-parseable strings return current time, not 'unknown+08:00'."""
        result = normalize_pub_date("unknown")
        assert "T" in result
        assert "+08:00" in result
        assert "unknown" not in result


class TestClassifyReleaseTopic:
    def test_pmi(self):
        assert classify_release_topic("采购经理指数")[0] == "pmi"

    def test_cpi(self):
        assert classify_release_topic("居民消费价格")[0] == "prices"

    def test_unknown(self):
        assert classify_release_topic("某随机标题")[0] == "general_release"
