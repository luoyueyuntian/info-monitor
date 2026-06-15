"""Generic news/announcement list adapter for JSON APIs.

Works with official release APIs, exchange announcement feeds, and proxy APIs
that return structured items. The output shape is tailored for the
`news_announcement` normalizer.
"""

from __future__ import annotations

from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.field_utils import resolve_field as _resolve_field
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class GenericNewsAnnouncementListAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        url = source.config.get("url")
        if not url:
            raise ValueError("generic_news_announcement_list adapter requires config.url")

        title_field = source.config.get("title_field", "title")
        if not title_field:
            raise ValueError("generic_news_announcement_list adapter requires config.title_field")

        headers = {"User-Agent": "info-monitor/0.0.1"}
        config_headers = source.config.get("headers")
        if isinstance(config_headers, dict):
            headers.update(config_headers)

        with httpx.Client(timeout=20.0, headers=headers) as client:
            response = client.get(str(url))
            response.raise_for_status()
            payload = response.json()

        return RawFetchResult(
            payload=payload,
            metadata={
                "url": str(url),
                "theme_name": theme.theme_name,
                "items_field": str(source.config.get("items_field") or ""),
                "title_field": str(title_field),
                "time_field": str(source.config.get("time_field") or ""),
                "url_field": str(source.config.get("url_field") or ""),
                "publisher": str(source.config.get("publisher") or ""),
                "publisher_field": str(source.config.get("publisher_field") or ""),
                "summary_field": str(source.config.get("summary_field") or ""),
                "category": str(source.config.get("category") or "news_announcement"),
                "category_field": str(source.config.get("category_field") or ""),
                "release_topic": str(source.config.get("release_topic") or ""),
                "release_topic_field": str(source.config.get("release_topic_field") or ""),
                "release_topic_label": str(source.config.get("release_topic_label") or ""),
                "release_topic_label_field": str(source.config.get("release_topic_label_field") or ""),
                "max_items": int(source.config.get("max_items", 20)),
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        meta = raw_result.metadata

        items_field = str(meta.get("items_field") or "")
        title_field = str(meta.get("title_field") or "title")
        time_field = str(meta.get("time_field") or "")
        url_field = str(meta.get("url_field") or "")
        publisher = str(meta.get("publisher") or "")
        publisher_field = str(meta.get("publisher_field") or "")
        summary_field = str(meta.get("summary_field") or "")
        default_category = str(meta.get("category") or "news_announcement")
        category_field = str(meta.get("category_field") or "")
        default_release_topic = str(meta.get("release_topic") or "")
        release_topic_field = str(meta.get("release_topic_field") or "")
        default_release_topic_label = str(meta.get("release_topic_label") or "")
        release_topic_label_field = str(meta.get("release_topic_label_field") or "")
        max_items = int(meta.get("max_items") or 20)
        fallback_occurred_at = now_cst()

        if items_field:
            raw_items = _resolve_field(payload, items_field)
        elif isinstance(payload, list):
            raw_items = payload
        else:
            raise ValueError(
                f"Cannot find items list. items_field='{items_field}' but payload is "
                f"{'a list' if isinstance(payload, list) else type(payload).__name__}"
            )

        if not isinstance(raw_items, list):
            raise ValueError(f"Resolved items is not a list: {type(raw_items).__name__}")

        result: List[Dict[str, Any]] = []

        for item in raw_items:
            if not isinstance(item, dict):
                continue

            title = _resolve_field(item, title_field)
            if title is None:
                continue

            title = str(title).strip()
            if not title:
                continue

            normalized: Dict[str, Any] = {
                "title": title,
                "publisher": publisher or None,
                "category": default_category,
                "release_topic": default_release_topic or None,
                "release_topic_label": default_release_topic_label or None,
            }

            if time_field:
                time_val = _resolve_field(item, time_field)
                normalized["occurred_at"] = ensure_iso_with_tz(
                    str(time_val) if time_val is not None else "",
                    fallback=fallback_occurred_at,
                )
            else:
                normalized["occurred_at"] = fallback_occurred_at

            if url_field:
                item_url = _resolve_field(item, url_field)
                if item_url is not None:
                    normalized["url"] = str(item_url).strip()

            if publisher_field:
                raw_publisher = _resolve_field(item, publisher_field)
                if raw_publisher is not None:
                    normalized["publisher"] = str(raw_publisher).strip()

            if summary_field:
                raw_summary = _resolve_field(item, summary_field)
                normalized["description"] = str(raw_summary).strip() if raw_summary is not None else title
            else:
                normalized["description"] = title

            if category_field:
                raw_category = _resolve_field(item, category_field)
                if raw_category is not None:
                    normalized["category"] = str(raw_category).strip()

            if release_topic_field:
                raw_topic = _resolve_field(item, release_topic_field)
                if raw_topic is not None:
                    normalized["release_topic"] = str(raw_topic).strip()

            if release_topic_label_field:
                raw_topic_label = _resolve_field(item, release_topic_label_field)
                if raw_topic_label is not None:
                    normalized["release_topic_label"] = str(raw_topic_label).strip()

            result.append(normalized)

            if len(result) >= max_items:
                break

        if not result:
            raise ValueError("generic_news_announcement_list returned no valid items")

        return result
