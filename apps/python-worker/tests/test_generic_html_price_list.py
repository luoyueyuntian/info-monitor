"""Tests for generic_html_price_list adapter."""

from info_monitor_worker.adapters.generic_html_price_list import GenericHtmlPriceListAdapter
from info_monitor_worker.models import RawFetchResult


class TestGenericHtmlPriceListAdapter:
    def setup_method(self):
        self.adapter = GenericHtmlPriceListAdapter()

    def test_parses_basic_html_price_cards(self):
        raw = RawFetchResult(
            payload="""
            <div class="deal">
              <a class="title" href="/item/1">iPhone 16 128G</a>
              <span class="price">￥5999</span>
              <span class="spec">国行</span>
              <time datetime="2026-06-15T10:00:00+08:00"></time>
            </div>
            <div class="deal">
              <a class="title" href="/item/2">MacBook Pro 14</a>
              <span class="price">13999元</span>
            </div>
            """,
            metadata={
                "url": "https://example.com/deals",
                "item_selector": ".deal",
                "title_selector": ".title",
                "price_selector": ".price",
                "link_selector": ".title",
                "time_selector": "time",
                "spec_selector": ".spec",
                "currency": "CNY",
                "max_items": 20,
                "default_spec": "",
                "include_title_keywords": [],
                "exclude_title_keywords": [],
            },
        )

        result = self.adapter.map_to_normalizer_input(raw)

        assert len(result) == 2
        assert result[0]["title"] == "iPhone 16 128G"
        assert result[0]["price"] == 5999.0
        assert result[0]["spec"] == "国行"
        assert result[0]["url"] == "https://example.com/item/1"
        assert result[0]["occurred_at"] == "2026-06-15T10:00:00+08:00"

    def test_excludes_investment_titles(self):
        raw = RawFetchResult(
            payload="""
            <div class="deal">
              <a class="title" href="/item/1">投资金条 100g</a>
              <span class="price">￥79999</span>
            </div>
            <div class="deal">
              <a class="title" href="/item/2">Nintendo Switch 2</a>
              <span class="price">￥2999</span>
            </div>
            """,
            metadata={
                "url": "https://example.com/deals",
                "item_selector": ".deal",
                "title_selector": ".title",
                "price_selector": ".price",
                "link_selector": ".title",
                "time_selector": "",
                "spec_selector": "",
                "currency": "CNY",
                "max_items": 20,
                "default_spec": "",
                "include_title_keywords": [],
                "exclude_title_keywords": ["投资", "金条"],
            },
        )

        result = self.adapter.map_to_normalizer_input(raw)

        assert len(result) == 1
        assert result[0]["title"] == "Nintendo Switch 2"
