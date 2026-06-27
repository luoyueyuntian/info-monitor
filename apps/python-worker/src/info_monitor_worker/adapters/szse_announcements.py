"""SZSE (Shenzhen Stock Exchange) listed-company announcements adapter.

Uses the official SZSE disclosure API exposed by the listed-company
announcement page and flattens grouped company announcement rows into
news_announcement items.
"""
from __future__ import annotations

from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

SZSE_QUERY_URL = "https://www.szse.cn/api/disc/announcement/detailinfo"
SZSE_BASE_URL = "https://www.szse.cn"
PLATE_CODE_MAP = {
    "all": "szse",
    "mainboard": "cdd",
    "gem": "nmk",
    "szse": "szse",
    "cdd": "cdd",
    "nmk": "nmk",
}


class SzseAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        page_size = int(source.config.get("page_size", source.config.get("max_items", 20)))
        page_num = int(source.config.get("page_num", 1))
        plate_code = str(source.config.get("plate_code") or "szse").strip().lower()
        plate_code = PLATE_CODE_MAP.get(plate_code, "szse")

        params = {
            "plateCode": plate_code,
            "pageSize": page_size,
            "pageNum": page_num,
        }
        headers = {
            "Referer": "https://www.szse.cn/disclosure/listed/notice/index.html",
        }

        response = get_http_client().get(SZSE_QUERY_URL, params=params, headers=headers)
        payload = response.json()

        return RawFetchResult(
            payload=payload,
            metadata={
                "page_size": page_size,
                "plate_code": plate_code,
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        page_size = int(raw_result.metadata.get("page_size") or 20)
        items: List[Dict[str, Any]] = []

        for company in payload.get("data") or []:
            if not isinstance(company, dict):
                continue

            sec_code = str(company.get("secCode") or "").strip()
            sec_name = str(company.get("secName") or "").strip()
            announcements = company.get("announList") or []

            for announcement in announcements:
                if not isinstance(announcement, dict):
                    continue

                title = str(announcement.get("title") or "").strip()
                attach_path = str(announcement.get("attachPath") or "").strip()
                publish_time = str(announcement.get("publishTime") or "").strip()
                category_label = str(announcement.get("bigCategoryName") or "").strip()

                if not title or not attach_path or not publish_time:
                    continue

                full_url = attach_path if attach_path.startswith("http") else f"{SZSE_BASE_URL}{attach_path}"
                description = " · ".join(
                    part for part in [sec_name or None, sec_code or None, category_label or None] if part
                )

                items.append(
                    {
                        "title": title,
                        "occurred_at": ensure_iso_with_tz(publish_time.replace(".0", "")),
                        "url": full_url,
                        "publisher": "深圳证券交易所",
                        "category": "exchange_announcement",
                        "release_topic": "listed_company_announcement",
                        "release_topic_label": "深交所公告",
                        "description": description or title,
                    }
                )

                if len(items) >= page_size:
                    break

            if len(items) >= page_size:
                break

        if not items:
            raise ValueError("szse_announcements returned no valid announcement items")

        return items
