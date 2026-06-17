"""RSI signal event rule — detect overbought/oversold conditions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class RSISignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class RSISignalRule(BaseEventRule):
    """Detect RSI overbought/oversold conditions.

    Configuration options:
    - overbought_threshold: RSI level to trigger overbought signal (default: 70)
    - oversold_threshold: RSI level to trigger oversold signal (default: 30)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> RSISignalResult:
        config = config or {}
        overbought_threshold = config.get("overbought_threshold", 70)
        oversold_threshold = config.get("oversold_threshold", 30)

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return RSISignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        rsi = indicators.get("rsi_14")
        if rsi is None:
            return RSISignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if rsi >= overbought_threshold:
            return RSISignalResult(
                triggered=True,
                signal="bearish",
                title=f"RSI 超买警告: {rsi:.1f}",
                summary=f"RSI(14) = {rsi:.1f}，超过 {overbought_threshold} 超买线，价格 {price} 可能面临回调压力",
                evidence=[
                    f"RSI(14): {rsi:.1f}",
                    f"超买阈值: {overbought_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        if rsi <= oversold_threshold:
            return RSISignalResult(
                triggered=True,
                signal="bullish",
                title=f"RSI 超卖信号: {rsi:.1f}",
                summary=f"RSI(14) = {rsi:.1f}，低于 {oversold_threshold} 超卖线，价格 {price} 可能存在反弹机会",
                evidence=[
                    f"RSI(14): {rsi:.1f}",
                    f"超卖阈值: {oversold_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return RSISignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
