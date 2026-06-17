from info_monitor_worker.event_rules.macd_signal import MACDSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_macd(signal: str, dif: float = 1.0, dea: float = 0.8, hist: float = 0.4) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price", title="Stock Price", occurred_at="2026-06-01T09:30:00Z",
        content={"price": 100.0, "symbol": "sh600519", "indicators": {"macd": {"dif": dif, "dea": dea, "hist": hist, "signal": signal}}},
    )


class TestMACDSignalRule:
    def setup_method(self):
        self.rule = MACDSignalRule()

    def test_triggers_golden_cross(self):
        result = self.rule.evaluate(_make_price_record_with_macd("golden_cross"))
        assert result.triggered is True and result.signal == "bullish" and "金叉" in result.title

    def test_triggers_death_cross(self):
        result = self.rule.evaluate(_make_price_record_with_macd("death_cross", dif=-1.0, dea=-0.8, hist=-0.4))
        assert result.triggered is True and result.signal == "bearish" and "死叉" in result.title

    def test_no_trigger_on_bullish_signal(self):
        assert self.rule.evaluate(_make_price_record_with_macd("bullish")).triggered is False

    def test_custom_signal_types(self):
        result = self.rule.evaluate(_make_price_record_with_macd("bullish"), config={"signal_types": ["bullish", "golden_cross"]})
        assert result.triggered is True

    def test_no_trigger_when_no_macd(self):
        record = NormalizedRecord(record_type="price", title="Stock", occurred_at="2026-06-01T09:30:00Z", content={"price": 100.0, "indicators": {"rsi_14": 50.0}})
        assert self.rule.evaluate(record).triggered is False
