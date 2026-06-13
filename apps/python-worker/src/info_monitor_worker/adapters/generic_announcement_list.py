"""Generic announcement list adapter for JSON API product updates and announcements.

Works with any JSON API that returns a list of announcement/update items.
This is the JSON API counterpart to the HTML-based generic_content_update_list.

Config keys:
    url: API endpoint URL (required)
    items_field: dot notation path to the list of items (default: root is a list)
    title_field: field name for item title (required)
    time_field: field name for timestamp
    url_field: field name for item URL
    summary_field: field name for summary/description
    category_field: field name for update category/type
    object_name: fixed name of the product/object being monitored
    update_type: fixed update type (default: auto-detect from category_field)
    max_items: max items to process (default: 20)
    headers: optional dict of HTTP headers
"""

from __future__ import annotations

from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.field_utils import resolve_field as _resolve_field
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


# Map common category labels to standardized update_type values
_CATEGORY_MAP: Dict[str, str] = {
    "feature": "feature_release",
    "features": "feature_release",
    "功能": "feature_release",
    "新功能": "feature_release",
    "release": "feature_release",
    "update": "feature_release",
    "changelog": "feature_release",
    "marketing": "marketing",
    "促销": "marketing",
    "campaign": "marketing",
    "活动": "marketing",
    "announcement": "announcement",
    "公告": "announcement",
    "notice": "announcement",
    "通知": "announcement",
    "news": "announcement",
    "新闻": "announcement",
    "policy": "announcement",
    "政策": "announcement",
}


def _classify_update_type(raw_category: str | None, default: str) -> str:
    """Map a raw category string to a standardized update_type."""
    if not raw_category:
        return default

    normalized = raw_category.strip().lower()
    return _CATEGORY_MAP.get(normalized, default)


class GenericAnnouncementListAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        url = source.config.get("url")
        if not url:
            raise ValueError("generic_announcement_list adapter requires config.url")

        title_field = source.config.get("title_field", "title")
        if not title_field:
            raise ValueError("generic_announcement_list adapter requires config.title_field")

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
                "summary_field": str(source.config.get("summary_field") or ""),
                "category_field": str(source.config.get("category_field") or ""),
                "object_name": str(source.config.get("object_name") or theme.theme_name),
                "update_type": str(source.config.get("update_type") or "content_update"),
                "max_items": int(source.config.get("max_items", 20)),
                "base_url": str(url),
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        meta = raw_result.metadata

        items_field = str(meta.get("items_field") or "")
        title_field = str(meta.get("title_field") or "title")
        time_field = str(meta.get("time_field") or "")
        url_field = str(meta.get("url_field") or "")
        summary_field = str(meta.get("summary_field") or "")
        category_field = str(meta.get("category_field") or "")
        object_name = str(meta.get("object_name") or "")
        default_update_type = str(meta.get("update_type") or "content_update")
        max_items = int(meta.get("max_items") or 20)
        base_url = str(meta.get("base_url") or "")
        fallback_occurred_at = now_cst()

        # Resolve items list
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
                "object_name": object_name,
            }

            # Time
            if time_field:
                time_val = _resolve_field(item, time_field)
                if time_val is not None:
                    normalized["occurred_at"] = ensure_iso_with_tz(
                        str(time_val), fallback=fallback_occurred_at
                    )
                else:
                    normalized["occurred_at"] = fallback_occurred_at
            else:
                normalized["occurred_at"] = fallback_occurred_at

            # URL
            if url_field:
                item_url = _resolve_field(item, url_field)
                if item_url is not None:
                    normalized["url"] = str(item_url).strip()

            # Summary
            if summary_field:
                summary = _resolve_field(item, summary_field)
                if summary is not None:
                    normalized["summary"] = str(summary).strip()
                else:
                    normalized["summary"] = title
            else:
                normalized["summary"] = title

            # Update type classification
            if category_field:
                raw_category = _resolve_field(item, category_field)
                normalized["update_type"] = _classify_update_type(
                    str(raw_category) if raw_category is not None else None,
                    default_update_type,
                )
            else:
                normalized["update_type"] = default_update_type

            result.append(normalized)

            if len(result) >= max_items:
                break

        if not result:
            raise ValueError("generic_announcement_list returned no valid items")

        return result
