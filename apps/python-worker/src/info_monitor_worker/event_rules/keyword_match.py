"""Keyword match event rule — detect announcements containing specific keywords."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class KeywordMatchResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class KeywordMatchRule(BaseEventRule):
    """Detect when an announcement contains specific keywords.

    Configuration options:
    - keywords: List of keywords to match (required)
    - match_type: 'any' or 'all' (default: 'any')
    - case_sensitive: Whether to match case-sensitively (default: false)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> KeywordMatchResult:
        config = config or {}
        keywords = config.get("keywords", [])
        match_type = config.get("match_type", "any")
        case_sensitive = config.get("case_sensitive", False)

        if not keywords:
            return KeywordMatchResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Get text to search
        title = normalized_record.title or ""
        summary = normalized_record.content.get("summary", "")
        description = normalized_record.content.get("description", "")
        search_text = f"{title} {summary} {description}"

        if not case_sensitive:
            search_text = search_text.lower()
            keywords = [k.lower() for k in keywords]

        # Find matched keywords
        matched_keywords = []
        for keyword in keywords:
            if keyword in search_text:
                matched_keywords.append(keyword)

        # Check if we have enough matches
        if match_type == "all":
            triggered = len(matched_keywords) == len(keywords)
        else:  # any
            triggered = len(matched_keywords) > 0

        if not triggered:
            return KeywordMatchResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Determine signal based on content
        # This is a simple heuristic - could be enhanced with NLP
        bullish_keywords = ["利好", "上涨", "增长", "突破", "新高", "bullish", "positive", "发布", "上线", "新增", "升级"]
        bearish_keywords = ["利空", "下跌", "下降", "破位", "新低", "bearish", "negative", "下线", "移除", "废弃", "停止"]

        bullish_count = sum(1 for k in matched_keywords if any(bk in k for bk in bullish_keywords))
        bearish_count = sum(1 for k in matched_keywords if any(bk in k for bk in bearish_keywords))

        if bullish_count > bearish_count:
            signal = "bullish"
            signal_text = "利好"
        elif bearish_count > bullish_count:
            signal = "bearish"
            signal_text = "利空"
        else:
            signal = "neutral"
            signal_text = "中性"

        return KeywordMatchResult(
            triggered=True,
            signal=signal,
            title=f"关键词命中: {', '.join(matched_keywords[:3])}",
            summary=f"检测到 {len(matched_keywords)} 个关键词命中，信号倾向: {signal_text}",
            evidence=[
                f"匹配关键词: {', '.join(matched_keywords)}",
                f"匹配模式: {'全部匹配' if match_type == 'all' else '任意匹配'}",
                f"信号倾向: {signal_text}",
                f"来源标题: {title}",
            ],
        )
