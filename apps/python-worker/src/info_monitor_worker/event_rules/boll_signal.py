"""BOLL signal event rule — detect price breakouts above/below Bollinger Bands."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class BOLLSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class BOLLSignalRule(BaseEventRule):
    """Detect price breakouts above upper or below lower Bollinger Bands.

    Configuration options:
    - band: 'upper', 'lower', or 'both' (default: 'both')
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> BOLLSignalResult:
        config = config or {}
        band = config.get("band", "both")

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return BOLLSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        boll = indicators.get("boll")
        if not boll:
            return BOLLSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        position = boll.get("position", "unknown")
        upper = boll.get("upper")
        middle = boll.get("middle")
        lower = boll.get("lower")
        current_price = boll.get("current_price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if position == "above_upper" and band in ("upper", "both"):
            return BOLLSignalResult(
                triggered=True,
                signal="bearish",
                title="BOLL 突破上轨警告",
                summary=f"价格 {current_price} 突破布林带上轨 {upper}，可能面临回调或突破确认",
                evidence=[
                    f"当前价格: {current_price}",
                    f"上轨: {upper}",
                    f"中轨: {middle}",
                    f"下轨: {lower}",
                    f"标的: {symbol}",
                ],
            )

        if position == "below_lower" and band in ("lower", "both"):
            return BOLLSignalResult(
                triggered=True,
                signal="bullish",
                title="BOLL 突破下轨信号",
                summary=f"价格 {current_price} 跌破布林带下轨 {lower}，可能存在反弹机会或趋势加速",
                evidence=[
                    f"当前价格: {current_price}",
                    f"上轨: {upper}",
                    f"中轨: {middle}",
                    f"下轨: {lower}",
                    f"标的: {symbol}",
                ],
            )

        return BOLLSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
