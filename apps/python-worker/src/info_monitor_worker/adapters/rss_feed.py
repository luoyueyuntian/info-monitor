"""RSS / Atom feed adapter.

Universal adapter for any RSS 2.0 or Atom feed. Covers blogs, news sites,
product update feeds, regulatory feeds, and more.

Config keys:
    url: feed URL (required)
    max_items: max items to return (default: 20)
    category: default category for items (default: "news_announcement")
    publisher: fixed publisher name (optional)
    publisher_field: extract publisher from feed metadata (default: "feed.title")
"""
from __future__ import annotations

from typing import Any, Dict, List

import httpx

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.time_utils import ensure_iso_with_tz, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class RssFeedAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        url = source.config.get("url")
        if not url:
            raise ValueError("rss_feed adapter requires config.url")

        max_items = int(source.config.get("max_items", 20))

        headers = {"User-Agent": "info-monitor/0.0.1"}
        config_headers = source.config.get("headers")
        if isinstance(config_headers, dict):
            headers.update(config_headers)

        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            response = client.get(str(url))
            response.raise_for_status()
            xml_text = response.text

        return RawFetchResult(payload=xml_text, metadata={
            "url": str(url),
            "max_items": max_items,
            "category": str(source.config.get("category") or "news_announcement"),
            "publisher": str(source.config.get("publisher") or ""),
        })

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        from xml.etree import ElementTree as ET

        xml_text = str(raw_result.payload)
        url = str(raw_result.metadata.get("url", ""))
        max_items = int(raw_result.metadata.get("max_items", 20))
        default_category = str(raw_result.metadata.get("category") or "news_announcement")
        fixed_publisher = str(raw_result.metadata.get("publisher") or "")
        fallback_at = now_cst()

        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as exc:
            raise ValueError(f"rss_feed: failed to parse XML from {url}: {exc}") from exc

        # Detect RSS vs Atom
        ns: Dict[str, str] = {}
        tag = root.tag.lower()
        if "feed" in tag or "atom" in root.tag:
            ns["atom"] = root.tag.split("}")[0].lstrip("{") if "}" in root.tag else ""
            return self._parse_atom(root, ns, url, max_items, default_category, fixed_publisher, fallback_at)
        else:
            return self._parse_rss(root, url, max_items, default_category, fixed_publisher, fallback_at)

    def _parse_rss(
        self, root: Any, url: str, max_items: int,
        default_category: str, fixed_publisher: str, fallback_at: str,
    ) -> List[Dict[str, Any]]:
        from xml.etree import ElementTree as ET

        channel = root.find("channel")
        if channel is None:
            raise ValueError("rss_feed: no <channel> found in RSS feed")

        feed_title = (channel.findtext("title") or "").strip()
        publisher = fixed_publisher or feed_title
        items: List[Dict[str, Any]] = []

        for item_el in channel.findall("item"):
            title = (item_el.findtext("title") or "").strip()
            link = (item_el.findtext("link") or "").strip()
            description = (item_el.findtext("description") or "").strip()
            pub_date = (item_el.findtext("pubDate") or "").strip()

            if not title:
                continue

            occurred_at = ensure_iso_with_tz(pub_date, fallback=fallback_at) if pub_date else fallback_at

            # Try to extract category from <category> elements
            categories = [c.text.strip() for c in item_el.findall("category") if c.text]
            category = categories[0] if categories else default_category

            items.append({
                "title": title,
                "occurred_at": occurred_at,
                "url": link or url,
                "publisher": publisher,
                "category": category,
                "description": description[:500] if description else title,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("rss_feed: no items found in RSS feed")

        return items

    def _parse_atom(
        self, root: Any, ns: Dict[str, str], url: str, max_items: int,
        default_category: str, fixed_publisher: str, fallback_at: str,
    ) -> List[Dict[str, Any]]:
        atom_ns = ns.get("atom", "")
        ns_map = {"atom": atom_ns} if atom_ns else {}

        # Get feed title
        feed_title_el = root.find("atom:title", ns_map) if atom_ns else root.find("title")
        feed_title = (feed_title_el.text or "").strip() if feed_title_el is not None else ""
        publisher = fixed_publisher or feed_title

        entry_tag = f"{{{atom_ns}}}entry" if atom_ns else "entry"
        items: List[Dict[str, Any]] = []

        for entry in root.findall(entry_tag, ns_map):
            title_el = entry.find(f"{{{atom_ns}}}title", ns_map) if atom_ns else entry.find("title")
            title = (title_el.text or "").strip() if title_el is not None else ""

            link = ""
            link_el = entry.find(f"{{{atom_ns}}}link", ns_map) if atom_ns else entry.find("link")
            if link_el is not None:
                link = link_el.get("href", "")

            summary_el = entry.find(f"{{{atom_ns}}}summary", ns_map) if atom_ns else entry.find("summary")
            summary = (summary_el.text or "").strip() if summary_el is not None else ""

            updated_el = entry.find(f"{{{atom_ns}}}updated", ns_map) if atom_ns else entry.find("updated")
            published_el = entry.find(f"{{{atom_ns}}}published", ns_map) if atom_ns else entry.find("published")

            time_text = ""
            if published_el is not None and published_el.text:
                time_text = published_el.text.strip()
            elif updated_el is not None and updated_el.text:
                time_text = updated_el.text.strip()

            occurred_at = ensure_iso_with_tz(time_text, fallback=fallback_at) if time_text else fallback_at

            if not title:
                continue

            items.append({
                "title": title,
                "occurred_at": occurred_at,
                "url": link or url,
                "publisher": publisher,
                "category": default_category,
                "description": summary[:500] if summary else title,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError("rss_feed: no entries found in Atom feed")

        return items
