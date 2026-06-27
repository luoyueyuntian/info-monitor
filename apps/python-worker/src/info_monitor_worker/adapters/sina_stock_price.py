"""Sina Finance A-share / HK stock real-time price adapter.

Fetches real-time stock prices from the Sina HQ API, the most widely used
free API for Chinese mainland and Hong Kong stock quotes.

Config keys:
    symbols: list of Sina stock symbols, e.g. ["sh600519", "sz000858", "rt_hk00700"] (required)
    currency: display currency (default: "CNY")
    max_items: max items to return (default: 20)
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.time_utils import TZ_CST, ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

QUOTE_URL = "https://hq.sinajs.cn"
_TZ_CST = timezone(timedelta(hours=8))
_LINE_RE = re.compile(r'var hq_str_(\w+)="(.*)";')


class SinaStockPriceAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        raw_symbols = source.config.get("symbols")
        if not raw_symbols:
            raise ValueError("sina_stock_price adapter requires config.symbols")
        # Accept both list and comma-separated string
        if isinstance(raw_symbols, str):
            symbols = [s.strip() for s in raw_symbols.split(",") if s.strip()]
        elif isinstance(raw_symbols, list):
            symbols = [str(s).strip() for s in raw_symbols if str(s).strip()]
        else:
            raise ValueError("sina_stock_price config.symbols must be a list or comma-separated string")

        symbol_str = ",".join(str(s) for s in symbols)
        url = f"{QUOTE_URL}?list={symbol_str}"

        response = get_http_client().get(url, headers={"Referer": "https://finance.sina.com.cn"})
        text = response.text

        return RawFetchResult(payload=text, metadata={"symbols": symbols})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        text = str(raw_result.payload)
        symbols: List[str] = raw_result.metadata.get("symbols", [])
        fallback_at = now_cst()
        items: List[Dict[str, Any]] = []

        for line in text.strip().splitlines():
            m = _LINE_RE.match(line.strip())
            if not m:
                continue

            symbol = m.group(1)
            raw = m.group(2)
            fields = raw.split(",")

            # A-share format: name, open, prev_close, current, high, low, bid, ask, volume, amount, ...
            # HK format: fields[0]=name_en, fields[1]=name_cn, fields[6]=current, ...
            is_hk = symbol.startswith("rt_hk")

            if is_hk:
                if len(fields) < 7:
                    continue
                display_name = fields[1] or fields[0]
                try:
                    current_price = float(fields[6])
                except (ValueError, IndexError):
                    continue
                date_text = fields[17] if len(fields) > 17 else ""
                time_text = fields[18] if len(fields) > 18 else ""
                occurred_at = (
                    ensure_iso_with_tz(f"{date_text} {time_text}".strip(), fallback=fallback_at)
                    if date_text and time_text
                    else fallback_at
                )
                currency = "HKD"
            else:
                if len(fields) < 32:
                    continue
                display_name = fields[0]
                try:
                    current_price = float(fields[3])
                except (ValueError, IndexError):
                    continue
                date_text = fields[30] if len(fields) > 30 else ""
                time_text = fields[31] if len(fields) > 31 else ""
                occurred_at = f"{date_text}T{time_text}+08:00" if date_text else fallback_at
                currency = "CNY"

            if current_price <= 0:
                continue

            region = "sh" if symbol.startswith("sh") else ("sz" if symbol.startswith("sz") else "hk")
            code = symbol.replace("sh", "").replace("sz", "").replace("rt_hk", "")

            items.append({
                "title": f"{display_name} ({code})",
                "price": current_price,
                "currency": currency,
                "spec": symbol,
                "occurred_at": occurred_at,
                "url": f"https://finance.sina.com.cn/realstock/company/{symbol}/nc.shtml" if not is_hk else f"https://finance.sina.com.cn/stock/hkstock/{code}/detail.html",
                "symbol": symbol,
                "display_name": display_name,
            })

        if not items:
            raise ValueError("sina_stock_price returned no valid price items")

        return items
