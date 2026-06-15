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


def _assess_impact_level(amount_billion_cny: float | None, term_days: int | None) -> str:
    """Assess the impact level of a financial operation based on amount and term.

    Returns 'high', 'medium', or 'low'.
    """
    if amount_billion_cny is None:
        return "low"

    # High impact: large amounts or long-term operations
    if amount_billion_cny >= 500:
        return "high"
    if amount_billion_cny >= 100 and term_days and term_days >= 14:
        return "high"

    # Medium impact: moderate amounts
    if amount_billion_cny >= 100:
        return "medium"

    return "low"


class FinancialDirectionRule(BaseEventRule):
    """Evaluate whether a financial event carries a bullish or bearish signal.

    Liquidity injection operations (reverse repos, MLF, SLF, etc.) are treated
    as bullish signals — more cash flowing into the banking system.
    Liquidity withdrawal operations (outright repos, central bank bills) are
    treated as bearish signals — cash being drained from the system.
    Neutral / unclassified events are ignored.

    Impact levels:
    - high: amount >= 500B CNY, or >= 100B with term >= 14 days
    - medium: amount >= 100B CNY
    - low: smaller operations
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
        market_label = normalized_record.content.get("market_label", "")
        benchmark_name = normalized_record.content.get("benchmark_name", "")
        benchmark_change_percent = normalized_record.content.get("benchmark_change_percent")
        fund_flow_net_billion = normalized_record.content.get("fund_flow_net_billion")
        fund_flow_currency = normalized_record.content.get("fund_flow_currency", "CNY")
        explicit_signal_title = normalized_record.content.get("signal_title")
        explicit_signal_summary = normalized_record.content.get("signal_summary")

        term_days = normalized_record.content.get("term_days")
        impact_level = _assess_impact_level(amount, term_days)

        if label in {"bullish", "bearish"}:
            direction_text = "偏多" if label == "bullish" else "偏空"
            benchmark_text = (
                f"{benchmark_name}: {benchmark_change_percent:+.2f}%"
                if isinstance(benchmark_change_percent, (int, float))
                else None
            )
            fund_flow_text = (
                f"资金净流向: {fund_flow_net_billion:+.2f} 亿{fund_flow_currency}"
                if isinstance(fund_flow_net_billion, (int, float))
                else None
            )
            return FinancialDirectionResult(
                triggered=True,
                signal=label,
                title=str(explicit_signal_title or f"{market_label or title}{direction_text}信号"),
                summary=str(
                    explicit_signal_summary
                    or normalized_record.content.get("description")
                    or f"{market_label or title}当前整体呈现{direction_text}特征。"
                ),
                evidence=[
                    f"Direction reason: {direction_reason}",
                    f"Title: {title}",
                    f"Source: {normalized_record.source_url or 'N/A'}",
                ]
                + ([f"Market: {market_label}"] if market_label else [])
                + ([benchmark_text] if benchmark_text else [])
                + ([fund_flow_text] if fund_flow_text else []),
            )

        if label == "liquidity_injection":
            impact_text = f" Impact: {impact_level}." if impact_level != "low" else ""
            return FinancialDirectionResult(
                triggered=True,
                signal="bullish",
                title=f"Bullish signal: {operation_type or 'liquidity injection'} detected",
                summary=(
                    f"A liquidity injection operation was detected for {title}. "
                    f"This typically indicates looser short-term monetary conditions.{impact_text}"
                ),
                evidence=[
                    f"Operation type: {operation_type}",
                    f"Direction reason: {direction_reason}",
                    f"Impact level: {impact_level}",
                    f"Title: {title}",
                    f"Source: {normalized_record.source_url or 'N/A'}",
                ]
                + ([f"Amount: {amount} billion CNY"] if amount else [])
                + ([f"Term: {term_days} days"] if term_days else []),
            )

        if label == "liquidity_withdrawal":
            impact_text = f" Impact: {impact_level}." if impact_level != "low" else ""
            return FinancialDirectionResult(
                triggered=True,
                signal="bearish",
                title=f"Bearish signal: {operation_type or 'liquidity withdrawal'} detected",
                summary=(
                    f"A liquidity withdrawal operation was detected for {title}. "
                    f"This typically indicates tighter short-term monetary conditions.{impact_text}"
                ),
                evidence=[
                    f"Operation type: {operation_type}",
                    f"Direction reason: {direction_reason}",
                    f"Impact level: {impact_level}",
                    f"Title: {title}",
                    f"Source: {normalized_record.source_url or 'N/A'}",
                ]
                + ([f"Amount: {amount} billion CNY"] if amount else [])
                + ([f"Term: {term_days} days"] if term_days else []),
            )

        return FinancialDirectionResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
