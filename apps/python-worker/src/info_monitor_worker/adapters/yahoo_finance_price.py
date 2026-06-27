"""International stock/indices price adapter.

Fetches international stock and index quotes from Sina Finance's global stock API.
This replaces Yahoo Finance which blocks non-browser requests.

Sina global stock field format (gb_*):
  [0] name, [1] price, [2] change%, [3] datetime, [4] change_amount,
  [5] open, [6] high, [7] low, [8] 52w_high, [9] 52w_low,
  [10] volume, [11] amount, ..., [26] prev_close

Config keys:
    symbol: Sina Finance global quote symbol or Yahoo symbol (auto-mapped) (required)
    currency: display currency (auto-detected if omitted)
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

QUOTE_URL = "https://hq.sinajs.cn"
_TZ_CST = timezone(timedelta(hours=8))
_LINE_RE = re.compile(r'var hq_str_(\w+)="(.*)";')

_YAHOO_TO_SINA: Dict[str, str] = {
    "^GSPC": "gb_inx",
    "^DJI": "gb_dji",
    "^IXIC": "gb_ixic",
    "^NDX": "gb_ndx",
    "^FTSE": "gb_ftse",
    "^GDAXI": "gb_dax",
    "^N225": "gb_nikkei",
    "^HSI": "rt_hkHSI",
    "^HSCEI": "rt_hkHSCEI",
    "^AXJO": "gb_aord",
}

_DISPLAY_NAMES: Dict[str, str] = {
    "gb_inx": "S&P 500",
    "gb_dji": "道琼斯工业平均",
    "gb_ixic": "纳斯达克综合",
    "gb_ndx": "纳斯达克100",
    "gb_ftse": "富时100",
    "gb_dax": "德国DAX",
    "gb_nikkei": "日经225",
    "gb_aord": "澳大利亚标普200",
    "rt_hkHSI": "恒生指数",
    "rt_hkHSCEI": "国企指数",
    # Yahoo symbol fallbacks
    "^GSPC": "S&P 500",
    "^DJI": "道琼斯工业平均",
    "^IXIC": "纳斯达克综合",
    "^NDX": "纳斯达克100",
    "^FTSE": "富时100",
    "^GDAXI": "德国DAX",
    "^N225": "日经225",
}

_CURRENCY_MAP: Dict[str, str] = {
    "gb_inx": "USD", "gb_dji": "USD", "gb_ixic": "USD", "gb_ndx": "USD",
    "gb_ftse": "GBP", "gb_dax": "EUR", "gb_nikkei": "JPY",
    "gb_aord": "AUD", "rt_hkHSI": "HKD", "rt_hkHSCEI": "HKD",
}


class YahooFinancePriceAdapter(BaseAdapter):
    """Adapter for international stock/indices via Sina Finance API."""

    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        symbol = source.config.get("symbol")
        if not symbol:
            raise ValueError("yahoo_finance_price adapter requires config.symbol")

        sina_symbol = _YAHOO_TO_SINA.get(str(symbol), str(symbol))
        url = f"{QUOTE_URL}?list={sina_symbol}"

        response = get_http_client().get(url, headers={"Referer": "https://finance.sina.com.cn"})
        text = response.text

        return RawFetchResult(payload=text, metadata={
            "symbol": sina_symbol,
            "currency": source.config.get("currency") or _CURRENCY_MAP.get(sina_symbol, "USD"),
        })

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        text = str(raw_result.payload)
        symbol = str(raw_result.metadata.get("symbol", ""))
        currency = str(raw_result.metadata.get("currency", "USD"))
        fallback_at = now_cst()

        m = _LINE_RE.match(text.strip())
        if not m or not m.group(2).strip():
            raise ValueError(f"yahoo_finance_price: no data for {symbol}")

        fields = m.group(2).split(",")
        # Sina global: [0]=name, [1]=price, [2]=change%, [3]=datetime, ...
        if len(fields) < 4:
            raise ValueError(f"yahoo_finance_price: insufficient fields for {symbol}")

        display_name = _DISPLAY_NAMES.get(symbol, fields[0] or symbol)

        try:
            current_price = float(fields[1])
        except (ValueError, IndexError):
            raise ValueError(f"yahoo_finance_price: cannot parse price for {symbol}")

        if current_price <= 0:
            raise ValueError(f"yahoo_finance_price: invalid price {current_price} for {symbol}")

        # Date is at [3]: "2026-06-16 04:40:24"
        datetime_text = fields[3].strip() if len(fields) > 3 else ""
        occurred_at = fallback_at
        if datetime_text and len(datetime_text) >= 10:
            occurred_at = datetime_text.replace(" ", "T") + "+08:00"

        try:
            change_pct = float(fields[2]) if len(fields) > 2 and fields[2].strip() else None
        except ValueError:
            change_pct = None

        try:
            open_price = float(fields[5]) if len(fields) > 5 and fields[5].strip() else None
        except ValueError:
            open_price = None

        try:
            high_price = float(fields[6]) if len(fields) > 6 and fields[6].strip() else None
        except ValueError:
            high_price = None

        try:
            low_price = float(fields[7]) if len(fields) > 7 and fields[7].strip() else None
        except ValueError:
            low_price = None

        try:
            volume = int(float(fields[10])) if len(fields) > 10 and fields[10].strip() else None
        except (ValueError, TypeError):
            volume = None

        items: List[Dict[str, Any]] = [{
            "title": f"{display_name} ({symbol})",
            "price": round(current_price, 2),
            "currency": currency,
            "spec": symbol,
            "occurred_at": occurred_at,
            "url": f"https://finance.sina.com.cn/stock/usstock/{symbol}.shtml",
            "symbol": symbol,
            "display_name": display_name,
            "open": round(open_price, 2) if open_price else None,
            "high": round(high_price, 2) if high_price else None,
            "low": round(low_price, 2) if low_price else None,
            "volume": volume,
            "change_percent": change_pct,
        }]

        return items
