"""Consecutive movement event rule — detect repeated price movements in the same direction."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class ConsecutiveMovementResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class ConsecutiveMovementRule(BaseEventRule):
    """Detect when price moves in the same direction for multiple consecutive periods.

    Configuration options:
    - min_consecutive: Minimum consecutive movements to trigger (default: 3)
    - min_percent_per_move: Minimum percentage per move to count (default: 1%)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        price_history: Optional[list[float]] = None,
        config: Optional[dict] = None,
    ) -> ConsecutiveMovementResult:
        config = config or {}
        min_consecutive = config.get("min_consecutive", 3)
        min_percent_per_move = config.get("min_percent_per_move", 1)

        if not price_history or len(price_history) < min_consecutive + 1:
            return ConsecutiveMovementResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Calculate price changes
        changes = []
        for i in range(1, len(price_history)):
            if price_history[i - 1] == 0:
                changes.append(0)
            else:
                change = ((price_history[i] - price_history[i - 1]) / price_history[i - 1]) * 100
                changes.append(change)

        # Find consecutive movements in the same direction
        consecutive_up = 0
        consecutive_down = 0
        max_consecutive_up = 0
        max_consecutive_down = 0

        for change in changes:
            if change >= min_percent_per_move:
                consecutive_up += 1
                consecutive_down = 0
                max_consecutive_up = max(max_consecutive_up, consecutive_up)
            elif change <= -min_percent_per_move:
                consecutive_down += 1
                consecutive_up = 0
                max_consecutive_down = max(max_consecutive_down, consecutive_down)
            else:
                consecutive_up = 0
                consecutive_down = 0

        current_price = float(normalized_record.content.get("price", 0))

        # Check if we have enough consecutive movements
        if max_consecutive_up >= min_consecutive:
            return ConsecutiveMovementResult(
                triggered=True,
                signal="bullish",
                title=f"连续上涨 {max_consecutive_up} 次",
                summary=f"检测到价格连续上涨 {max_consecutive_up} 次，当前价格 {current_price}",
                evidence=[
                    f"连续上涨次数: {max_consecutive_up}",
                    f"每次最低涨幅: {min_percent_per_move}%",
                    f"当前价格: {current_price}",
                    f"触发阈值: {min_consecutive} 次",
                ],
            )

        if max_consecutive_down >= min_consecutive:
            return ConsecutiveMovementResult(
                triggered=True,
                signal="bearish",
                title=f"连续下跌 {max_consecutive_down} 次",
                summary=f"检测到价格连续下跌 {max_consecutive_down} 次，当前价格 {current_price}",
                evidence=[
                    f"连续下跌次数: {max_consecutive_down}",
                    f"每次最低跌幅: {min_percent_per_move}%",
                    f"当前价格: {current_price}",
                    f"触发阈值: {min_consecutive} 次",
                ],
            )

        return ConsecutiveMovementResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
