"""Test fixtures for event rules and detectors.

This module provides reusable test data for writing regression tests
against new or existing event rules and detectors.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


@dataclass
class MockNormalizedRecord:
    """Mock normalized record for testing event rules."""

    id: str = "record-test-001"
    source_run_id: str = "run-test-001"
    theme_id: str = "theme-test-001"
    source_id: str = "source-test-001"
    info_type: str = "price"
    occurred_at: str = "2026-06-01T10:00:00Z"
    title: str = "Test Record"
    fingerprint: str = "fp-test-001"
    content: Dict[str, Any] = field(default_factory=dict)
    source_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_run_id": self.source_run_id,
            "theme_id": self.theme_id,
            "source_id": self.source_id,
            "info_type": self.info_type,
            "occurred_at": self.occurred_at,
            "title": self.title,
            "fingerprint": self.fingerprint,
            "content": self.content,
            "source_url": self.source_url,
        }


# Price fixtures
def make_price_record(
    price: float,
    spec: str = "16G+512G",
    currency: str = "CNY",
    symbol: str = "test-device",
    **kwargs: Any,
) -> MockNormalizedRecord:
    """Create a price-type normalized record."""
    return MockNormalizedRecord(
        info_type="price",
        title=f"Price snapshot: {price} {currency}",
        content={
            "price": price,
            "currency": currency,
            "spec": spec,
            "symbol": symbol,
        },
        **kwargs,
    )


def make_price_history(
    prices: List[float],
    base_time: Optional[datetime] = None,
    interval_hours: int = 24,
) -> List[Dict[str, Any]]:
    """Create a list of price records simulating history."""
    if base_time is None:
        base_time = datetime(2026, 6, 1, 10, 0, 0)

    records = []
    for i, price in enumerate(prices):
        timestamp = base_time - timedelta(hours=interval_hours * (len(prices) - 1 - i))
        records.append({
            "price": price,
            "occurred_at": timestamp.isoformat() + "Z",
        })

    return records


# Financial event fixtures
def make_financial_event_record(
    direction_label: str = "liquidity_injection",
    operation_type: str = "逆回购",
    amount_billion_cny: float = 500,
    term_days: int = 7,
    rate_percent: float = 1.4,
    announcement_no: str = "[2026]第100号",
    direction_reason: str = "净投放规模放大",
    **kwargs: Any,
) -> MockNormalizedRecord:
    """Create a financial event normalized record."""
    return MockNormalizedRecord(
        info_type="financial_event",
        title=f"PBOC {operation_type} Operation",
        content={
            "direction_label": direction_label,
            "operation_type": operation_type,
            "amount_billion_cny": amount_billion_cny,
            "term_days": term_days,
            "rate_percent": rate_percent,
            "announcement_no": announcement_no,
            "direction_reason": direction_reason,
        },
        **kwargs,
    )


# Content update fixtures
def make_content_update_record(
    object_name: str = "TestApp",
    update_type: str = "feature_release",
    url: str = "https://example.com/changelog",
    summary: str = "New feature released",
    **kwargs: Any,
) -> MockNormalizedRecord:
    """Create a content update normalized record."""
    return MockNormalizedRecord(
        info_type="content_update",
        title=f"{object_name} update: {update_type}",
        content={
            "object_name": object_name,
            "update_type": update_type,
            "url": url,
            "summary": summary,
        },
        **kwargs,
    )


# News announcement fixtures
def make_news_announcement_record(
    release_topic_label: str = "CPI",
    publisher: str = "国家统计局",
    category: str = "macro_release",
    description: str = "Latest economic data release",
    **kwargs: Any,
) -> MockNormalizedRecord:
    """Create a news announcement normalized record."""
    return MockNormalizedRecord(
        info_type="news_announcement",
        title=f"{publisher} {release_topic_label} Release",
        content={
            "release_topic_label": release_topic_label,
            "publisher": publisher,
            "category": category,
            "description": description,
        },
        **kwargs,
    )


# Macro data fixtures
def make_macro_data_record(
    data_type: str = "CPI",
    actual_value: float = 2.5,
    expected_value: float = 2.0,
    period: str = "2026-05",
    **kwargs: Any,
) -> MockNormalizedRecord:
    """Create a macro data release record for deviation testing."""
    return MockNormalizedRecord(
        info_type="news_announcement",
        title=f"{data_type} Release ({period})",
        content={
            "data_type": data_type,
            "actual_value": actual_value,
            "expected_value": expected_value,
            "period": period,
            "category": "macro_release",
        },
        **kwargs,
    )


# Rule configuration fixtures
def make_price_rule_config(
    threshold_percent: float = 5,
    dedup_window_days: int = 30,
    only_latest: bool = True,
    notification_level: str = "high",
    min_price_change: float = 0,
) -> Dict[str, Any]:
    """Create a price rule configuration."""
    return {
        "threshold_percent": threshold_percent,
        "dedup_window_days": dedup_window_days,
        "only_latest": only_latest,
        "notification_level": notification_level,
        "min_price_change": min_price_change,
    }


def make_financial_direction_config(
    classify_neutral: bool = False,
    notification_level: str = "medium",
    bullish_signals: Optional[List[str]] = None,
    bearish_signals: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create a financial direction rule configuration."""
    return {
        "classify_neutral": classify_neutral,
        "notification_level": notification_level,
        "bullish_signals": bullish_signals or ["liquidity_injection"],
        "bearish_signals": bearish_signals or ["liquidity_withdrawal"],
    }


def make_keyword_match_config(
    keywords: Optional[List[str]] = None,
    match_type: str = "any",
    case_sensitive: bool = False,
) -> Dict[str, Any]:
    """Create a keyword match rule configuration."""
    return {
        "keywords": keywords or ["利好", "增长", "突破"],
        "match_type": match_type,
        "case_sensitive": case_sensitive,
    }


def make_consecutive_movement_config(
    min_consecutive: int = 3,
    min_percent_per_move: float = 1,
) -> Dict[str, Any]:
    """Create a consecutive movement rule configuration."""
    return {
        "min_consecutive": min_consecutive,
        "min_percent_per_move": min_percent_per_move,
    }


def make_macro_deviation_config(
    deviation_threshold: float = 0.5,
    deviation_unit: str = "percentage",
    data_types: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create a macro deviation rule configuration."""
    return {
        "deviation_threshold": deviation_threshold,
        "deviation_unit": deviation_unit,
        "data_types": data_types or [],
    }


# Expected result builders
@dataclass
class ExpectedRuleResult:
    """Expected result from an event rule evaluation."""

    triggered: bool
    signal: str = ""
    title_contains: str = ""
    summary_contains: str = ""
    evidence_count: int = 0

    def matches(self, result: Any) -> bool:
        """Check if a result matches this expected result."""
        if result.triggered != self.triggered:
            return False

        if not self.triggered:
            return True

        if self.signal and result.signal != self.signal:
            return False

        if self.title_contains and self.title_contains not in result.title:
            return False

        if self.summary_contains and self.summary_contains not in result.summary:
            return False

        if self.evidence_count and len(result.evidence) < self.evidence_count:
            return False

        return True


# Common test scenarios
PRICE_LOW_SCENARIO = {
    "name": "30-day low detected",
    "record": make_price_record(price=3999),
    "historical_min_price": 4200,
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="30d_low",
        title_contains="30-day low",
        evidence_count=2,
    ),
}

PRICE_NOT_LOW_SCENARIO = {
    "name": "price above historical minimum",
    "record": make_price_record(price=4500),
    "historical_min_price": 4200,
    "expected": ExpectedRuleResult(triggered=False),
}

FINANCIAL_INJECTION_SCENARIO = {
    "name": "liquidity injection detected",
    "record": make_financial_event_record(direction_label="liquidity_injection"),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bullish",
        title_contains="Bullish",
        evidence_count=4,
    ),
}

FINANCIAL_WITHDRAWAL_SCENARIO = {
    "name": "liquidity withdrawal detected",
    "record": make_financial_event_record(direction_label="liquidity_withdrawal"),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bearish",
        title_contains="Bearish",
        evidence_count=4,
    ),
}

FINANCIAL_NEUTRAL_SCENARIO = {
    "name": "neutral financial event",
    "record": make_financial_event_record(direction_label="neutral"),
    "expected": ExpectedRuleResult(triggered=False),
}

CONTENT_UPDATE_SCENARIO = {
    "name": "content update detected",
    "record": make_content_update_record(update_type="feature_release"),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="content_update",
    ),
}

KEYWORD_MATCH_SCENARIO = {
    "name": "keyword match in announcement",
    "record": make_news_announcement_record(
        description="利好消息：公司业绩大幅增长",
    ),
    "config": make_keyword_match_config(keywords=["利好", "增长"]),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bullish",
        title_contains="关键词命中",
        evidence_count=3,
    ),
}

MACRO_DEVIATION_SCENARIO = {
    "name": "CPI above expectations",
    "record": make_macro_data_record(
        actual_value=2.8,
        expected_value=2.0,
    ),
    "config": make_macro_deviation_config(deviation_threshold=0.5),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bullish",
        title_contains="高于预期",
        evidence_count=4,
    ),
}

BREAKOUT_UP_SCENARIO = {
    "name": "price breakout upward",
    "record": make_price_record(price=5000),
    "previous_price": 4000,
    "config": {"threshold_percent": 5, "direction": "both"},
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bullish",
        title_contains="上涨突破",
        evidence_count=4,
    ),
}

CONSECUTIVE_MOVEMENT_SCENARIO = {
    "name": "consecutive price increases",
    "record": make_price_record(price=5000),
    "price_history": [4000, 4100, 4200, 4350, 4500, 4700, 5000],
    "config": make_consecutive_movement_config(min_consecutive=3, min_percent_per_move=1),
    "expected": ExpectedRuleResult(
        triggered=True,
        signal="bullish",
        title_contains="连续上涨",
        evidence_count=4,
    ),
}
