import pytest
from info_monitor_scheduler.service import _is_due

URL_ADAPTERS = ["generic_news_announcement_list", "generic_price_list", "generic_html_price_list", "generic_content_update_list", "generic_announcement_list", "rss_feed"]


@pytest.mark.parametrize("adapter", URL_ADAPTERS)
@pytest.mark.parametrize("url", [None, "", "   "])
def test_missing_url_is_not_automatically_queued(adapter, url):
    assert not _is_due({"adapter_key": adapter, "config": {"url": url}})


@pytest.mark.parametrize("adapter", URL_ADAPTERS)
def test_url_fix_restores_normal_scheduling_without_pause_changes(adapter):
    source = {"adapter_key": adapter, "config": {}, "is_paused": False}
    assert not _is_due(source)
    source["config"]["url"] = "https://example.test/feed"
    assert _is_due(source)
    assert source["is_paused"] is False


@pytest.mark.parametrize("adapter", ["sse_announcements", "szse_announcements", "hkex_announcements", "sina_stock_price"])
def test_dedicated_adapter_does_not_require_generic_url(adapter):
    assert _is_due({"adapter_key": adapter, "config": {}})
