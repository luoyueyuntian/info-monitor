from __future__ import annotations

from typing import Any, Dict, List
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST, ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


def _parse_time_node(time_node: Any, default_occurred_at: str, fallback_occurred_at: str) -> str:
    """Extract an ISO 8601 timestamp from a <time> element.

    Priority:
    1. ``datetime`` attribute (standard HTML, typically ISO 8601)
    2. ``title`` attribute (some pages put machine-readable dates there)
    3. Text content parsed via dateutil
    4. Config default or current time fallback
    """
    if time_node is None:
        return default_occurred_at or fallback_occurred_at

    # 1. datetime attribute — best case, already ISO
    attr = time_node.get("datetime")
    if attr and attr.strip():
        return ensure_iso_with_tz(attr.strip(), fallback=fallback_occurred_at)

    # 2. title attribute — sometimes used for machine-readable dates
    title_attr = time_node.get("title")
    if title_attr and title_attr.strip():
        return ensure_iso_with_tz(title_attr.strip(), fallback=fallback_occurred_at)

    # 3. Text content — try dateutil parse
    text = time_node.get_text(" ", strip=True)
    if text:
        return ensure_iso_with_tz(text, fallback=fallback_occurred_at)

    return default_occurred_at or fallback_occurred_at


class GenericContentUpdateListAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        page_url = source.config.get("url")
        item_selector = source.config.get("item_selector")
        title_selector = source.config.get("title_selector")
        time_selector = source.config.get("time_selector")

        if not page_url:
            raise ValueError("generic_content_update_list adapter requires config.url")
        if not item_selector or not title_selector:
            raise ValueError(
                "generic_content_update_list adapter requires config.item_selector and config.title_selector"
            )

        with httpx.Client(timeout=20.0, headers={"User-Agent": "info-monitor/0.0.1"}) as client:
            response = client.get(str(page_url))
            response.raise_for_status()
            html = response.text

        return RawFetchResult(
            payload=html,
            metadata={
                "url": str(page_url),
                "theme_name": theme.theme_name,
                "item_selector": str(item_selector),
                "title_selector": str(title_selector),
                "link_selector": str(source.config.get("link_selector") or title_selector),
                "time_selector": str(time_selector or ""),
                "default_occurred_at": str(source.config.get("default_occurred_at") or ""),
                "update_type": str(source.config.get("update_type") or "content_update"),
                "max_items": int(source.config.get("max_items", 10)),
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        base_url = str(raw_result.metadata["url"])
        theme_name = str(raw_result.metadata.get("theme_name", ""))
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        item_selector = str(raw_result.metadata.get("item_selector") or "")
        title_selector = str(raw_result.metadata.get("title_selector") or "")
        link_selector = str(raw_result.metadata.get("link_selector") or title_selector)
        time_selector = str(raw_result.metadata.get("time_selector") or "")
        default_occurred_at = str(raw_result.metadata.get("default_occurred_at") or "")
        update_type = str(raw_result.metadata.get("update_type") or "content_update")
        max_items = int(raw_result.metadata.get("max_items") or 10)
        fallback_occurred_at = now_cst()

        if not item_selector or not title_selector:
            raise ValueError("item_selector or title_selector missing in adapter metadata")

        for item in soup.select(item_selector):
            title_node = item.select_one(title_selector)
            link_node = item.select_one(link_selector) if link_selector else None
            time_node = item.select_one(time_selector) if time_selector else None

            title = title_node.get_text(" ", strip=True) if title_node else item.get_text(" ", strip=True)
            href = ""
            if link_node and getattr(link_node, "get", None):
                href = str(link_node.get("href") or "")

            occurred_at = _parse_time_node(time_node, default_occurred_at, fallback_occurred_at)

            if not title:
                continue

            items.append(
                {
                    "object_name": theme_name,
                    "title": title,
                    "occurred_at": occurred_at or "",
                    "url": urljoin(base_url, href) if href else base_url,
                    "update_type": update_type,
                    "summary": title,
                }
            )

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("generic_content_update_list returned no content items")

        return items
