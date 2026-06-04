from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class PriceLowResult:
    triggered: bool
    signal: str
    summary: str
    title: str
    evidence: list[str]


class ThirtyDayLowRule(BaseEventRule):
    def evaluate(self, normalized_record: NormalizedRecord, historical_min_price: Optional[float]):
        price = float(normalized_record.content["price"])

        if historical_min_price is None or price >= historical_min_price:
            return PriceLowResult(
                triggered=False,
                signal="30d_low",
                title="",
                summary="",
                evidence=[],
            )

        spec = normalized_record.content.get("spec") or "same tracked configuration"
        return PriceLowResult(
            triggered=True,
            signal="30d_low",
            title="30-day low detected across tracked marketplaces",
            summary=f"Detected a new 30-day low price for {spec}.",
            evidence=[
                f"Current price: {price}",
                f"Previous 30-day minimum: {historical_min_price}",
            ],
        )
