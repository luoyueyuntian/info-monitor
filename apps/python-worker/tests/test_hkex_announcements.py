"""Tests for the HKEX announcements adapter."""
from __future__ import annotations

import pytest

from info_monitor_worker.adapters.hkex_announcements import (
    HkexAnnouncementsAdapter,
    _parse_release_time,
)
from info_monitor_worker.models import RawFetchResult


class TestParseReleaseTime:
    def test_parses_ddmmyyyy_datetime(self):
        assert _parse_release_time("18/06/2026 22:59") == "2026-06-18T22:59+08:00"


class TestHkexAnnouncementsAdapterMapToNormalizerInput:
    def setup_method(self):
        self.adapter = HkexAnnouncementsAdapter()

    def test_parses_server_rendered_result_table(self):
        html = """
        <table class="table table-mobile-list">
          <tbody>
            <tr>
              <td class="release-time">18/06/2026 22:59</td>
              <td class="stock-short-code">08320</td>
              <td class="stock-short-name">沛然環保</td>
              <td>
                <div class="headline">通函 - [其他]</div>
                <div class="doc-link">
                  <a href="/listedco/listconews/gem/2026/0618/2026061802313_c.pdf">致非登記持有人之通知信函連同申請表格</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        """
        raw = RawFetchResult(payload=html, metadata={"max_items": 20})

        items = self.adapter.map_to_normalizer_input(raw)

        assert len(items) == 1
        assert items[0]["publisher"] == "香港交易所"
        assert items[0]["category"] == "exchange_announcement"
        assert items[0]["release_topic_label"] == "港交所公告"
        assert items[0]["occurred_at"] == "2026-06-18T22:59+08:00"
        assert items[0]["url"] == "https://www.hkexnews.hk/listedco/listconews/gem/2026/0618/2026061802313_c.pdf"
        assert "08320" in items[0]["description"]

    def test_raises_when_no_valid_items(self):
        raw = RawFetchResult(payload="<table><tbody></tbody></table>", metadata={"max_items": 20})

        with pytest.raises(ValueError, match="no valid announcement items"):
            self.adapter.map_to_normalizer_input(raw)
