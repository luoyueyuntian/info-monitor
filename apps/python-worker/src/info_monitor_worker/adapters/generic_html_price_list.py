from __future__ import annotations

import re
from typing import Any, Dict, List
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.generic_price_list import (
    _matches_keyword_policy,
    _normalize_keywords,
    _validate_price,
)
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

PRICE_PATTERN = re.compile(r"(\d[\d,]*\.?\d{0,2})")


def _extract_price(text: str) -> float | None:
    match = PRICE_PATTERN.search(text.replace("￥", "").replace("¥", ""))
    if not match:
        return None

    raw = match.group(1).replace(",", "")

    try:
        return float(raw)
    except ValueError:
        return None


def _parse_time_node(time_node: Any, fallback_occurred_at: str) -> str:
    if time_node is None:
        return fallback_occurred_at

    for attr_name in ("datetime", "title", "data-time", "data-date"):
        attr = time_node.get(attr_name) if getattr(time_node, "get", None) else None
        if attr and str(attr).strip():
            return ensure_iso_with_tz(str(attr).strip(), fallback=fallback_occurred_at)

    text = time_node.get_text(" ", strip=True)
    if text:
        return ensure_iso_with_tz(text, fallback=fallback_occurred_at)

    return fallback_occurred_at


class GenericHtmlPriceListAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        page_url = source.config.get("url")
        item_selector = source.config.get("item_selector")
        title_selector = source.config.get("title_selector")
        price_selector = source.config.get("price_selector")

        if not page_url:
            raise ValueError("generic_html_price_list adapter requires config.url")
        if not item_selector or not title_selector or not price_selector:
            raise ValueError(
                "generic_html_price_list adapter requires config.item_selector, config.title_selector, and config.price_selector"
            )

        headers: dict[str, str] = {}
        config_headers = source.config.get("headers")
        if isinstance(config_headers, dict):
            headers.update(config_headers)

        response = get_http_client().get(str(page_url), headers=headers or None)
        html = response.text

        return RawFetchResult(
            payload=html,
            metadata={
                "url": str(page_url),
                "theme_name": theme.theme_name,
                "item_selector": str(item_selector),
                "title_selector": str(title_selector),
                "price_selector": str(price_selector),
                "link_selector": str(source.config.get("link_selector") or title_selector),
                "time_selector": str(source.config.get("time_selector") or ""),
                "spec_selector": str(source.config.get("spec_selector") or ""),
                "currency": str(source.config.get("currency") or "CNY"),
                "max_items": int(source.config.get("max_items", 20)),
                "default_spec": str(source.config.get("default_spec") or ""),
                "include_title_keywords": _normalize_keywords(source.config.get("include_title_keywords")),
                "exclude_title_keywords": _normalize_keywords(source.config.get("exclude_title_keywords")),
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        meta = raw_result.metadata
        base_url = str(meta["url"])
        soup = BeautifulSoup(html, "html.parser")
        fallback_occurred_at = now_cst()

        item_selector = str(meta.get("item_selector") or "")
        title_selector = str(meta.get("title_selector") or "")
        price_selector = str(meta.get("price_selector") or "")
        link_selector = str(meta.get("link_selector") or title_selector)
        time_selector = str(meta.get("time_selector") or "")
        spec_selector = str(meta.get("spec_selector") or "")
        currency = str(meta.get("currency") or "CNY")
        max_items = int(meta.get("max_items") or 20)
        default_spec = str(meta.get("default_spec") or "")
        include_title_keywords = _normalize_keywords(meta.get("include_title_keywords"))
        exclude_title_keywords = _normalize_keywords(meta.get("exclude_title_keywords"))

        result: List[Dict[str, Any]] = []

        for item in soup.select(item_selector):
            title_node = item.select_one(title_selector)
            price_node = item.select_one(price_selector)
            link_node = item.select_one(link_selector) if link_selector else None
            time_node = item.select_one(time_selector) if time_selector else None
            spec_node = item.select_one(spec_selector) if spec_selector else None

            title = title_node.get_text(" ", strip=True) if title_node else item.get_text(" ", strip=True)
            price_text = price_node.get_text(" ", strip=True) if price_node else ""
            price = _extract_price(price_text)

            if not title or price is None:
                continue

            if not _matches_keyword_policy(title, include_title_keywords, exclude_title_keywords):
                continue

            is_valid, _ = _validate_price(price, title)
            if not is_valid:
                continue

            href = ""
            if link_node and getattr(link_node, "get", None):
                href = str(link_node.get("href") or "")

            normalized: Dict[str, Any] = {
                "title": title.strip(),
                "price": price,
                "currency": currency,
                "occurred_at": _parse_time_node(time_node, fallback_occurred_at),
                "url": urljoin(base_url, href) if href else base_url,
            }

            if spec_selector and spec_node:
                spec_text = spec_node.get_text(" ", strip=True)
                if spec_text:
                    normalized["spec"] = spec_text
            elif default_spec:
                normalized["spec"] = default_spec

            result.append(normalized)

            if len(result) >= max_items:
                break

        if not result:
            raise ValueError("generic_html_price_list returned no valid price items")

        return result
