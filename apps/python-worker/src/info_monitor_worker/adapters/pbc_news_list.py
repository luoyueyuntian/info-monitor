from __future__ import annotations

from typing import Any, Dict, List
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class PbcNewsListAdapter(BaseAdapter):
    BASE_URL = "https://www.pbc.gov.cn"

    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        path = source.config.get("path")

        if not path:
            raise ValueError("pbc_news_list adapter requires config.path")

        url = urljoin(self.BASE_URL, str(path))

        with httpx.Client(timeout=20.0, headers={"User-Agent": "info-monitor/0.0.1"}) as client:
            response = client.get(url)
            response.raise_for_status()
            html = response.text

        return RawFetchResult(payload=html, metadata={"url": url})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        html = str(raw_result.payload)
        base_url = raw_result.metadata["url"]
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        for cell in soup.select("td[align='left']"):
            anchor = cell.find("a", href=True)
            date_span = cell.find("span", class_="hui12")

            if not anchor or not date_span:
                continue

            title = anchor.get("title") or anchor.get_text(strip=True)
            published_at = date_span.get_text(strip=True)

            if not title or not published_at:
                continue

            items.append(
                {
                    "title": title,
                    "occurred_at": f"{published_at}T00:00:00+08:00",
                    "url": urljoin(base_url, anchor["href"]),
                    "publisher": "中国人民银行",
                    "category": "news_announcement",
                }
            )

        if not items:
            raise ValueError("pbc_news_list returned no list items")

        return items
