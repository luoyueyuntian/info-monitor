"""Tests for generic_announcement_list adapter."""
import pytest

from info_monitor_worker.adapters.field_utils import resolve_field as _resolve_field
from info_monitor_worker.adapters.generic_announcement_list import (
    GenericAnnouncementListAdapter,
    _classify_update_type,
)
from info_monitor_worker.models import RawFetchResult


class TestClassifyUpdateType:
    def test_feature_keyword(self):
        assert _classify_update_type("feature", "content_update") == "feature_release"

    def test_features_keyword(self):
        assert _classify_update_type("features", "content_update") == "feature_release"

    def test_chinese_feature(self):
        assert _classify_update_type("新功能", "content_update") == "feature_release"

    def test_marketing_keyword(self):
        assert _classify_update_type("marketing", "content_update") == "marketing"

    def test_chinese_marketing(self):
        assert _classify_update_type("促销", "content_update") == "marketing"

    def test_announcement_keyword(self):
        assert _classify_update_type("announcement", "content_update") == "announcement"

    def test_chinese_announcement(self):
        assert _classify_update_type("公告", "content_update") == "announcement"

    def test_unknown_returns_default(self):
        assert _classify_update_type("something_else", "content_update") == "content_update"

    def test_none_returns_default(self):
        assert _classify_update_type(None, "feature_release") == "feature_release"

    def test_empty_returns_default(self):
        assert _classify_update_type("", "announcement") == "announcement"

    def test_case_insensitive(self):
        assert _classify_update_type("FEATURE", "content_update") == "feature_release"
        assert _classify_update_type("Marketing", "content_update") == "marketing"


class TestGenericAnnouncementListAdapterMapToNormalizerInput:
    def setup_method(self):
        self.adapter = GenericAnnouncementListAdapter()

    def _make_raw(self, payload, **overrides):
        meta = {
            "url": "https://example.com",
            "theme_name": "Test Product",
            "items_field": "",
            "title_field": "title",
            "time_field": "",
            "url_field": "",
            "summary_field": "",
            "category_field": "",
            "object_name": "Test Product",
            "update_type": "content_update",
            "max_items": 20,
            "base_url": "https://example.com",
        }
        meta.update(overrides)
        return RawFetchResult(payload=payload, metadata=meta)

    def test_flat_list_basic(self):
        raw = self._make_raw([
            {"title": "v2.0 Released", "description": "Major update"},
            {"title": "v1.9 Released", "description": "Bug fixes"},
        ])
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 2
        assert result[0]["title"] == "v2.0 Released"
        assert result[0]["object_name"] == "Test Product"
        assert "occurred_at" in result[0]

    def test_nested_items_field(self):
        raw = self._make_raw(
            {"data": {"releases": [{"title": "v1.0"}]}},
            items_field="data.releases",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 1
        assert result[0]["title"] == "v1.0"

    def test_with_time_field(self):
        raw = self._make_raw(
            [{"title": "Update", "published_at": "2024-06-01T10:00:00+08:00"}],
            time_field="published_at",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["occurred_at"] == "2024-06-01T10:00:00+08:00"

    def test_with_url_field(self):
        raw = self._make_raw(
            [{"title": "Update", "link": "https://blog.example.com/v2"}],
            url_field="link",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["url"] == "https://blog.example.com/v2"

    def test_with_summary_field(self):
        raw = self._make_raw(
            [{"title": "Update", "body": "This is the full description"}],
            summary_field="body",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["summary"] == "This is the full description"

    def test_summary_defaults_to_title(self):
        raw = self._make_raw([{"title": "Update"}])
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["summary"] == "Update"

    def test_with_category_field_feature(self):
        raw = self._make_raw(
            [{"title": "New Feature", "type": "feature"}],
            category_field="type",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["update_type"] == "feature_release"

    def test_with_category_field_marketing(self):
        raw = self._make_raw(
            [{"title": "Sale!", "type": "marketing"}],
            category_field="type",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["update_type"] == "marketing"

    def test_with_category_field_announcement(self):
        raw = self._make_raw(
            [{"title": "Notice", "type": "announcement"}],
            category_field="type",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["update_type"] == "announcement"

    def test_category_field_unknown_uses_default(self):
        raw = self._make_raw(
            [{"title": "Something", "type": "other"}],
            category_field="type",
            update_type="content_update",
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["update_type"] == "content_update"

    def test_skips_missing_title(self):
        raw = self._make_raw([
            {"title": "Valid"},
            {"description": "No title"},
            {"title": "Also Valid"},
        ])
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 2

    def test_max_items(self):
        items = [{"title": f"Item {i}"} for i in range(50)]
        raw = self._make_raw(items, max_items=5)
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 5

    def test_empty_list_raises(self):
        raw = self._make_raw([])
        with pytest.raises(ValueError, match="no valid items"):
            self.adapter.map_to_normalizer_input(raw)

    def test_non_list_payload_raises(self):
        raw = self._make_raw({"not": "a list"})
        with pytest.raises(ValueError, match="Cannot find items list"):
            self.adapter.map_to_normalizer_input(raw)
