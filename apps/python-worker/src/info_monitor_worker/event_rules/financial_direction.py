"""Financial direction event rule — classify liquidity events as bullish or bearish."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class FinancialDirectionResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class FinancialDirectionRule(BaseEventRule):
    """Evaluate whether a financial event carries a bullish or bearish signal.

    Liquidity injection operations (reverse repos, MLF, SLF, etc.) are treated
    as bullish signals — more cash flowing into the banking system.
    Liquidity withdrawal operations (outright repos, central bank bills) are
    treated as bearish signals — cash being drained from the system.
    Neutral / unclassified events are ignored.
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        direction_label: Optional[str] = None,
    ) -> FinancialDirectionResult:
        label = direction_label or normalized_record.content.get("direction_label", "neutral")
        direction_reason = normalized_record.content.get("direction_reason", "")
        title = normalized_record.title
        operation_type = normalized_record.content.get("operation_type", "")
        amount = normalized_record.content.get("amount_billion_cny")

        if label == "liquidity_injection":
            amount_text = f" Amount: {amount} billion CNY." if amount else ""
            return FinancialDirectionResult(
                triggered=True,
                signal="bullish",
                title=f"Bullish signal: {operation_type or 'liquidity injection'} detected",
                summary=(
                    f"A liquidity injection operation was detected for {title}. "
                    f"This typically indicates looser short-term monetary conditions."
                ),
                evidence=[
                    f"Operation type: {operation_type}",
                    f"Direction reason: {direction_reason}",
                    f"Title: {title}",
                    f"Source: {normalized_record.source_url or 'N/A'}",
                ]
                + ([f"Amount: {amount} billion CNY"] if amount else []),
            )

        if label == "liquidity_withdrawal":
            return FinancialDirectionResult(
                triggered=True,
                signal="bearish",
                title=f"Bearish signal: {operation_type or 'liquidity withdrawal'} detected",
                summary=(
                    f"A liquidity withdrawal operation was detected for {title}. "
                    f"This typically indicates tighter short-term monetary conditions."
                ),
                evidence=[
                    f"Operation type: {operation_type}",
                    f"Direction reason: {direction_reason}",
                    f"Title: {title}",
                    f"Source: {normalized_record.source_url or 'N/A'}",
                ],
            )

        return FinancialDirectionResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
