"""Yahoo Finance quote adapter for international stock indices and equities.

Fetches current price and recent history from the Yahoo Finance v8 chart API.
Supports any symbol recognized by Yahoo Finance (AAPL, ^GSPC, GC=F, CL=F, etc.).

Config keys:
    symbol: Yahoo Finance ticker symbol (required)
    interval: candle interval, default "1d" (optional)
    range: historical range, default "1mo" (optional)
    currency: display currency, default "USD" (optional)
    days: fallback range in days when range not set (default: 30)
"""
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

# Well-known symbol -> display name overrides
_DISPLAY_NAMES: Dict[str, str] = {
    "^GSPC": "S&P 500",
    "^DJI": "道琼斯工业平均",
    "^IXIC": "纳斯达克综合",
    "^HSI": "恒生指数",
    "^HSCEI": "国企指数",
    "^N225": "日经225",
    "^FTSE": "富时100",
    "^GDAXI": "德国DAX",
    "GC=F": "COMEX黄金期货",
    "SI=F": "COMEX白银期货",
    "CL=F": "WTI原油期货",
    "BZ=F": "布伦特原油期货",
    "^TNX": "美国10年期国债收益率",
}


class YahooFinancePriceAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        symbol = source.config.get("symbol")
        if not symbol:
            raise ValueError("yahoo_finance_price adapter requires config.symbol")

        interval = source.config.get("interval", "1d")
        range_param = source.config.get("range", "1mo")
        url = CHART_URL.format(symbol=symbol)
        params = {
            "interval": interval,
            "range": range_param,
            "includePrePost": "false",
        }

        with httpx.Client(
            timeout=20.0,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()

        return RawFetchResult(payload=payload, metadata={
            "symbol": symbol,
            "currency": source.config.get("currency", "USD"),
        })

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        symbol = str(raw_result.metadata.get("symbol", ""))
        currency = str(raw_result.metadata.get("currency", "USD"))
        fallback_at = now_cst()

        chart = (payload.get("chart") or {}).get("result")
        if not chart or not isinstance(chart, list):
            raise ValueError(f"yahoo_finance_price: no chart data for {symbol}")

        result_data = chart[0]
        meta = result_data.get("meta", {})
        display_name = _DISPLAY_NAMES.get(symbol, str(meta.get("shortName") or meta.get("symbol") or symbol))

        timestamps = result_data.get("timestamp", [])
        indicators = result_data.get("indicators", {})
        quote_list = indicators.get("quote", [])
        if not quote_list:
            raise ValueError(f"yahoo_finance_price: no quote data for {symbol}")

        quote = quote_list[0]
        closes = quote.get("close", [])
        opens = quote.get("open", [])
        highs = quote.get("high", [])
        lows = quote.get("low", [])
        volumes = quote.get("volume", [])

        items: List[Dict[str, Any]] = []
        for idx, ts in enumerate(timestamps):
            close_price = closes[idx] if idx < len(closes) else None
            if close_price is None:
                continue

            occurred_at = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(TZ_CST)
            occurred_at_str = occurred_at.strftime("%Y-%m-%dT%H:%M:%S+08:00")

            open_price = opens[idx] if idx < len(opens) and opens[idx] else None
            high_price = highs[idx] if idx < len(highs) and highs[idx] else None
            low_price = lows[idx] if idx < len(lows) and lows[idx] else None
            vol = volumes[idx] if idx < len(volumes) and volumes[idx] else None

            items.append({
                "title": f"{display_name} daily close",
                "price": round(float(close_price), 2),
                "currency": currency,
                "spec": symbol,
                "occurred_at": occurred_at_str,
                "url": f"https://finance.yahoo.com/quote/{symbol}",
                "symbol": symbol,
                "display_name": display_name,
                "open": round(float(open_price), 2) if open_price else None,
                "high": round(float(high_price), 2) if high_price else None,
                "low": round(float(low_price), 2) if low_price else None,
                "volume": int(vol) if vol else None,
            })

        if not items:
            raise ValueError(f"yahoo_finance_price returned no data for {symbol}")

        return items
