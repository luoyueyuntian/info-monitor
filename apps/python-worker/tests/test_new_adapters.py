"""Tests for the newly added source adapters.

Covers: sina_gold_price, sina_stock_price, yahoo_finance_price,
github_releases, rss_feed, pbc_treasury_yield.
"""
from __future__ import annotations

import pytest

from info_monitor_worker.adapters.github_releases import GithubReleasesAdapter
from info_monitor_worker.adapters.pbc_treasury_yield import PbcTreasuryYieldAdapter
from info_monitor_worker.adapters.rss_feed import RssFeedAdapter
from info_monitor_worker.adapters.sina_gold_price import SinaGoldPriceAdapter
from info_monitor_worker.adapters.sina_stock_price import SinaStockPriceAdapter
from info_monitor_worker.adapters.yahoo_finance_price import YahooFinancePriceAdapter
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _theme(info_type: str = "price") -> ThemeContext:
    return ThemeContext(theme_id="t1", theme_name="Test Theme", info_type=info_type)


def _source(adapter_key: str, config: dict) -> SourceContext:
    return SourceContext(
        source_id="s1",
        source_name="Test Source",
        source_type="api",
        adapter_key=adapter_key,
        config=config,
    )


# ─── SinaGoldPrice ───────────────────────────────────────────────────────────

class TestSinaGoldPriceMapToNormalizerInput:
    def setup_method(self):
        self.adapter = SinaGoldPriceAdapter()

    def test_parses_sina_hq_format(self):
        # Sina gold has >= 8 comma-separated fields
        payload_lines = (
            'var hq_str_hf_GC="3245.50,3250.00,3230.10,3260.00,3220.00,3240.00,3245.50,3246.00,2025-06-15,3245.50";\n'
            'var hq_str_hf_XAU="3240.00,3248.00,3225.00,3255.00,3215.00,3238.00,3240.00,3241.00,2025-06-15,3240.00";\n'
        )
        raw = RawFetchResult(
            payload=payload_lines,
            metadata={"symbols": ["hf_GC", "hf_XAU"]},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 2
        assert items[0]["price"] == 3245.50
        assert items[1]["price"] == 3240.00
        assert "hf_GC" in items[0]["title"]

    def test_empty_payload_raises(self):
        raw = RawFetchResult(payload="", metadata={"symbols": ["hf_GC"]})
        with pytest.raises(ValueError, match="no valid price items"):
            self.adapter.map_to_normalizer_input(raw)

    def test_zero_price_skipped(self):
        raw = RawFetchResult(
            payload='var hq_str_hf_GC="0.00,0,0,0,0,0,0,0,2025-01-01,0";\n',
            metadata={"symbols": ["hf_GC"]},
        )
        with pytest.raises(ValueError):
            self.adapter.map_to_normalizer_input(raw)


# ─── SinaStockPrice ──────────────────────────────────────────────────────────

class TestSinaStockPriceMapToNormalizerInput:
    def setup_method(self):
        self.adapter = SinaStockPriceAdapter()

    def test_parses_a_share_format(self):
        # Sina A-share requires >= 32 fields
        fields = ["茅台", "1700", "1710", "1728.52", "1735", "1695", "1728", "1729",
                   "100000", "1728000000"] + [""] * 20 + ["2026-06-15", "15:00:00"]
        raw = RawFetchResult(
            payload=f'var hq_str_sh600519="{",".join(fields)}";\n',
            metadata={"symbols": ["sh600519"]},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["price"] == 1728.52
        assert items[0]["currency"] == "CNY"

    def test_parses_hk_format(self):
        # HK requires >= 7 fields, symbol starts with rt_hk
        fields = ["TENCENT", "腾讯控股", "", "", "", "", "380.00",
                   "385", "378", "1000000", "380000000"] + [""] * 8 + ["15/06/2026", "16:08:00"]
        raw = RawFetchResult(
            payload=f'var hq_str_rt_hk00700="{",".join(fields)}";\n',
            metadata={"symbols": ["rt_hk00700"]},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["price"] == 380.00
        assert items[0]["currency"] == "HKD"


# ─── YahooFinancePrice ───────────────────────────────────────────────────────

class TestYahooFinancePriceMapToNormalizerInput:
    def setup_method(self):
        self.adapter = YahooFinancePriceAdapter()

    def test_parses_chart_response(self):
        raw = RawFetchResult(
            payload={
                "chart": {
                    "result": [{
                        "meta": {"symbol": "^GSPC", "shortName": "S&P 500"},
                        "timestamp": [1718419200, 1718505600],
                        "indicators": {
                            "quote": [{
                                "close": [5431.60, 5450.20],
                                "open": [5420.00, 5435.00],
                                "high": [5440.00, 5460.00],
                                "low": [5410.00, 5430.00],
                                "volume": [3000000000, 3200000000],
                            }],
                        },
                    }],
                },
            },
            metadata={"symbol": "^GSPC", "currency": "USD"},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 2
        assert items[0]["price"] == 5431.60
        assert items[0]["currency"] == "USD"
        assert items[1]["price"] == 5450.20

    def test_empty_chart_raises(self):
        raw = RawFetchResult(
            payload={"chart": {"result": []}},
            metadata={"symbol": "^GSPC", "currency": "USD"},
        )
        with pytest.raises(ValueError, match="no chart data"):
            self.adapter.map_to_normalizer_input(raw)


# ─── GithubReleases ──────────────────────────────────────────────────────────

class TestGithubReleasesMapToNormalizerInput:
    def setup_method(self):
        self.adapter = GithubReleasesAdapter()

    def test_parses_release_list(self):
        raw = RawFetchResult(
            payload=[
                {
                    "tag_name": "v3.5.0",
                    "name": "v3.5.0",
                    "body": "New features and improvements",
                    "published_at": "2026-06-10T12:00:00Z",
                    "html_url": "https://github.com/vuejs/core/releases/tag/v3.5.0",
                    "prerelease": False,
                },
                {
                    "tag_name": "v3.5.0-beta.1",
                    "name": "v3.5.0-beta.1",
                    "body": "Beta release",
                    "published_at": "2026-06-01T00:00:00Z",
                    "html_url": "https://github.com/vuejs/core/releases/tag/v3.5.0-beta.1",
                    "prerelease": True,
                },
            ],
            metadata={"owner": "vuejs", "repo": "core", "max_items": 10, "include_prerelease": False},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["version"] == "3.5.0"
        assert items[0]["is_prerelease"] is False

    def test_includes_prerelease_when_configured(self):
        raw = RawFetchResult(
            payload=[
                {"tag_name": "v1.0.0-beta", "name": "Beta", "body": "", "published_at": "2026-06-10T00:00:00Z", "html_url": "https://example.com", "prerelease": True},
            ],
            metadata={"owner": "test", "repo": "test", "max_items": 10, "include_prerelease": True},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["is_prerelease"] is True

    def test_empty_list_raises(self):
        raw = RawFetchResult(payload=[], metadata={"owner": "test", "repo": "test", "max_items": 10, "include_prerelease": False})
        with pytest.raises(ValueError, match="no releases"):
            self.adapter.map_to_normalizer_input(raw)


# ─── RssFeed ─────────────────────────────────────────────────────────────────

class TestRssFeedMapToNormalizerInput:
    def setup_method(self):
        self.adapter = RssFeedAdapter()

    def test_parses_rss_2(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Blog</title>
            <item>
              <title>First Post</title>
              <link>https://example.com/post1</link>
              <description>Summary of post 1</description>
              <pubDate>Sun, 15 Jun 2026 12:00:00 +0800</pubDate>
              <category>feature</category>
            </item>
            <item>
              <title>Second Post</title>
              <link>https://example.com/post2</link>
              <description>Summary of post 2</description>
            </item>
          </channel>
        </rss>"""
        raw = RawFetchResult(payload=xml, metadata={"url": "https://example.com/feed", "max_items": 10, "category": "news_announcement", "publisher": ""})
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 2
        assert items[0]["title"] == "First Post"
        assert items[0]["publisher"] == "Example Blog"

    def test_parses_atom_feed(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test Atom</title>
          <entry>
            <title>Atom Entry</title>
            <link href="https://example.com/atom1"/>
            <summary>Atom summary</summary>
            <published>2026-06-15T10:00:00Z</published>
          </entry>
        </feed>"""
        raw = RawFetchResult(payload=xml, metadata={"url": "https://example.com/feed", "max_items": 10, "category": "news_announcement", "publisher": ""})
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["title"] == "Atom Entry"

    def test_invalid_xml_raises(self):
        raw = RawFetchResult(payload="not xml at all", metadata={"url": "https://example.com", "max_items": 10, "category": "news_announcement", "publisher": ""})
        with pytest.raises(ValueError, match="failed to parse XML"):
            self.adapter.map_to_normalizer_input(raw)


# ─── PbcTreasuryYield ────────────────────────────────────────────────────────

class TestPbcTreasuryYieldMapToNormalizerInput:
    def setup_method(self):
        self.adapter = PbcTreasuryYieldAdapter()

    def test_parses_yield_curve(self):
        raw = RawFetchResult(
            payload={
                "records": [
                    {
                        "tradeDate": "2026-06-15",
                        "1": 1.50,
                        "2": 1.80,
                        "5": 2.30,
                        "10": 2.60,
                        "30": 3.10,
                    },
                ],
            },
            metadata={"max_items": 10},
        )
        items = self.adapter.map_to_normalizer_input(raw)
        assert len(items) == 1
        assert items[0]["yield_10y"] == 2.60
        assert items[0]["spread_10y_2y"] == pytest.approx(0.80)

    def test_empty_records_raises(self):
        raw = RawFetchResult(payload={"records": []}, metadata={"max_items": 10})
        with pytest.raises(ValueError, match="no yield curve data"):
            self.adapter.map_to_normalizer_input(raw)


# ─── Adapter config validation ───────────────────────────────────────────────

class TestAdapterConfigValidation:
    def test_sina_gold_requires_symbols(self):
        adapter = SinaGoldPriceAdapter()
        with pytest.raises(ValueError, match="requires config.symbols"):
            adapter.fetch(_theme(), _source("sina_gold_price", {}))

    def test_sina_stock_requires_symbols(self):
        adapter = SinaStockPriceAdapter()
        with pytest.raises(ValueError, match="requires config.symbols"):
            adapter.fetch(_theme(), _source("sina_stock_price", {}))

    def test_yahoo_requires_symbol(self):
        adapter = YahooFinancePriceAdapter()
        with pytest.raises(ValueError, match="requires config.symbol"):
            adapter.fetch(_theme(), _source("yahoo_finance_price", {}))

    def test_github_requires_owner_and_repo(self):
        adapter = GithubReleasesAdapter()
        with pytest.raises(ValueError, match="requires config.owner and config.repo"):
            adapter.fetch(_theme(), _source("github_releases", {}))

    def test_github_requires_repo(self):
        adapter = GithubReleasesAdapter()
        with pytest.raises(ValueError, match="requires config.owner and config.repo"):
            adapter.fetch(_theme(), _source("github_releases", {"owner": "vuejs"}))

    def test_rss_requires_url(self):
        adapter = RssFeedAdapter()
        with pytest.raises(ValueError, match="requires config.url"):
            adapter.fetch(_theme(), _source("rss_feed", {}))
