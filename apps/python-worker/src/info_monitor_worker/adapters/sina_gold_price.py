"""Sina Finance gold / precious metal real-time quote adapter.

Fetches real-time prices from the Sina HQ JavaScript API.
Supports international spot gold (hf_XAU), COMEX gold futures (hf_GC),
spot silver (hf_XAG), and other Sina-quoted precious metals.

Config keys:
    symbols: list of Sina symbols, e.g. ["hf_GC", "hf_XAU"] (required)
    currency: display currency, default "USD" (optional)
    max_items: max items to return (default: 10)
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

QUOTE_URL = "https://hq.sinajs.cn"

# Map Sina symbol prefix to human-readable name
_SYMBOL_NAMES: Dict[str, str] = {
    "hf_GC": "COMEX黄金",
    "hf_SI": "COMEX白银",
    "hf_HG": "COMEX铜",
    "hf_CL": "WTI原油",
    "hf_XAU": "现货黄金XAU",
    "hf_XAG": "现货白银XAG",
    "hf_XPT": "现货铂金XPT",
    "hf_XPD": "现货钯金XPD",
}

_TZ_CST = timezone(timedelta(hours=8))

_LINE_RE = re.compile(r'var hq_str_(\w+)="(.*)";')


class SinaGoldPriceAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        raw_symbols = source.config.get("symbols")
        if not raw_symbols:
            raise ValueError("sina_gold_price adapter requires config.symbols")
        # Accept both list and comma-separated string
        if isinstance(raw_symbols, str):
            symbols = [s.strip() for s in raw_symbols.split(",") if s.strip()]
        elif isinstance(raw_symbols, list):
            symbols = [str(s).strip() for s in raw_symbols if str(s).strip()]
        else:
            raise ValueError("sina_gold_price config.symbols must be a list or comma-separated string")

        symbol_str = ",".join(str(s) for s in symbols)
        url = f"{QUOTE_URL}?list={symbol_str}"

        with httpx.Client(
            timeout=15.0,
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn"},
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            text = response.text

        return RawFetchResult(payload=text, metadata={"symbols": symbols})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        text = str(raw_result.payload)
        symbols: List[str] = raw_result.metadata.get("symbols", [])
        currency = raw_result.metadata.get("currency", "USD")
        fallback_at = now_cst()
        items: List[Dict[str, Any]] = []

        for line in text.strip().splitlines():
            m = _LINE_RE.match(line.strip())
            if not m:
                continue

            symbol = m.group(1)
            fields = m.group(2).split(",")

            if len(fields) < 8:
                continue

            try:
                current_price = float(fields[0])
            except (ValueError, IndexError):
                continue

            if current_price <= 0:
                continue

            name = _SYMBOL_NAMES.get(symbol, symbol)
            display_name = f"{name} ({symbol})"

            # Try to extract date from the last field(s)
            occurred_at = fallback_at
            for candidate in reversed(fields[-3:]):
                candidate = candidate.strip()
                if re.match(r"\d{4}-\d{2}-\d{2}", candidate):
                    occurred_at = f"{candidate}T15:00:00+08:00"
                    break

            try:
                high = float(fields[3]) if len(fields) > 3 and fields[3] else None
            except ValueError:
                high = None
            try:
                low = float(fields[4]) if len(fields) > 4 and fields[4] else None
            except ValueError:
                low = None

            items.append({
                "title": display_name,
                "price": current_price,
                "currency": currency,
                "spec": symbol,
                "occurred_at": occurred_at,
                "url": f"https://finance.sina.com.cn/futures/quotes/{symbol}.shtml",
                "symbol": symbol,
                "display_name": name,
                "high": high,
                "low": low,
            })

        if not items:
            raise ValueError("sina_gold_price returned no valid price items")

        return items
