from info_monitor_worker.event_rules.kdj_signal import KDJSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_kdj(j: float, k: float = 50.0, d: float = 50.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price", title="Stock Price", occurred_at="2026-06-01T09:30:00Z",
        content={"price": 100.0, "symbol": "sh600519", "indicators": {"kdj": {"k": k, "d": d, "j": j}}},
    )


class TestKDJSignalRule:
    def setup_method(self):
        self.rule = KDJSignalRule()

    def test_triggers_overbought_when_j_above_100(self):
        result = self.rule.evaluate(_make_price_record_with_kdj(j=120.5, k=85.0, d=70.0))
        assert result.triggered is True and result.signal == "bearish" and "超买" in result.title

    def test_triggers_oversold_when_j_below_0(self):
        result = self.rule.evaluate(_make_price_record_with_kdj(j=-15.3, k=20.0, d=30.0))
        assert result.triggered is True and result.signal == "bullish" and "超卖" in result.title

    def test_no_trigger_when_j_normal(self):
        assert self.rule.evaluate(_make_price_record_with_kdj(j=50.0)).triggered is False

    def test_custom_thresholds(self):
        assert self.rule.evaluate(_make_price_record_with_kdj(j=105.0), config={"overbought_threshold": 120}).triggered is False
