"""PBC China Government Bond Yield adapter.

Fetches treasury bond yield curve data from ChinaBond (中央国债登记结算公司),
which is the official settlement and registration institution for China government bonds.

Config keys:
    max_items: max data points to return (default: 30)
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

# ChinaBond yield curve page
YIELD_URL = "https://yield.chinabond.com.cn/cbweb-cbrc-web/cbrc/queryGjqxInfo"

_TENOR_LABELS = {
    "0": "即期",
    "0.08": "1M",
    "0.17": "2M",
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
    "50": "50Y",
}


class PbcTreasuryYieldAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        max_items = int(source.config.get("max_items", 30))

        headers = {
            "Accept": "text/html,application/xhtml+xml",
        }

        response = get_http_client().get(YIELD_URL, headers=headers, follow_redirects=True)
        html = response.text

        return RawFetchResult(payload=html, metadata={"max_items": max_items})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        max_items = int(raw_result.metadata.get("max_items", 30))
        fallback_at = now_cst()

        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        # Parse the yield curve table
        # ChinaBond page has a table with rows: tenor | yield
        tables = soup.find_all("table")
        if not tables:
            raise ValueError("pbc_treasury_yield: no table found on page")

        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            # Check if this looks like a yield curve table
            headers_row = rows[0].find_all(["th", "td"])
            header_text = " ".join(th.get_text(strip=True) for th in headers_row)
            if "期限" not in header_text and "收益率" not in header_text and "rate" not in header_text.lower():
                # Try next table
                if "年" not in header_text:
                    continue

            yield_data: Dict[str, float] = {}
            for row in rows[1:]:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue

                tenor_text = cells[0].get_text(strip=True)
                yield_text = cells[1].get_text(strip=True)

                # Parse tenor
                tenor_match = re.search(r"([\d.]+)", tenor_text)
                if not tenor_match:
                    continue

                tenor_years = tenor_match.group(1)
                label = _TENOR_LABELS.get(tenor_years, f"{tenor_years}Y")

                # Parse yield
                try:
                    yield_val = float(yield_text.replace("%", "").strip())
                    yield_data[label] = yield_val
                except (ValueError, TypeError):
                    continue

            if yield_data:
                # Compute spread
                spread_10y_2y = None
                if "10Y" in yield_data and "2Y" in yield_data:
                    spread_10y_2y = round(yield_data["10Y"] - yield_data["2Y"], 4)

                yield_10y = yield_data.get("10Y")

                items.append({
                    "title": f"中国国债收益率曲线",
                    "occurred_at": fallback_at,
                    "url": "https://yield.chinabond.com.cn/cbweb-cbrc-web/cbrc/queryGjqxInfo",
                    "publisher": "中央国债登记结算公司",
                    "category": "financial_event",
                    "event_class": "yield_curve",
                    "yields": yield_data,
                    "spread_10y_2y": spread_10y_2y,
                    "yield_10y": yield_10y,
                    "description": self._format_summary(yield_data, spread_10y_2y),
                })

                if len(items) >= max_items:
                    break

        if not items:
            raise ValueError("pbc_treasury_yield: no valid yield data extracted")

        return items

    def _format_summary(self, yields: Dict[str, float], spread: float | None) -> str:
        parts = ["中国国债收益率"]
        if "10Y" in yields:
            parts.append(f"10年期: {yields['10Y']:.2f}%")
        if "2Y" in yields:
            parts.append(f"2年期: {yields['2Y']:.2f}%")
        if spread is not None:
            parts.append(f"10Y-2Y利差: {spread:.2f}%")
        return "，".join(parts)
