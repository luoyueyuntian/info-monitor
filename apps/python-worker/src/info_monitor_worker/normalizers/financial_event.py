from __future__ import annotations

from typing import Any, List

from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.normalizers.base import BaseNormalizer


def classify_direction(item: dict[str, Any]) -> tuple[str, str]:
    explicit_label = item.get("direction_label")
    explicit_reason = item.get("direction_reason")

    if explicit_label in {
        "bullish",
        "bearish",
        "neutral",
        "liquidity_injection",
        "liquidity_withdrawal",
    }:
        return (
            str(explicit_label),
            str(explicit_reason or "Direction was explicitly classified by the adapter."),
        )

    operation_type = item.get("operation_type")

    if operation_type in {"逆回购", "MLF", "SLF", "SLO", "国库现金定存"}:
        return (
            "liquidity_injection",
            "This operation type is treated as a short-term liquidity injection into the banking system.",
        )

    if operation_type in {"正回购", "央票", "央行票据"}:
        return (
            "liquidity_withdrawal",
            "This operation type is treated as a short-term liquidity withdrawal from the banking system.",
        )

    return (
        "neutral",
        "The current rule set could not classify this release as liquidity injection or withdrawal.",
    )


class FinancialEventNormalizer(BaseNormalizer):
    def normalize(self, payload: Any) -> List[NormalizedRecord]:
        records: List[NormalizedRecord] = []

        for item in payload:
            occurred_at = str(item["occurred_at"])
            direction_label, direction_reason = classify_direction(item)
            logical_key = (
                item.get("announcement_no")
                or item.get("url")
                or f"financial_event:{item['title']}:{occurred_at[:10]}"
            )
            records.append(
                NormalizedRecord(
                    record_type="financial_event",
                    title=str(item["title"]),
                    occurred_at=occurred_at,
                    source_url=item.get("url"),
                    logical_key=logical_key,
                    content={
                        "url": item.get("url"),
                        "publisher": item.get("publisher"),
                        "category": item.get("category", "financial_event"),
                        "event_class": item.get("event_class"),
                        "announcement_no": item.get("announcement_no"),
                        "operation_type": item.get("operation_type"),
                        "amount_billion_cny": item.get("amount_billion_cny"),
                        "term_days": item.get("term_days"),
                        "rate_percent": item.get("rate_percent"),
                        "bidding_method": item.get("bidding_method"),
                        "direction_label": direction_label,
                        "direction_reason": direction_reason,
                        "market_region": item.get("market_region"),
                        "market_label": item.get("market_label"),
                        "benchmark_name": item.get("benchmark_name"),
                        "benchmark_change_percent": item.get("benchmark_change_percent"),
                        "fund_flow_direction": item.get("fund_flow_direction"),
                        "fund_flow_net_billion": item.get("fund_flow_net_billion"),
                        "fund_flow_turnover_billion": item.get("fund_flow_turnover_billion"),
                        "fund_flow_currency": item.get("fund_flow_currency"),
                        "major_indices": item.get("major_indices"),
                        "sector_flows": item.get("sector_flows"),
                        "top_movers": item.get("top_movers"),
                        "top_decliners": item.get("top_decliners"),
                        "summary_points": item.get("summary_points"),
                        "signal_title": item.get("signal_title"),
                        "signal_summary": item.get("signal_summary"),
                        "description": item.get("description"),
                    },
                )
            )

        return records
