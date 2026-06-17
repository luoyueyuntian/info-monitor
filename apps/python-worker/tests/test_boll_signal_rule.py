from info_monitor_worker.event_rules.boll_signal import BOLLSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_boll(position: str, current_price: float = 120.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price", title="Stock Price", occurred_at="2026-06-01T09:30:00Z",
        content={"price": current_price, "symbol": "sh600519", "indicators": {"boll": {"upper": 118.0, "middle": 115.0, "lower": 112.0, "position": position, "current_price": current_price}}},
    )


class TestBOLLSignalRule:
    def setup_method(self):
        self.rule = BOLLSignalRule()

    def test_triggers_above_upper_band(self):
        result = self.rule.evaluate(_make_price_record_with_boll("above_upper", 120.5))
        assert result.triggered is True and result.signal == "bearish" and "上轨" in result.title

    def test_triggers_below_lower_band(self):
        result = self.rule.evaluate(_make_price_record_with_boll("below_lower", 110.2))
        assert result.triggered is True and result.signal == "bullish" and "下轨" in result.title

    def test_no_trigger_in_middle(self):
        assert self.rule.evaluate(_make_price_record_with_boll("above_middle", 116.0)).triggered is False

    def test_filter_by_band_type(self):
        assert self.rule.evaluate(_make_price_record_with_boll("above_upper"), config={"band": "lower"}).triggered is False
