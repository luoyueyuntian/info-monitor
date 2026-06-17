from info_monitor_worker.event_rules.moving_average_signal import MovingAverageSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_ma(trend: str, mas: dict = None) -> NormalizedRecord:
    default_mas = {"ma5": 120.0, "ma10": 118.0, "ma20": 115.0, "ma60": 110.0, "trend": trend}
    if mas:
        default_mas.update(mas)
    return NormalizedRecord(
        record_type="price", title="Stock Price", occurred_at="2026-06-01T09:30:00Z",
        content={"price": 121.0, "symbol": "sh600519", "indicators": {"ma": default_mas}},
    )


class TestMovingAverageSignalRule:
    def setup_method(self):
        self.rule = MovingAverageSignalRule()

    def test_triggers_bullish_alignment(self):
        result = self.rule.evaluate(_make_price_record_with_ma("bullish_alignment"))
        assert result.triggered is True and result.signal == "bullish" and "多头排列" in result.title

    def test_triggers_bearish_alignment(self):
        result = self.rule.evaluate(_make_price_record_with_ma("bearish_alignment", {"ma5": 110.0, "ma10": 112.0, "ma20": 115.0, "ma60": 120.0}))
        assert result.triggered is True and result.signal == "bearish" and "空头排列" in result.title

    def test_no_trigger_on_mixed(self):
        assert self.rule.evaluate(_make_price_record_with_ma("mixed")).triggered is False

    def test_filter_by_alignment_type(self):
        assert self.rule.evaluate(_make_price_record_with_ma("bullish_alignment"), config={"alignment": "bearish"}).triggered is False
