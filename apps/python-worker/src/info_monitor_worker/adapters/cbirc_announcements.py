"""CBIRC (China Banking and Insurance Regulatory Commission) announcements adapter.

Fetches regulatory announcements from the CBIRC public site.

Config keys:
    max_items: max items to return (default: 10)
"""
from __future__ import annotations

from typing import Any, Dict, List

import httpx
from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

LIST_URL = "https://www.cbirc.gov.cn/cn/view/pages/ItemList.html?itemPId=923&itemId=4115"


class CbircAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 10))

        with httpx.Client(
            timeout=20.0,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            response = client.get(LIST_URL)
            response.raise_for_status()
            html = response.text

        return RawFetchResult(payload=html, metadata={"max_items": max_items, "list_url": LIST_URL})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        max_items = int(raw_result.metadata.get("max_items", 10))
        base_url = str(raw_result.metadata.get("list_url", LIST_URL))
        fallback_at = now_cst()

        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        # CBIRC typically uses <a> tags within list containers
        for anchor in soup.select("a[href*='/cn/view/pages/']"):
            title = anchor.get("title") or anchor.get_text(strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 4:
                continue

            if "首页" in title or "更多" in title:
                continue

            parent = anchor.parent
            date_text = ""
            if parent:
                date_span = parent.find("span") or parent.find("td", class_=lambda c: c and "date" in str(c).lower())
                if date_span:
                    date_text = date_span.get_text(strip=True)

            occurred_at = fallback_at
            if date_text and len(date_text) >= 8:
                try:
                    normalized = date_text.replace("/", "-")
                    occurred_at = f"{normalized[:10]}T00:00:00+08:00"
                except Exception:
                    pass

            full_url = href if href.startswith("http") else f"https://www.cbirc.gov.cn{href}"

            items.append({
                "title": title,
                "occurred_at": occurred_at,
                "url": full_url,
                "publisher": "银保监会",
                "category": "financial_event",
                "event_class": "regulatory_announcement",
                "description": title,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("cbirc_announcements returned no items")

        return items
