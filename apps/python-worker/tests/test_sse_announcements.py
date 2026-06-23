"""Tests for the SSE announcements adapter."""
from __future__ import annotations

import pytest

from info_monitor_worker.adapters.sse_announcements import (
    SseAnnouncementsAdapter,
    _extract_jsonp_payload,
)
from info_monitor_worker.models import RawFetchResult


class TestExtractJsonpPayload:
    def test_extracts_wrapped_json(self):
        payload = 'jsonpCallback({"pageHelp":{"data":[]}})'
        result = _extract_jsonp_payload(payload)
        assert result["pageHelp"]["data"] == []

    def test_invalid_jsonp_raises(self):
        with pytest.raises(ValueError, match="invalid JSONP"):
            _extract_jsonp_payload('{"pageHelp":{"data":[]}}')


class TestSseAnnouncementsAdapterMapToNormalizerInput:
    def setup_method(self):
        self.adapter = SseAnnouncementsAdapter()

    def test_flattens_nested_result_rows(self):
        raw = RawFetchResult(
            payload={
                "pageHelp": {
                    "data": [
                        [
                            {
                                "TITLE": "广州白云国际机场股份有限公司关于召开2025年年度股东会的提示性公告",
                                "SSEDATE": "2026-06-18",
                                "URL": "/disclosure/listedinfo/announcement/c/new/2026-06-18/600004_20260618_9N2H.pdf",
                                "SECURITY_CODE": "600004",
                                "SECURITY_NAME": "白云机场",
                                "BULLETIN_TYPE_DESC": "股东会",
                            }
                        ],
                        [
                            {
                                "TITLE": "中国国贸2025年年度权益分派实施公告",
                                "SSEDATE": "2026-06-18",
                                "URL": "/disclosure/listedinfo/announcement/c/new/2026-06-18/600007_20260618_X48O.pdf",
                                "SECURITY_CODE": "600007",
                                "SECURITY_NAME": "中国国贸",
                                "BULLETIN_TYPE_DESC": "利润分配和资本公积金转增股本",
                            }
                        ],
                    ]
                }
            },
            metadata={"page_size": 5},
        )

        items = self.adapter.map_to_normalizer_input(raw)

        assert len(items) == 2
        assert items[0]["publisher"] == "上海证券交易所"
        assert items[0]["category"] == "exchange_announcement"
        assert items[0]["release_topic_label"] == "上交所公告"
        assert items[0]["url"].startswith("https://www.sse.com.cn/disclosure/")
        assert items[0]["occurred_at"] == "2026-06-18T00:00:00+08:00"
        assert "白云机场" in items[0]["description"]
        assert "600004" in items[0]["description"]

    def test_raises_when_no_valid_items(self):
        raw = RawFetchResult(payload={"pageHelp": {"data": []}}, metadata={"page_size": 5})

        with pytest.raises(ValueError, match="no valid announcement items"):
            self.adapter.map_to_normalizer_input(raw)
