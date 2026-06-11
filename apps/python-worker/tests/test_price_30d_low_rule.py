"""Tests for the ThirtyDayLowRule event rule."""

from info_monitor_worker.event_rules.price_30d_low import ThirtyDayLowRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record(
    *,
    price: float,
    spec: str = "16G+512G",
    title: str = "Price Snapshot",
    occurred_at: str = "2026-06-01T09:30:00Z",
) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title=title,
        occurred_at=occurred_at,
        content={
            "price": price,
            "spec": spec,
            "currency": "CNY",
        },
    )


class TestThirtyDayLowRule:
    def setup_method(self):
        self.rule = ThirtyDayLowRule()

    def test_triggers_when_below_historical_min(self):
        record = _make_price_record(price=3999)
        historical_min = 4100.0

        result = self.rule.evaluate(record, historical_min)

        assert result.triggered is True
        assert result.signal == "30d_low"
        assert "30-day low" in result.title
        assert "3999" in result.evidence[0]
        assert "4100" in result.evidence[1]

    def test_does_not_trigger_when_at_historical_min(self):
        record = _make_price_record(price=4100)
        historical_min = 4100.0

        result = self.rule.evaluate(record, historical_min)

        assert result.triggered is False

    def test_does_not_trigger_when_above_historical_min(self):
        record = _make_price_record(price=4500)
        historical_min = 4100.0

        result = self.rule.evaluate(record, historical_min)

        assert result.triggered is False

    def test_triggers_when_no_historical_data(self):
        record = _make_price_record(price=3999)
        historical_min = None

        result = self.rule.evaluate(record, historical_min)

        assert result.triggered is False

    def test_spec_included_in_summary(self):
        record = _make_price_record(price=3999, spec="8G+256G")
        historical_min = 4100.0

        result = self.rule.evaluate(record, historical_min)

        assert "8G+256G" in result.summary

    def test_default_spec_when_missing(self):
        record = NormalizedRecord(
            record_type="price",
            title="Price Snapshot",
            occurred_at="2026-06-01T09:30:00Z",
            content={"price": 3999},
        )
        historical_min = 4100.0

        result = self.rule.evaluate(record, historical_min)

        assert result.triggered is True
        assert "same tracked configuration" in result.summary
