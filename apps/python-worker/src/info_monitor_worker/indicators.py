"""Technical indicators calculation module for stock price analysis."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd


class TechnicalIndicators:
    """Calculate common technical indicators from price data."""

    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> Optional[float]:
        """Calculate Relative Strength Index (RSI).

        Args:
            prices: List of closing prices (oldest first)
            period: RSI period (default: 14)

        Returns:
            RSI value (0-100) or None if insufficient data
        """
        if len(prices) < period + 1:
            return None

        series = pd.Series(prices)
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None

    @staticmethod
    def calculate_macd(
        prices: List[float],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9,
    ) -> Optional[Dict[str, Any]]:
        """Calculate MACD (Moving Average Convergence Divergence).

        Args:
            prices: List of closing prices (oldest first)
            fast_period: Fast EMA period (default: 12)
            slow_period: Slow EMA period (default: 26)
            signal_period: Signal line period (default: 9)

        Returns:
            Dict with DIF, DEA, histogram, and signal or None if insufficient data
        """
        if len(prices) < slow_period + signal_period:
            return None

        series = pd.Series(prices)
        ema_fast = series.ewm(span=fast_period, adjust=False).mean()
        ema_slow = series.ewm(span=slow_period, adjust=False).mean()

        dif = ema_fast - ema_slow
        dea = dif.ewm(span=signal_period, adjust=False).mean()
        histogram = (dif - dea) * 2

        signal = "neutral"
        if len(dif) >= 2:
            prev_dif = dif.iloc[-2]
            prev_dea = dea.iloc[-2]
            curr_dif = dif.iloc[-1]
            curr_dea = dea.iloc[-1]

            if prev_dif <= prev_dea and curr_dif > curr_dea:
                signal = "golden_cross"
            elif prev_dif >= prev_dea and curr_dif < curr_dea:
                signal = "death_cross"
            elif curr_dif > curr_dea:
                signal = "bullish"
            elif curr_dif < curr_dea:
                signal = "bearish"

        return {
            "dif": float(dif.iloc[-1]) if not pd.isna(dif.iloc[-1]) else None,
            "dea": float(dea.iloc[-1]) if not pd.isna(dea.iloc[-1]) else None,
            "hist": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
            "signal": signal,
        }

    @staticmethod
    def calculate_kdj(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        n: int = 9,
        m1: int = 3,
        m2: int = 3,
    ) -> Optional[Dict[str, Any]]:
        """Calculate KDJ (Stochastic Oscillator with J line).

        Args:
            highs: List of high prices (oldest first)
            lows: List of low prices (oldest first)
            closes: List of closing prices (oldest first)
            n: RSV period (default: 9)
            m1: K smoothing period (default: 3)
            m2: D smoothing period (default: 3)

        Returns:
            Dict with K, D, J values and signal or None if insufficient data
        """
        if len(closes) < n:
            return None

        high_series = pd.Series(highs)
        low_series = pd.Series(lows)
        close_series = pd.Series(closes)

        lowest_low = low_series.rolling(window=n).min()
        highest_high = high_series.rolling(window=n).max()

        rsv = ((close_series - lowest_low) / (highest_high - lowest_low)) * 100
        rsv = rsv.fillna(50)

        k = rsv.ewm(com=m1 - 1, adjust=False).mean()
        d = k.ewm(com=m2 - 1, adjust=False).mean()
        j = 3 * k - 2 * d

        signal = "neutral"
        j_value = float(j.iloc[-1]) if not pd.isna(j.iloc[-1]) else 50

        if j_value > 100:
            signal = "overbought"
        elif j_value < 0:
            signal = "oversold"
        elif j_value > 80:
            signal = "approaching_overbought"
        elif j_value < 20:
            signal = "approaching_oversold"

        return {
            "k": float(k.iloc[-1]) if not pd.isna(k.iloc[-1]) else None,
            "d": float(d.iloc[-1]) if not pd.isna(d.iloc[-1]) else None,
            "j": float(j.iloc[-1]) if not pd.isna(j.iloc[-1]) else None,
            "signal": signal,
        }

    @staticmethod
    def calculate_boll(
        prices: List[float],
        period: int = 20,
        std_dev: int = 2,
    ) -> Optional[Dict[str, Any]]:
        """Calculate Bollinger Bands.

        Args:
            prices: List of closing prices (oldest first)
            period: Moving average period (default: 20)
            std_dev: Standard deviation multiplier (default: 2)

        Returns:
            Dict with upper, middle, lower bands and position or None if insufficient data
        """
        if len(prices) < period:
            return None

        series = pd.Series(prices)
        middle = series.rolling(window=period).mean()
        std = series.rolling(window=period).std()

        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)

        current_price = float(series.iloc[-1])
        middle_val = float(middle.iloc[-1]) if not pd.isna(middle.iloc[-1]) else None
        upper_val = float(upper.iloc[-1]) if not pd.isna(upper.iloc[-1]) else None
        lower_val = float(lower.iloc[-1]) if not pd.isna(lower.iloc[-1]) else None

        position = "unknown"
        if middle_val is not None and upper_val is not None and lower_val is not None:
            if current_price > upper_val:
                position = "above_upper"
            elif current_price > middle_val:
                position = "above_middle"
            elif current_price > lower_val:
                position = "below_middle"
            else:
                position = "below_lower"

        return {
            "upper": upper_val,
            "middle": middle_val,
            "lower": lower_val,
            "position": position,
            "current_price": current_price,
        }

    @staticmethod
    def calculate_ma(
        prices: List[float],
        periods: Optional[List[int]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Calculate Moving Averages and determine trend alignment.

        Args:
            prices: List of closing prices (oldest first)
            periods: List of MA periods (default: [5, 10, 20, 60])

        Returns:
            Dict with MA values and trend alignment or None if insufficient data
        """
        if periods is None:
            periods = [5, 10, 20, 60]

        max_period = max(periods)
        if len(prices) < max_period:
            return None

        series = pd.Series(prices)
        ma_values = {}

        for period in periods:
            ma = series.rolling(window=period).mean()
            ma_key = f"ma{period}"
            ma_values[ma_key] = float(ma.iloc[-1]) if not pd.isna(ma.iloc[-1]) else None

        trend = "unknown"
        valid_mas = [v for v in ma_values.values() if v is not None]

        if len(valid_mas) == len(periods):
            if all(valid_mas[i] >= valid_mas[i + 1] for i in range(len(valid_mas) - 1)):
                trend = "bullish_alignment"
            elif all(valid_mas[i] <= valid_mas[i + 1] for i in range(len(valid_mas) - 1)):
                trend = "bearish_alignment"
            else:
                trend = "mixed"

        return {
            **ma_values,
            "trend": trend,
        }

    @classmethod
    def calculate_all(
        cls,
        closes: List[float],
        highs: Optional[List[float]] = None,
        lows: Optional[List[float]] = None,
        rsi_period: int = 14,
        macd_params: Optional[Dict[str, int]] = None,
        kdj_params: Optional[Dict[str, int]] = None,
        boll_params: Optional[Dict[str, int]] = None,
        ma_periods: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Calculate all technical indicators.

        Args:
            closes: List of closing prices (oldest first)
            highs: List of high prices (for KDJ)
            lows: List of low prices (for KDJ)
            rsi_period: RSI period (default: 14)
            macd_params: MACD parameters {"fast": 12, "slow": 26, "signal": 9}
            kdj_params: KDJ parameters {"n": 9, "m1": 3, "m2": 3}
            boll_params: BOLL parameters {"period": 20, "std_dev": 2}
            ma_periods: MA periods (default: [5, 10, 20, 60])

        Returns:
            Dict with all calculated indicators
        """
        if macd_params is None:
            macd_params = {}
        if kdj_params is None:
            kdj_params = {}
        if boll_params is None:
            boll_params = {}

        result: Dict[str, Any] = {}

        rsi = cls.calculate_rsi(closes, period=rsi_period)
        if rsi is not None:
            result["rsi_14"] = rsi

        macd = cls.calculate_macd(
            closes,
            fast_period=macd_params.get("fast", 12),
            slow_period=macd_params.get("slow", 26),
            signal_period=macd_params.get("signal", 9),
        )
        if macd is not None:
            result["macd"] = macd

        boll = cls.calculate_boll(
            closes,
            period=boll_params.get("period", 20),
            std_dev=boll_params.get("std_dev", 2),
        )
        if boll is not None:
            result["boll"] = boll

        ma = cls.calculate_ma(closes, periods=ma_periods)
        if ma is not None:
            result["ma"] = ma

        if highs is not None and lows is not None:
            kdj = cls.calculate_kdj(
                highs,
                lows,
                closes,
                n=kdj_params.get("n", 9),
                m1=kdj_params.get("m1", 3),
                m2=kdj_params.get("m2", 3),
            )
            if kdj is not None:
                result["kdj"] = kdj

        return result
