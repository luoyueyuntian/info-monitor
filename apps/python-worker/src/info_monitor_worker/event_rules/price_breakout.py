"""Price breakout event rule — detect significant price movements."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class PriceBreakoutResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class PriceBreakoutRule(BaseEventRule):
    """Detect when price breaks above or below a significant threshold.

    Configuration options:
    - threshold_percent: Minimum percentage change to trigger (default: 5%)
    - direction: 'up', 'down', or 'both' (default: 'both')
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        previous_price: Optional[float] = None,
        config: Optional[dict] = None,
    ) -> PriceBreakoutResult:
        config = config or {}
        threshold_percent = config.get("threshold_percent", 5)
        direction = config.get("direction", "both")

        current_price = float(normalized_record.content.get("price", 0))

        if previous_price is None or previous_price == 0:
            return PriceBreakoutResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        price_change = ((current_price - previous_price) / previous_price) * 100
        abs_change = abs(price_change)

        if abs_change < threshold_percent:
            return PriceBreakoutResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Check direction filter
        if direction == "up" and price_change < 0:
            return PriceBreakoutResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )
        if direction == "down" and price_change > 0:
            return PriceBreakoutResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Determine signal based on direction
        if price_change > 0:
            signal = "bullish"
            direction_text = "上涨"
            impact_text = "价格显著上涨"
        else:
            signal = "bearish"
            direction_text = "下跌"
            impact_text = "价格显著下跌"

        spec = normalized_record.content.get("spec", "")

        return PriceBreakoutResult(
            triggered=True,
            signal=signal,
            title=f"价格{direction_text}突破: {abs_change:.1f}%",
            summary=f"检测到价格{direction_text} {abs_change:.1f}%，当前价格 {current_price}",
            evidence=[
                f"当前价格: {current_price}",
                f"对比价格: {previous_price}",
                f"变化幅度: {price_change:+.1f}%",
                f"阈值: {threshold_percent}%",
            ] + ([f"规格: {spec}"] if spec else []),
        )
