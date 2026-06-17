"""Moving Average signal event rule — detect bullish/bearish MA alignment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MovingAverageSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MovingAverageSignalRule(BaseEventRule):
    """Detect bullish or bearish moving average alignment.

    Configuration options:
    - alignment: 'bullish', 'bearish', or 'both' (default: 'both')
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MovingAverageSignalResult:
        config = config or {}
        alignment = config.get("alignment", "both")

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return MovingAverageSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        ma = indicators.get("ma")
        if not ma:
            return MovingAverageSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        trend = ma.get("trend", "unknown")
        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if trend == "bullish_alignment" and alignment in ("bullish", "both"):
            return MovingAverageSignalResult(
                triggered=True,
                signal="bullish",
                title="均线多头排列",
                summary=f"MA5({ma.get('ma5', 0):.2f}) > MA10({ma.get('ma10', 0):.2f}) > MA20({ma.get('ma20', 0):.2f}) > MA60({ma.get('ma60', 0):.2f})，均线呈多头排列，价格 {price} 处于强势状态",
                evidence=[
                    f"MA5: {ma.get('ma5', 0):.2f}",
                    f"MA10: {ma.get('ma10', 0):.2f}",
                    f"MA20: {ma.get('ma20', 0):.2f}",
                    f"MA60: {ma.get('ma60', 0):.2f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        if trend == "bearish_alignment" and alignment in ("bearish", "both"):
            return MovingAverageSignalResult(
                triggered=True,
                signal="bearish",
                title="均线空头排列",
                summary=f"MA5({ma.get('ma5', 0):.2f}) < MA10({ma.get('ma10', 0):.2f}) < MA20({ma.get('ma20', 0):.2f}) < MA60({ma.get('ma60', 0):.2f})，均线呈空头排列，价格 {price} 处于弱势状态",
                evidence=[
                    f"MA5: {ma.get('ma5', 0):.2f}",
                    f"MA10: {ma.get('ma10', 0):.2f}",
                    f"MA20: {ma.get('ma20', 0):.2f}",
                    f"MA60: {ma.get('ma60', 0):.2f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return MovingAverageSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
