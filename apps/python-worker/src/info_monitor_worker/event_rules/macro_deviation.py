"""Macro deviation event rule — detect macroeconomic data deviations from expectations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MacroDeviationResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MacroDeviationRule(BaseEventRule):
    """Detect when macroeconomic data deviates significantly from expectations.

    Configuration options:
    - deviation_threshold: Minimum deviation to trigger (default: 0.5)
    - deviation_unit: 'percentage' or 'absolute' (default: 'percentage')
    - data_types: List of data types to monitor (default: all)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MacroDeviationResult:
        config = config or {}
        deviation_threshold = config.get("deviation_threshold", 0.5)
        deviation_unit = config.get("deviation_unit", "percentage")
        data_types = config.get("data_types", [])

        # Get actual and expected values
        actual = normalized_record.content.get("actual_value")
        expected = normalized_record.content.get("expected_value")
        data_type = normalized_record.content.get("data_type", "")

        if actual is None or expected is None:
            return MacroDeviationResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        try:
            actual = float(actual)
            expected = float(expected)
        except (ValueError, TypeError):
            return MacroDeviationResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Filter by data type if specified
        if data_types and data_type not in data_types:
            return MacroDeviationResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Calculate deviation
        if deviation_unit == "percentage" and expected != 0:
            deviation = ((actual - expected) / abs(expected)) * 100
        else:
            deviation = actual - expected

        abs_deviation = abs(deviation)

        if abs_deviation < deviation_threshold:
            return MacroDeviationResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        # Determine signal based on deviation direction
        # Positive deviation for economic data is generally bullish
        # Negative deviation for economic data is generally bearish
        # This is a simplified heuristic - actual interpretation depends on the specific indicator
        if deviation > 0:
            signal = "bullish"
            direction_text = "高于"
        else:
            signal = "bearish"
            direction_text = "低于"

        indicator_name = normalized_record.title or data_type or "宏观指标"

        return MacroDeviationResult(
            triggered=True,
            signal=signal,
            title=f"{indicator_name}{direction_text}预期",
            summary=f"{indicator_name}实际值 {actual}，预期值 {expected}，偏差 {deviation:+.2f}{'%' if deviation_unit == 'percentage' else ''}",
            evidence=[
                f"指标名称: {indicator_name}",
                f"实际值: {actual}",
                f"预期值: {expected}",
                f"偏差: {deviation:+.2f}{'%' if deviation_unit == 'percentage' else ''}",
                f"阈值: {deviation_threshold}{'%' if deviation_unit == 'percentage' else ''}",
            ],
        )
