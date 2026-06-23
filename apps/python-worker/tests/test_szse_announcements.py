"""Tests for the SZSE announcements adapter."""
from __future__ import annotations

import pytest

from info_monitor_worker.adapters.szse_announcements import SzseAnnouncementsAdapter
from info_monitor_worker.models import RawFetchResult


class TestSzseAnnouncementsAdapterMapToNormalizerInput:
    def setup_method(self):
        self.adapter = SzseAnnouncementsAdapter()

    def test_flattens_grouped_company_announcements(self):
        raw = RawFetchResult(
            payload={
                "data": [
                    {
                        "secCode": "300769",
                        "secName": "德方纳米",
                        "announList": [
                            {
                                "title": "德方纳米：关于召开2026年第三次临时股东会的通知",
                                "attachPath": "/disc/disk03/finalpage/2026-06-19/ed623b9e-826a-4dbe-ad3d-dfea783fd516.PDF",
                                "publishTime": "2026-06-19 00:00:00.0",
                                "bigCategoryName": "股东会",
                            },
                            {
                                "title": "德方纳米：第五届董事会第二次会议决议公告",
                                "attachPath": "/disc/disk03/finalpage/2026-06-19/cf9d72d0-5343-45ea-9753-7b75d9945b21.PDF",
                                "publishTime": "2026-06-19 00:00:00.0",
                                "bigCategoryName": "董事会公告",
                            },
                        ],
                    }
                ]
            },
            metadata={"page_size": 5, "plate_code": "szse"},
        )

        items = self.adapter.map_to_normalizer_input(raw)

        assert len(items) == 2
        assert items[0]["publisher"] == "深圳证券交易所"
        assert items[0]["category"] == "exchange_announcement"
        assert items[0]["release_topic_label"] == "深交所公告"
        assert items[0]["occurred_at"] == "2026-06-19T00:00:00+08:00"
        assert items[0]["url"].startswith("https://www.szse.cn/disc/")
        assert "300769" in items[0]["description"]
        assert "股东会" in items[0]["description"]

    def test_raises_when_no_valid_items(self):
        raw = RawFetchResult(payload={"data": []}, metadata={"page_size": 5, "plate_code": "szse"})

        with pytest.raises(ValueError, match="no valid announcement items"):
            self.adapter.map_to_normalizer_input(raw)
