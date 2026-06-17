"""KDJ signal event rule — detect overbought/oversold conditions via J line."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class KDJSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class KDJSignalRule(BaseEventRule):
    """Detect KDJ overbought/oversold conditions using J line.

    Configuration options:
    - overbought_threshold: J value to trigger overbought (default: 100)
    - oversold_threshold: J value to trigger oversold (default: 0)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> KDJSignalResult:
        config = config or {}
        overbought_threshold = config.get("overbought_threshold", 100)
        oversold_threshold = config.get("oversold_threshold", 0)

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        kdj = indicators.get("kdj")
        if not kdj:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        j_value = kdj.get("j")
        k_value = kdj.get("k", 0)
        d_value = kdj.get("d", 0)

        if j_value is None:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if j_value > overbought_threshold:
            return KDJSignalResult(
                triggered=True,
                signal="bearish",
                title=f"KDJ 超买警告: J={j_value:.1f}",
                summary=f"KDJ J值 = {j_value:.1f}，超过 {overbought_threshold}，K={k_value:.1f} D={d_value:.1f}，价格 {price} 可能面临回调",
                evidence=[
                    f"J值: {j_value:.1f}",
                    f"K值: {k_value:.1f}",
                    f"D值: {d_value:.1f}",
                    f"超买阈值: {overbought_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        if j_value < oversold_threshold:
            return KDJSignalResult(
                triggered=True,
                signal="bullish",
                title=f"KDJ 超卖信号: J={j_value:.1f}",
                summary=f"KDJ J值 = {j_value:.1f}，低于 {oversold_threshold}，K={k_value:.1f} D={d_value:.1f}，价格 {price} 可能存在反弹机会",
                evidence=[
                    f"J值: {j_value:.1f}",
                    f"K值: {k_value:.1f}",
                    f"D值: {d_value:.1f}",
                    f"超卖阈值: {oversold_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return KDJSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
