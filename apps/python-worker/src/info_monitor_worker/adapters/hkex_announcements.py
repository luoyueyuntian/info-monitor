"""HKEXnews listed-company announcements adapter.

Uses the official HKEXnews title-search result page and parses the server-rendered
announcement table directly from the response HTML.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

import httpx
from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

HKEX_SEARCH_URL = "https://www1.hkexnews.hk/search/titlesearch.xhtml"
HKEX_BASE_URL = "https://www.hkexnews.hk"


def _format_hkex_date(value: datetime) -> str:
    return value.strftime("%Y%m%d")


def _parse_release_time(value: str) -> str:
    parsed = datetime.strptime(value.strip(), "%d/%m/%Y %H:%M")
    return parsed.replace(tzinfo=TZ_CST).isoformat(timespec="minutes")


class HkexAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 20))
        lookback_days = int(source.config.get("lookback_days", 2))
        start_date = str(source.config.get("start_date") or "").strip()
        end_date = str(source.config.get("end_date") or "").strip()

        if not end_date:
            end_date = _format_hkex_date(datetime.now(TZ_CST))
        if not start_date:
            start = datetime.now(TZ_CST) - timedelta(days=max(0, lookback_days - 1))
            start_date = _format_hkex_date(start)

        params = {
            "lang": str(source.config.get("lang") or "ZH"),
            "market": str(source.config.get("market") or "SEHK"),
            "searchType": str(source.config.get("search_type") or "rbAll"),
            "searchTypeInt": int(source.config.get("search_type_int", 0)),
            "category": int(source.config.get("category", 0)),
            "documentType": str(source.config.get("document_type") or "-2"),
            "t1code": str(source.config.get("t1code") or "-2"),
            "t2Gcode": str(source.config.get("t2gcode") or "-2"),
            "t2code": str(source.config.get("t2code") or "-2"),
            "stockId": str(source.config.get("stock_id") or "-1"),
            "from": start_date,
            "to": end_date,
        }
        title_keyword = str(source.config.get("title_keyword") or "").strip()
        if title_keyword:
            params["newsTitle"] = title_keyword

        headers = {
            "Referer": "https://www.hkexnews.hk/index_c.htm",
            "User-Agent": "Mozilla/5.0",
        }

        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            response = client.get(HKEX_SEARCH_URL, params=params)
            response.raise_for_status()

        return RawFetchResult(
            payload=response.text,
            metadata={
                "max_items": max_items,
                "start_date": start_date,
                "end_date": end_date,
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        max_items = int(raw_result.metadata.get("max_items") or 20)
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        for row in soup.select("table.table-mobile-list tbody tr"):
            cells = row.find_all("td")
            if len(cells) < 4:
                continue

            release_time = cells[0].get_text(" ", strip=True).replace("發放時間:", "").strip()
            stock_code = cells[1].get_text(" ", strip=True).replace("股份代號:", "").strip()
            stock_name = cells[2].get_text(" ", strip=True).replace("股份簡稱:", "").strip()
            headline = row.select_one(".headline")
            link = row.select_one(".doc-link a[href]")
            title = link.get_text(" ", strip=True) if link else ""

            if not release_time or not link or not title:
                continue

            relative_url = str(link.get("href") or "").strip()
            full_url = relative_url if relative_url.startswith("http") else f"{HKEX_BASE_URL}{relative_url}"
            category_text = headline.get_text(" ", strip=True) if headline else ""
            description = " · ".join(
                part for part in [stock_name or None, stock_code or None, category_text or None] if part
            )

            items.append(
                {
                    "title": title,
                    "occurred_at": _parse_release_time(release_time),
                    "url": full_url,
                    "publisher": "香港交易所",
                    "category": "exchange_announcement",
                    "release_topic": "listed_company_announcement",
                    "release_topic_label": "港交所公告",
                    "description": description or title,
                }
            )

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("hkex_announcements returned no valid announcement items")

        return items
