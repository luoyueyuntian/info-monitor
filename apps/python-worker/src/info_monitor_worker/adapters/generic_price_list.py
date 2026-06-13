"""Generic price list adapter for JSON API price sources.

Works with any JSON API that returns a list of price items. Field names
are configurable via source config, making this adapter reusable across
different second-hand marketplaces and price APIs.

Config keys:
    url: API endpoint URL (required)
    items_field: JSONPath-like dot notation to the list of items in the
        response (default: root is a list)
    title_field: field name for item title (required)
    price_field: field name for item price (required)
    spec_field: field name for specification/variant (e.g. "16G+512G")
    url_field: field name for item URL
    time_field: field name for timestamp
    currency: fixed currency code (default: "CNY")
    symbol_field: field name for symbol/ticker
    display_name_field: field name for display name
    max_items: max items to process (default: 20)
    default_spec: fallback spec value
    headers: optional dict of HTTP headers
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.field_utils import resolve_field as _resolve_field
from info_monitor_worker.adapters.time_utils import TZ_CST, ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class GenericPriceListAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        url = source.config.get("url")
        if not url:
            raise ValueError("generic_price_list adapter requires config.url")

        items_field = source.config.get("items_field", "")
        title_field = source.config.get("title_field", "title")
        price_field = source.config.get("price_field", "price")

        if not title_field or not price_field:
            raise ValueError(
                "generic_price_list adapter requires config.title_field and config.price_field"
            )

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
                "items_field": str(items_field),
                "title_field": str(title_field),
                "price_field": str(price_field),
                "spec_field": str(source.config.get("spec_field") or ""),
                "url_field": str(source.config.get("url_field") or ""),
                "time_field": str(source.config.get("time_field") or ""),
                "currency": str(source.config.get("currency") or "CNY"),
                "symbol_field": str(source.config.get("symbol_field") or ""),
                "display_name_field": str(source.config.get("display_name_field") or ""),
                "max_items": int(source.config.get("max_items", 20)),
                "default_spec": str(source.config.get("default_spec") or ""),
                "base_url": str(url),
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        meta = raw_result.metadata

        items_field = str(meta.get("items_field") or "")
        title_field = str(meta.get("title_field") or "title")
        price_field = str(meta.get("price_field") or "price")
        spec_field = str(meta.get("spec_field") or "")
        url_field = str(meta.get("url_field") or "")
        time_field = str(meta.get("time_field") or "")
        currency = str(meta.get("currency") or "CNY")
        symbol_field = str(meta.get("symbol_field") or "")
        display_name_field = str(meta.get("display_name_field") or "")
        max_items = int(meta.get("max_items") or 20)
        default_spec = str(meta.get("default_spec") or "")
        base_url = str(meta.get("base_url") or "")
        fallback_occurred_at = now_cst()

        # Resolve the items list
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
            price_raw = _resolve_field(item, price_field)

            if title is None or price_raw is None:
                continue

            try:
                price = float(price_raw)
            except (ValueError, TypeError):
                continue

            # Build the normalized item
            normalized: Dict[str, Any] = {
                "title": str(title).strip(),
                "price": price,
                "currency": currency,
            }

            # Optional fields
            if spec_field:
                spec = _resolve_field(item, spec_field)
                if spec is not None:
                    normalized["spec"] = str(spec).strip()
            elif default_spec:
                normalized["spec"] = default_spec

            if url_field:
                item_url = _resolve_field(item, url_field)
                if item_url is not None:
                    normalized["url"] = str(item_url).strip()

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

            if symbol_field:
                symbol = _resolve_field(item, symbol_field)
                if symbol is not None:
                    normalized["symbol"] = str(symbol).strip()

            if display_name_field:
                display_name = _resolve_field(item, display_name_field)
                if display_name is not None:
                    normalized["display_name"] = str(display_name).strip()

            if normalized["title"]:
                result.append(normalized)

            if len(result) >= max_items:
                break

        if not result:
            raise ValueError("generic_price_list returned no valid price items")

        return result
