"""Tests for the FinancialDirectionRule event rule."""

from __future__ import annotations

from typing import Optional

from info_monitor_worker.event_rules.financial_direction import FinancialDirectionRule
from info_monitor_worker.models import NormalizedRecord


def _make_financial_record(
    *,
    direction_label: str = "neutral",
    direction_reason: str = "",
    operation_type: str = "逆回购",
    title: str = "Test Operation",
    amount: Optional[float] = None,
    source_url: Optional[str] = None,
) -> NormalizedRecord:
    content = {
        "direction_label": direction_label,
        "direction_reason": direction_reason,
        "operation_type": operation_type,
        "url": "https://example.com",
        "publisher": "PBOC",
    }

    if amount is not None:
        content["amount_billion_cny"] = amount

    return NormalizedRecord(
        record_type="financial_event",
        title=title,
        occurred_at="2026-06-01T06:00:00Z",
        source_url=source_url,
        content=content,
    )


class TestFinancialDirectionRule:
    def setup_method(self):
        self.rule = FinancialDirectionRule()

    def test_liquidity_injection_triggers_bullish(self):
        record = _make_financial_record(
            direction_label="liquidity_injection",
            direction_reason="Net injection detected",
            operation_type="逆回购",
            amount=980,
        )

        result = self.rule.evaluate(record)

        assert result.triggered is True
        assert result.signal == "bullish"
        assert "bullish" in result.title.lower()
        assert "liquidity injection" in result.summary.lower()
        assert len(result.evidence) >= 3

    def test_liquidity_withdrawal_triggers_bearish(self):
        record = _make_financial_record(
            direction_label="liquidity_withdrawal",
            direction_reason="Net withdrawal detected",
            operation_type="正回购",
        )

        result = self.rule.evaluate(record)

        assert result.triggered is True
        assert result.signal == "bearish"
        assert "bearish" in result.title.lower()
        assert "liquidity withdrawal" in result.summary.lower()

    def test_neutral_does_not_trigger(self):
        record = _make_financial_record(
            direction_label="neutral",
            direction_reason="Balanced operation",
        )

        result = self.rule.evaluate(record)

        assert result.triggered is False
        assert result.signal == "neutral"
        assert result.title == ""
        assert result.summary == ""

    def test_missing_direction_label_defaults_to_neutral(self):
        record = NormalizedRecord(
            record_type="financial_event",
            title="Unknown Operation",
            occurred_at="2026-06-01T06:00:00Z",
            content={
                "operation_type": "逆回购",
            },
        )

        result = self.rule.evaluate(record)

        assert result.triggered is False
        assert result.signal == "neutral"

    def test_amount_included_in_evidence_when_present(self):
        record = _make_financial_record(
            direction_label="liquidity_injection",
            direction_reason="Large injection",
            amount=1500,
        )

        result = self.rule.evaluate(record)

        assert any("1500" in e for e in result.evidence)

    def test_amount_not_in_evidence_when_absent(self):
        record = _make_financial_record(
            direction_label="liquidity_injection",
            direction_reason="Injection without amount",
            amount=None,
        )

        result = self.rule.evaluate(record)

        assert not any("billion CNY" in e for e in result.evidence)

    def test_explicit_direction_label_override(self):
        record = _make_financial_record(
            direction_label="neutral",
            direction_reason="Originally neutral",
        )

        result = self.rule.evaluate(record, direction_label="liquidity_injection")

        assert result.triggered is True
        assert result.signal == "bullish"
