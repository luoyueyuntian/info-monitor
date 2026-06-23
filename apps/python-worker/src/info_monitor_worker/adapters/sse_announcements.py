"""SSE (Shanghai Stock Exchange) listed-company announcements adapter.

Uses the official SSE announcement query endpoint that powers the public
"最新公告" page, then normalizes the response into news_announcement items.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST, ensure_iso_with_tz
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

SSE_QUERY_URL = "https://query.sse.com.cn/security/stock/queryCompanyBulletinNew.do"
SSE_BASE_URL = "https://www.sse.com.cn"
SSE_REFERER = "https://www.sse.com.cn/disclosure/listedinfo/announcement/"


def _format_date(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


def _extract_jsonp_payload(payload: str) -> Dict[str, Any]:
    stripped = payload.strip()
    first_paren = stripped.find("(")
    last_paren = stripped.rfind(")")
    if first_paren == -1 or last_paren == -1 or last_paren <= first_paren:
        raise ValueError("sse_announcements returned invalid JSONP")

    return json.loads(stripped[first_paren + 1:last_paren])


class SseAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        page_size = int(source.config.get("page_size", source.config.get("max_items", 20)))
        page_no = int(source.config.get("page_no", 1))
        lookback_days = int(source.config.get("lookback_days", 2))
        start_date = str(source.config.get("start_date") or "").strip()
        end_date = str(source.config.get("end_date") or "").strip()

        if not end_date:
            end_date = _format_date(datetime.now(TZ_CST))
        if not start_date:
            start = datetime.now(TZ_CST) - timedelta(days=max(0, lookback_days - 1))
            start_date = _format_date(start)

        params = {
            "jsonCallBack": "jsonpCallback",
            "isPagination": "true",
            "pageHelp.pageSize": page_size,
            "pageHelp.pageNo": page_no,
            "pageHelp.cacheSize": 1,
            "START_DATE": start_date,
            "END_DATE": end_date,
            "SECURITY_CODE": str(source.config.get("security_code") or ""),
            "TITLE": str(source.config.get("title_keyword") or source.config.get("title") or ""),
            "BULLETIN_TYPE": str(source.config.get("bulletin_type") or ""),
            "stockType": str(source.config.get("stock_type") or ""),
        }
        headers = {
            "Referer": SSE_REFERER,
            "User-Agent": "Mozilla/5.0",
        }

        with httpx.Client(timeout=20.0, headers=headers) as client:
            response = client.get(SSE_QUERY_URL, params=params)
            response.raise_for_status()

        return RawFetchResult(
            payload=_extract_jsonp_payload(response.text),
            metadata={
                "page_size": page_size,
                "start_date": start_date,
                "end_date": end_date,
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        page_size = int(raw_result.metadata.get("page_size") or 20)
        rows = payload.get("pageHelp", {}).get("data") or payload.get("result") or []

        items: List[Dict[str, Any]] = []
        for row in rows:
            entry = row[0] if isinstance(row, list) and row else row
            if not isinstance(entry, dict):
                continue

            title = str(entry.get("TITLE") or "").strip()
            occurred_date = str(entry.get("SSEDATE") or "").strip()
            relative_url = str(entry.get("URL") or "").strip()
            security_code = str(entry.get("SECURITY_CODE") or "").strip()
            security_name = str(entry.get("SECURITY_NAME") or "").strip()
            bulletin_type = str(entry.get("BULLETIN_TYPE_DESC") or "").strip()

            if not title or not occurred_date or not relative_url:
                continue

            full_url = relative_url if relative_url.startswith("http") else f"{SSE_BASE_URL}{relative_url}"
            description_parts = [
                security_name or None,
                security_code or None,
                bulletin_type or None,
            ]
            description = " · ".join(part for part in description_parts if part)

            items.append(
                {
                    "title": title,
                    "occurred_at": ensure_iso_with_tz(occurred_date),
                    "url": full_url,
                    "publisher": "上海证券交易所",
                    "category": "exchange_announcement",
                    "release_topic": "listed_company_announcement",
                    "release_topic_label": "上交所公告",
                    "description": description or title,
                }
            )

            if len(items) >= page_size:
                break

        if not items:
            raise ValueError("sse_announcements returned no valid announcement items")

        return items
