"""NDRC (National Development and Reform Commission) announcements adapter.

Fetches price and policy announcements from NDRC's public portal.
Covers commodity price guidance, energy pricing, regulatory notices.

Config keys:
    max_items: max items to return (default: 10)
"""
from __future__ import annotations

from typing import Any, Dict, List

from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import now_cst
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

# NDRC price monitoring center announcement list
PRICE_LIST_URL = "https://www.ndrc.gov.cn/xxgk/zcfb/tz/index.html"
# NDRC general policy announcements
POLICY_LIST_URL = "https://www.ndrc.gov.cn/xxgk/zcfb/ghwb/index.html"


class NdrcAnnouncementsAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 10))
        list_url = source.config.get("url", PRICE_LIST_URL)

        response = get_http_client().get(str(list_url))
        html = response.text

        return RawFetchResult(payload=html, metadata={"max_items": max_items, "list_url": list_url})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        max_items = int(raw_result.metadata.get("max_items", 10))
        base_url = str(raw_result.metadata.get("list_url", PRICE_LIST_URL))
        fallback_at = now_cst()

        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        for anchor in soup.select("a[href$='.html']"):
            title = anchor.get("title") or anchor.get_text(strip=True)
            href = anchor.get("href", "")

            if not title or len(title) < 4:
                continue

            if "首页" in title or "更多" in title or "下一页" in title:
                continue

            # Extract date from surrounding elements
            parent = anchor.parent
            date_text = ""
            if parent:
                date_el = parent.find("span") or parent.find("td")
                if date_el:
                    date_text = date_el.get_text(strip=True)

            occurred_at = fallback_at
            if date_text and len(date_text) >= 8:
                try:
                    normalized = date_text.replace("/", "-")
                    occurred_at = f"{normalized[:10]}T00:00:00+08:00"
                except Exception:
                    pass

            # Build full URL
            if href.startswith("http"):
                full_url = href
            elif href.startswith("/"):
                full_url = f"https://www.ndrc.gov.cn{href}"
            else:
                full_url = f"https://www.ndrc.gov.cn/xxgk/zcfb/tz/{href}"

            items.append({
                "title": title,
                "occurred_at": occurred_at,
                "url": full_url,
                "publisher": "国家发改委",
                "category": "financial_event",
                "event_class": "price_guidance",
                "description": title,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("ndrc_announcements returned no items")

        return items
