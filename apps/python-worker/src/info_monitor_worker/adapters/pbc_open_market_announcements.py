from __future__ import annotations

import re
from typing import Any, Dict, List
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class PbcOpenMarketAnnouncementsAdapter(BaseAdapter):
    BASE_URL = "https://www.pbc.gov.cn"

    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        path = source.config.get("path")

        if not path:
            raise ValueError("pbc_open_market_announcements adapter requires config.path")

        list_url = urljoin(self.BASE_URL, str(path))
        max_items = int(source.config.get("max_items", 5))

        client = get_http_client()
        list_response = client.get(list_url)

        links = self._extract_links(list_response.text, list_url, max_items=max_items)
        items = []

        for link in links:
            detail_response = client.get(link["url"])
            items.append(self._extract_detail(detail_response.text, link["url"]))

        return RawFetchResult(payload=items, metadata={"list_url": list_url})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        return raw_result.payload

    def _extract_links(self, html: str, base_url: str, max_items: int) -> List[Dict[str, str]]:
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, str]] = []

        for anchor in soup.find_all("a", href=True):
            title = anchor.get("title") or anchor.get_text(strip=True)

            if "公开市场业务交易公告" not in title or "第" not in title:
                continue

            url = urljoin(base_url, anchor["href"])
            items.append({"title": title, "url": url})

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("No open market announcement links found")

        return items

    def _extract_detail(self, html: str, detail_url: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        meta = {tag.get("name"): tag.get("content", "") for tag in soup.find_all("meta") if tag.get("name")}

        title = meta.get("ArticleTitle", "").strip()
        pub_date = meta.get("PubDate", "").strip()
        description = meta.get("Description", "").strip()

        if not title or not pub_date:
            raise ValueError(f"Missing title or pub date for detail page: {detail_url}")

        amount_match = re.search(r"开展了(\d+(?:\.\d+)?)亿元", description)
        term_match = re.search(r"(\d+)天期", description)
        rate_match = re.search(r"(\d+(?:\.\d+)?)%", description)
        method_match = re.search(r"以([^，。]+?)方式开展", description)
        type_match = re.search(r"(逆回购|正回购|国库现金定存|央行票据|央票|MLF|SLF|SLO)", description)
        no_match = re.search(r"\[(\d{4})]第(\d+)号", title)

        announcement_no = None
        if no_match:
            announcement_no = f"[{no_match.group(1)}]第{no_match.group(2)}号"

        return {
            "title": title,
            "occurred_at": f"{pub_date}T00:00:00+08:00",
            "url": detail_url,
            "publisher": "中国人民银行",
            "category": "financial_event",
            "event_class": "open_market_operation",
            "announcement_no": announcement_no,
            "operation_type": type_match.group(1) if type_match else None,
            "amount_billion_cny": float(amount_match.group(1)) if amount_match else None,
            "term_days": int(term_match.group(1)) if term_match else None,
            "rate_percent": float(rate_match.group(1)) if rate_match else None,
            "bidding_method": method_match.group(1) if method_match else None,
            "description": description,
        }
