"""Tests for generic_price_list adapter."""
import pytest

from info_monitor_worker.adapters.field_utils import resolve_field as _resolve_field
from info_monitor_worker.adapters.generic_price_list import (
    GenericPriceListAdapter,
)
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class TestResolveField:
    def test_simple_field(self):
        assert _resolve_field({"a": 1}, "a") == 1

    def test_nested_field(self):
        assert _resolve_field({"a": {"b": 2}}, "a.b") == 2

    def test_deeply_nested(self):
        assert _resolve_field({"a": {"b": {"c": 3}}}, "a.b.c") == 3

    def test_missing_field(self):
        assert _resolve_field({"a": 1}, "b") is None

    def test_missing_nested_field(self):
        assert _resolve_field({"a": {"b": 1}}, "a.c") is None

    def test_list_index(self):
        assert _resolve_field([10, 20, 30], "1") == 20

    def test_list_index_out_of_range(self):
        assert _resolve_field([10, 20], "5") is None

    def test_dict_then_list(self):
        data = {"items": [{"id": 1}, {"id": 2}]}
        assert _resolve_field(data, "items.1.id") == 2

    def test_none_intermediate(self):
        assert _resolve_field({"a": None}, "a.b") is None

    def test_empty_path(self):
        data = {"a": 1}
        # Empty string split gives [""], which won't match
        assert _resolve_field(data, "") is None


class TestGenericPriceListAdapterMapToNormalizerInput:
    def setup_method(self):
        self.adapter = GenericPriceListAdapter()

    def test_flat_list_basic(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Surface Pro 8", "price": 3999, "spec": "16G+512G"},
                {"title": "Surface Pro 8", "price": 4199, "spec": "8G+256G"},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "spec",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 2
        assert result[0]["title"] == "Surface Pro 8"
        assert result[0]["price"] == 3999.0
        assert result[0]["spec"] == "16G+512G"
        assert result[0]["currency"] == "CNY"
        assert "occurred_at" in result[0]

    def test_nested_items_field(self):
        raw = RawFetchResult(
            payload={
                "data": {
                    "items": [
                        {"name": "iPhone 14", "cost": 4999, "variant": "128GB"},
                    ],
                },
            },
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "data.items",
                "title_field": "name",
                "price_field": "cost",
                "spec_field": "variant",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 1
        assert result[0]["title"] == "iPhone 14"
        assert result[0]["price"] == 4999.0
        assert result[0]["spec"] == "128GB"

    def test_skips_items_with_missing_price(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 100},
                {"title": "Item B"},  # missing price
                {"title": "Item C", "price": 300},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 2

    def test_skips_non_numeric_price(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 100},
                {"title": "Item B", "price": "not_a_number"},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 1
        assert result[0]["title"] == "Item A"

    def test_max_items_limit(self):
        items = [{"title": f"Item {i}", "price": 100 + i} for i in range(50)]
        raw = RawFetchResult(
            payload=items,
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 5,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert len(result) == 5

    def test_with_time_field(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 100, "created_at": "2024-06-01T10:00:00+08:00"},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "created_at",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["occurred_at"] == "2024-06-01T10:00:00+08:00"

    def test_with_url_field(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 100, "link": "https://example.com/item/1"},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "link",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["url"] == "https://example.com/item/1"

    def test_with_symbol_field(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Moutai", "price": 1728.52, "code": "600519"},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "code",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["symbol"] == "600519"

    def test_default_spec(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 100},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "default-spec",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["spec"] == "default-spec"

    def test_empty_list_raises(self):
        raw = RawFetchResult(
            payload=[],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        with pytest.raises(ValueError, match="no valid price items"):
            self.adapter.map_to_normalizer_input(raw)

    def test_items_field_not_found_raises(self):
        raw = RawFetchResult(
            payload={"data": {"other_key": []}},
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "data.items",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "CNY",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        with pytest.raises(ValueError, match="not a list"):
            self.adapter.map_to_normalizer_input(raw)

    def test_custom_currency(self):
        raw = RawFetchResult(
            payload=[
                {"title": "Item A", "price": 99.99},
            ],
            metadata={
                "url": "https://example.com",
                "theme_name": "Test",
                "items_field": "",
                "title_field": "title",
                "price_field": "price",
                "spec_field": "",
                "url_field": "",
                "time_field": "",
                "currency": "USD",
                "symbol_field": "",
                "display_name_field": "",
                "max_items": 20,
                "default_spec": "",
                "base_url": "https://example.com",
            },
        )
        result = self.adapter.map_to_normalizer_input(raw)
        assert result[0]["currency"] == "USD"
