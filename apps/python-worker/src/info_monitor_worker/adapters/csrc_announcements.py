"""CSRC (China Securities Regulatory Commission) announcements adapter.

Fetches official announcements from CSRC via their public API.
Supports regulatory announcements, market supervision notices, IPO approvals, etc.

Config keys:
    category: announcement category code (optional, default: all)
    max_items: max items to return (default: 10)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

# CSRC announcement API endpoint
LIST_URL = "https://www.csrc.gov.cn/csrc/c101928/common_list.shtml"

# Category mapping for richer context
_CATEGORY_LABELS: Dict[str, str] = {
    "101928": "证监会公告",
    "101930": "行政处罚决定",
    "101932": "行政监管措施",
    "101934": "市场禁入决定",
    "101936": "公开发行辅导",
    "101938": "发行审核",
}


class CsrcAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 10))

        # CSRC uses a simple HTML list page; scrape latest announcements
        response = get_http_client().get(LIST_URL)
        html = response.text

        return RawFetchResult(payload=html, metadata={"max_items": max_items, "list_url": LIST_URL})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        from bs4 import BeautifulSoup

        html = str(raw_result.payload)
        max_items = int(raw_result.metadata.get("max_items", 10))
        base_url = str(raw_result.metadata.get("list_url", LIST_URL))
        fallback_at = now_cst()

        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        # CSRC list page typically uses <li> with <a> and <span> for date
        for anchor in soup.select("a[href*='/csrc/']"):
            title = anchor.get("title") or anchor.get_text(strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 4:
                continue

            # Skip navigation links
            if "首页" in title or "更多" in title or "下一页" in title:
                continue

            parent = anchor.parent
            date_text = ""
            if parent:
                span = parent.find("span")
                if span:
                    date_text = span.get_text(strip=True)

            occurred_at = fallback_at
            if date_text and len(date_text) >= 8:
                try:
                    normalized = date_text.replace("/", "-")
                    if "T" not in normalized and len(normalized) >= 10:
                        occurred_at = f"{normalized[:10]}T00:00:00+08:00"
                    else:
                        occurred_at = f"{normalized}+08:00" if "+" not in normalized else normalized
                except Exception:
                    pass

            full_url = href if href.startswith("http") else f"https://www.csrc.gov.cn{href}"

            items.append({
                "title": title,
                "occurred_at": occurred_at,
                "url": full_url,
                "publisher": "中国证监会",
                "category": "financial_event",
                "event_class": "regulatory_announcement",
                "description": title,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("csrc_announcements returned no items")

        return items
