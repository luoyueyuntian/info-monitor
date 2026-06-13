from __future__ import annotations

from typing import Any, Dict, List
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import normalize_pub_date
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


def classify_release_topic(title: str) -> tuple[str, str]:
    if "采购经理指数" in title or "PMI" in title:
        return ("pmi", "采购经理指数")

    if "国民经济" in title:
        return ("macro_overview", "国民经济运行")

    if "消费价格" in title or "CPI" in title or "PPI" in title or "生产资料市场价格" in title:
        return ("prices", "价格指标")

    if "工业增加值" in title:
        return ("industrial_output", "工业增加值")

    if "工业企业利润" in title:
        return ("industrial_profit", "工业企业利润")

    if "固定资产投资" in title or "投资" in title:
        return ("investment", "固定资产投资")

    if "人口" in title or "就业" in title:
        return ("population_employment", "人口与就业")

    return ("general_release", "数据发布")


class StatsDataReleaseListAdapter(BaseAdapter):
    BASE_URL = "https://www.stats.gov.cn"

    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        path = source.config.get("path")

        if not path:
            raise ValueError("stats_data_release_list adapter requires config.path")

        list_url = urljoin(self.BASE_URL, str(path))
        max_items = int(source.config.get("max_items", 8))

        with httpx.Client(timeout=20.0, headers={"User-Agent": "info-monitor/0.0.1"}) as client:
            list_response = client.get(list_url)
            list_response.raise_for_status()

            links = self._extract_links(list_response.text, list_url, max_items=max_items)
            items = []

            for link in links:
                detail_response = client.get(link["url"])
                detail_response.raise_for_status()
                items.append(self._extract_detail(detail_response.text, link["url"]))

        return RawFetchResult(payload=items, metadata={"list_url": list_url})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        return raw_result.payload

    def _extract_links(self, html: str, base_url: str, max_items: int) -> List[Dict[str, str]]:
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, str]] = []
        seen_urls: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            title = anchor.get("title") or anchor.get_text(strip=True)
            href = anchor["href"]

            if not title or len(title) < 6:
                continue

            url = urljoin(base_url, href)

            if "/sj/zxfb/" not in url:
                continue

            if url in seen_urls:
                continue

            seen_urls.add(url)
            items.append({"title": title, "url": url})

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("No statistics release links found")

        return items

    def _extract_detail(self, html: str, detail_url: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        meta = {tag.get("name"): tag.get("content", "") for tag in soup.find_all("meta") if tag.get("name")}

        title = meta.get("ArticleTitle", "").strip()
        pub_date = meta.get("PubDate", "").strip()
        description = meta.get("Description", "").strip()

        if not title or not pub_date:
            raise ValueError(f"Missing title or pub date for detail page: {detail_url}")

        occurred_at = normalize_pub_date(pub_date)

        release_topic, release_topic_label = classify_release_topic(title)

        return {
            "title": title,
            "occurred_at": occurred_at,
            "url": detail_url,
            "publisher": "国家统计局",
            "category": "macro_release",
            "release_topic": release_topic,
            "release_topic_label": release_topic_label,
            "description": description,
        }
