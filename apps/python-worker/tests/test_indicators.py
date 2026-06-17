"""Tests for the TechnicalIndicators module."""

import pytest

from info_monitor_worker.indicators import TechnicalIndicators


class TestRSI:
    def test_rsi_with_enough_data(self):
        prices = [
            44.0, 44.34, 44.09, 43.61, 44.33,
            44.83, 45.10, 45.42, 45.84, 46.08,
            45.89, 46.03, 45.61, 46.28, 46.28,
            46.00, 46.03, 46.41, 46.22, 45.64,
        ]
        result = TechnicalIndicators.calculate_rsi(prices, period=14)
        assert result is not None
        assert 0 <= result <= 100

    def test_rsi_with_insufficient_data(self):
        prices = [44.0, 44.34, 44.09]
        result = TechnicalIndicators.calculate_rsi(prices, period=14)
        assert result is None

    def test_rsi_uptrend_is_above_50(self):
        prices = [float(40 + i * 0.5) for i in range(20)]
        result = TechnicalIndicators.calculate_rsi(prices, period=14)
        assert result is not None
        assert result > 50

    def test_rsi_downtrend_is_below_50(self):
        prices = [float(60 - i * 0.5) for i in range(20)]
        result = TechnicalIndicators.calculate_rsi(prices, period=14)
        assert result is not None
        assert result < 50


class TestMACD:
    def test_macd_returns_all_fields(self):
        prices = [float(100 + (i % 10) * 2 - 5) for i in range(50)]
        result = TechnicalIndicators.calculate_macd(prices)
        assert result is not None
        assert "dif" in result
        assert "dea" in result
        assert "hist" in result
        assert "signal" in result

    def test_macd_signal_is_valid(self):
        prices = [float(100 + (i % 10) * 2 - 5) for i in range(50)]
        result = TechnicalIndicators.calculate_macd(prices)
        assert result is not None
        valid_signals = ["golden_cross", "death_cross", "bullish", "bearish", "neutral"]
        assert result["signal"] in valid_signals

    def test_macd_insufficient_data(self):
        prices = [100.0, 101.0, 102.0]
        result = TechnicalIndicators.calculate_macd(prices)
        assert result is None


class TestKDJ:
    def test_kdj_returns_all_fields(self):
        n = 20
        highs = [float(100 + (i % 5) * 3) for i in range(n)]
        lows = [float(95 - (i % 3) * 2) for i in range(n)]
        closes = [float(98 + (i % 4) * 2) for i in range(n)]
        result = TechnicalIndicators.calculate_kdj(highs, lows, closes)
        assert result is not None
        assert "k" in result
        assert "d" in result
        assert "j" in result
        assert "signal" in result

    def test_kdj_insufficient_data(self):
        result = TechnicalIndicators.calculate_kdj([100.0], [90.0], [95.0])
        assert result is None

    def test_kdj_overbought_signal(self):
        n = 20
        highs = [float(100 + i) for i in range(n)]
        lows = [float(95 + i) for i in range(n)]
        closes = [float(98 + i) for i in range(n)]
        result = TechnicalIndicators.calculate_kdj(highs, lows, closes)
        assert result is not None
        assert result["j"] > 50


class TestBOLL:
    def test_boll_returns_all_fields(self):
        prices = [float(100 + (i % 8) - 4) for i in range(25)]
        result = TechnicalIndicators.calculate_boll(prices)
        assert result is not None
        assert "upper" in result
        assert "middle" in result
        assert "lower" in result
        assert "position" in result

    def test_boll_upper_greater_than_middle_greater_than_lower(self):
        prices = [float(100 + (i % 8) - 4) for i in range(25)]
        result = TechnicalIndicators.calculate_boll(prices)
        assert result is not None
        assert result["upper"] > result["middle"] > result["lower"]

    def test_boll_insufficient_data(self):
        prices = [100.0, 101.0, 102.0]
        result = TechnicalIndicators.calculate_boll(prices)
        assert result is None


class TestMA:
    def test_ma_returns_all_fields(self):
        prices = [float(100 + i * 0.5) for i in range(70)]
        result = TechnicalIndicators.calculate_ma(prices)
        assert result is not None
        assert "ma5" in result
        assert "ma10" in result
        assert "ma20" in result
        assert "ma60" in result
        assert "trend" in result

    def test_ma_bullish_alignment_in_uptrend(self):
        prices = [float(100 + i * 0.5) for i in range(70)]
        result = TechnicalIndicators.calculate_ma(prices)
        assert result is not None
        assert result["trend"] == "bullish_alignment"

    def test_ma_insufficient_data(self):
        prices = [100.0, 101.0, 102.0]
        result = TechnicalIndicators.calculate_ma(prices)
        assert result is None


class TestCalculateAll:
    def test_calculate_all_with_kline_data(self):
        n = 70
        closes = [float(100 + (i % 10) - 5) for i in range(n)]
        highs = [float(102 + (i % 10) - 3) for i in range(n)]
        lows = [float(97 - (i % 5)) for i in range(n)]

        result = TechnicalIndicators.calculate_all(closes, highs=highs, lows=lows)
        assert "rsi_14" in result
        assert "macd" in result
        assert "boll" in result
        assert "ma" in result
        assert "kdj" in result

    def test_calculate_all_without_highs_lows_skips_kdj(self):
        n = 70
        closes = [float(100 + (i % 10) - 5) for i in range(n)]

        result = TechnicalIndicators.calculate_all(closes)
        assert "rsi_14" in result
        assert "kdj" not in result

    def test_calculate_all_with_minimal_data(self):
        closes = [100.0, 101.0]
        result = TechnicalIndicators.calculate_all(closes)
        assert result == {}
