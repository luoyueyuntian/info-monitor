"""PBC China Government Bond Yield adapter.

Fetches treasury bond yield curve data from the China Foreign Exchange Trade System (CFETS),
which is the official source for China government bond yields published by PBC.

Config keys:
    max_items: max data points to return (default: 30)
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

# CFETS China Government Bond Yield API
YIELD_URL = "https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/SdsQryYldCurv"

# Standard tenor labels
_TENOR_MAP = {
    "0.0833": "1M",
    "0.25": "3M",
    "0.5": "6M",
    "1": "1Y",
    "2": "2Y",
    "3": "3Y",
    "5": "5Y",
    "7": "7Y",
    "10": "10Y",
    "15": "15Y",
    "20": "20Y",
    "30": "30Y",
}


class PbcTreasuryYieldAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 30))

        with httpx.Client(
            timeout=20.0,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            response = client.get(YIELD_URL, params={"lang": "CN"})
            response.raise_for_status()
            payload = response.json()

        return RawFetchResult(payload=payload, metadata={"max_items": max_items})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        max_items = int(raw_result.metadata.get("max_items", 30))
        fallback_at = now_cst()

        records = (payload.get("records") or [])
        if not records:
            # Try alternative payload structure
            data = payload.get("data", {})
            if isinstance(data, dict):
                records = data.get("records") or data.get("list") or []

        if not records:
            raise ValueError("pbc_treasury_yield: no yield curve data found")

        items: List[Dict[str, Any]] = []

        for record in records:
            if not isinstance(record, dict):
                continue

            trade_date = str(record.get("tradeDate") or record.get("date") or "")
            occurred_at = f"{trade_date}T15:00:00+08:00" if trade_date else fallback_at

            # Extract individual tenor yields
            yield_data: Dict[str, Any] = {}
            for field_key, tenor_label in _TENOR_MAP.items():
                raw_val = record.get(field_key)
                if raw_val is not None:
                    try:
                        yield_data[tenor_label] = float(raw_val)
                    except (ValueError, TypeError):
                        pass

            if not yield_data:
                # Try nested structure
                curve = record.get("curve") or record.get("yields") or {}
                if isinstance(curve, dict):
                    for key, val in curve.items():
                        try:
                            yield_data[str(key)] = float(val)
                        except (ValueError, TypeError):
                            pass

            if not yield_data:
                continue

            # Compute spread: 10Y - 2Y as a key indicator
            spread_10y_2y = None
            if "10Y" in yield_data and "2Y" in yield_data:
                spread_10y_2y = round(yield_data["10Y"] - yield_data["2Y"], 4)

            yield_10y = yield_data.get("10Y")

            items.append({
                "title": f"中国国债收益率曲线 ({trade_date})",
                "occurred_at": occurred_at,
                "url": "https://www.chinamoney.com.cn/chinese/bkccpr/",
                "publisher": "中国外汇交易中心",
                "category": "financial_event",
                "event_class": "yield_curve",
                "yields": yield_data,
                "spread_10y_2y": spread_10y_2y,
                "yield_10y": yield_10y,
                "description": self._format_summary(yield_data, spread_10y_2y, trade_date),
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("pbc_treasury_yield: no valid yield data extracted")

        return items

    def _format_summary(self, yields: Dict[str, float], spread: float | None, date: str) -> str:
        parts = [f"{date} 中国国债收益率"]
        if "10Y" in yields:
            parts.append(f"10年期: {yields['10Y']:.2f}%")
        if "2Y" in yields:
            parts.append(f"2年期: {yields['2Y']:.2f}%")
        if spread is not None:
            parts.append(f"10Y-2Y利差: {spread:.2f}bp")
        return "，".join(parts)
