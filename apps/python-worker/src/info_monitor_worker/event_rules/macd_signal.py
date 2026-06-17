"""MACD signal event rule — detect golden cross/death cross and trend signals."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MACDSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MACDSignalRule(BaseEventRule):
    """Detect MACD golden cross, death cross, and trend signals.

    Configuration options:
    - signal_types: List of signals to trigger on (default: ["golden_cross", "death_cross"])
      Supported: "golden_cross", "death_cross", "bullish", "bearish"
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MACDSignalResult:
        config = config or {}
        signal_types = config.get("signal_types", ["golden_cross", "death_cross"])

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return MACDSignalResult(triggered=False, signal="neutral", title="", summary="", evidence=[])

        macd = indicators.get("macd")
        if not macd:
            return MACDSignalResult(triggered=False, signal="neutral", title="", summary="", evidence=[])

        macd_signal = macd.get("signal", "neutral")
        dif = macd.get("dif", 0) or 0
        dea = macd.get("dea", 0) or 0
        hist = macd.get("hist", 0) or 0
        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if macd_signal not in signal_types:
            return MACDSignalResult(triggered=False, signal="neutral", title="", summary="", evidence=[])

        title_map = {
            "golden_cross": "MACD 金叉信号",
            "death_cross": "MACD 死叉信号",
            "bullish": "MACD 多头信号",
            "bearish": "MACD 空头信号",
        }
        signal_dir = "bullish" if macd_signal in ("golden_cross", "bullish") else "bearish"
        summary_map = {
            "golden_cross": f"DIF({dif:.3f}) 上穿 DEA({dea:.3f})，MACD 金叉形成，价格 {price} 可能开启上涨趋势",
            "death_cross": f"DIF({dif:.3f}) 下穿 DEA({dea:.3f})，MACD 死叉形成，价格 {price} 可能开启下跌趋势",
            "bullish": f"DIF({dif:.3f}) > DEA({dea:.3f})，MACD 处于多头状态",
            "bearish": f"DIF({dif:.3f}) < DEA({dea:.3f})，MACD 处于空头状态",
        }

        return MACDSignalResult(
            triggered=True,
            signal=signal_dir,
            title=title_map.get(macd_signal, "MACD 信号"),
            summary=summary_map.get(macd_signal, ""),
            evidence=[f"DIF: {dif:.3f}", f"DEA: {dea:.3f}", f"MACD柱: {hist:.3f}", f"当前价格: {price}", f"标的: {symbol}"],
        )
