from info_monitor_worker.event_rules.rsi_signal import RSISignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_rsi(rsi_value: float, price: float = 100.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={"price": price, "symbol": "sh600519", "indicators": {"rsi_14": rsi_value}},
    )


class TestRSISignalRule:
    def setup_method(self):
        self.rule = RSISignalRule()

    def test_triggers_overbought_when_rsi_above_70(self):
        result = self.rule.evaluate(_make_price_record_with_rsi(75.5))
        assert result.triggered is True and result.signal == "bearish" and "超买" in result.title

    def test_triggers_oversold_when_rsi_below_30(self):
        result = self.rule.evaluate(_make_price_record_with_rsi(25.3))
        assert result.triggered is True and result.signal == "bullish" and "超卖" in result.title

    def test_no_trigger_when_rsi_normal(self):
        result = self.rule.evaluate(_make_price_record_with_rsi(50.0))
        assert result.triggered is False and result.signal == "neutral"

    def test_no_trigger_when_no_indicators(self):
        record = NormalizedRecord(record_type="price", title="Stock", occurred_at="2026-06-01T09:30:00Z", content={"price": 100.0})
        assert self.rule.evaluate(record).triggered is False

    def test_custom_thresholds(self):
        assert self.rule.evaluate(_make_price_record_with_rsi(80.0), config={"overbought_threshold": 85}).triggered is False

    def test_evidence_contains_symbol(self):
        result = self.rule.evaluate(_make_price_record_with_rsi(75.0))
        assert any("sh600519" in e for e in result.evidence)
