from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class EastmoneyStockKlineAdapter(BaseAdapter):
    BASE_URL = "https://push2his.eastmoney.com/api/qt/stock/kline/get"

    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        secid = source.config.get("secid")

        if not secid:
            raise ValueError("eastmoney_stock_kline adapter requires config.secid")

        days = int(source.config.get("days", 40))
        end_date = source.config.get("end")
        begin_date = source.config.get("beg")

        if not end_date:
            end_date = datetime.now(timezone.utc).strftime("%Y%m%d")

        if not begin_date:
            begin_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y%m%d")

        params = {
            "secid": secid,
            "fields1": "f1,f2,f3,f4,f5,f6",
            "fields2": "f51,f52,f53,f54,f55,f56,f57,f58",
            "klt": str(source.config.get("klt", 101)),
            "fqt": str(source.config.get("fqt", 1)),
            "beg": begin_date,
            "end": end_date,
        }

        response = get_http_client().get(self.BASE_URL, params=params)
        payload = response.json()

        return RawFetchResult(payload=payload, metadata={"params": params})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        data = payload.get("data")

        if not data or not data.get("klines"):
            raise ValueError("eastmoney_stock_kline returned no kline data")

        code = data.get("code", "")
        name = data.get("name", code)
        currency = "CNY"
        items: List[Dict[str, Any]] = []

        opens: List[float] = []
        closes: List[float] = []
        highs: List[float] = []
        lows: List[float] = []

        for line in data["klines"]:
            date_text, open_price, close_price, high_price, low_price, volume, amount, amplitude = line.split(",")
            opens.append(float(open_price))
            closes.append(float(close_price))
            highs.append(float(high_price))
            lows.append(float(low_price))

        # Build reverse-cumulative history lists for each snapshot
        for index, line in enumerate(data["klines"]):
            date_text, open_price, close_price, high_price, low_price, volume, amount, amplitude = line.split(",")

            items.append(
                {
                    "title": f"{name} daily close",
                    "occurred_at": f"{date_text}T15:00:00+08:00",
                    "price": float(close_price),
                    "currency": currency,
                    "spec": code,
                    "url": f"https://quote.eastmoney.com/{code}.html",
                    "open": float(open_price),
                    "high": float(high_price),
                    "low": float(low_price),
                    "volume": float(volume),
                    "amount": float(amount),
                    "amplitude": float(amplitude),
                    "symbol": code,
                    "display_name": name,
                    "close_prices": closes[: index + 1],
                    "high_prices": highs[: index + 1],
                    "low_prices": lows[: index + 1],
                }
            )

        return items
