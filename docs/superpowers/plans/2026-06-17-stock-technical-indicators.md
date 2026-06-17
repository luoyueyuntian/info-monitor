# 股票技术指标集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 info-monitor 系统中集成 RSI、MACD、KDJ、BOLL、MA 技术指标的计算、事件触发和前端展示功能。

**Architecture:** 在 Python Worker 层新增 `indicators.py` 模块计算技术指标，扩展 `PriceNormalizer` 将指标写入 `NormalizedRecord.content.indicators`，新增 5 个 Event Rule 触发信号事件，API 层扩展类型定义，前端新增技术指标面板组件。

**Tech Stack:** Python (pandas), TypeScript (Fastify), Vue 3 (Composition API)

---

## 文件结构

### 新增文件
- `apps/python-worker/src/info_monitor_worker/indicators.py` — 技术指标计算模块
- `apps/python-worker/tests/test_indicators.py` — 指标计算单元测试
- `apps/python-worker/src/info_monitor_worker/event_rules/rsi_signal.py` — RSI 超买超卖规则
- `apps/python-worker/src/info_monitor_worker/event_rules/macd_signal.py` — MACD 金叉死叉规则
- `apps/python-worker/src/info_monitor_worker/event_rules/kdj_signal.py` — KDJ 超买超卖规则
- `apps/python-worker/src/info_monitor_worker/event_rules/boll_signal.py` — BOLL 突破规则
- `apps/python-worker/src/info_monitor_worker/event_rules/moving_average_signal.py` — MA 均线排列规则
- `apps/python-worker/tests/test_rsi_signal_rule.py` — RSI 规则测试
- `apps/python-worker/tests/test_macd_signal_rule.py` — MACD 规则测试
- `apps/python-worker/tests/test_kdj_signal_rule.py` — KDJ 规则测试
- `apps/python-worker/tests/test_boll_signal_rule.py` — BOLL 规则测试
- `apps/python-worker/tests/test_moving_average_signal_rule.py` — MA 规则测试
- `apps/api/src/routes/price-indicators.ts` — 指标查询 API
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/TechnicalIndicatorsPanel.vue` — 指标面板组件
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/IndicatorSignalCard.vue` — 信号卡片组件

### 修改文件
- `apps/python-worker/src/info_monitor_worker/normalizers/price.py` — 集成指标计算
- `apps/python-worker/src/info_monitor_worker/event_rules/__init__.py` — 注册新规则
- `apps/python-worker/src/info_monitor_worker/service.py` — 集成新规则
- `packages/shared-contracts/src/index.ts` — 扩展类型定义
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/StockMarketReportsBoard.vue` — 集成指标面板

---

## Task 1: 实现技术指标计算模块

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/indicators.py`
- Test: `apps/python-worker/tests/test_indicators.py`

- [ ] **Step 1: 创建 indicators.py 文件并实现 RSI 计算**

```python
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

        # Determine signal
        signal = "neutral"
        if len(dif) >= 2:
            prev_dif = dif.iloc[-2]
            prev_dea = dea.iloc[-2]
            curr_dif = dif.iloc[-1]
            curr_dea = dea.iloc[-1]

            # Golden cross: DIF crosses above DEA
            if prev_dif <= prev_dea and curr_dif > curr_dea:
                signal = "golden_cross"
            # Death cross: DIF crosses below DEA
            elif prev_dif >= prev_dea and curr_dif < curr_dea:
                signal = "death_cross"
            # Bullish: DIF > DEA
            elif curr_dif > curr_dea:
                signal = "bullish"
            # Bearish: DIF < DEA
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
        rsv = rsv.fillna(50)  # Default to 50 when no range

        k = rsv.ewm(com=m1 - 1, adjust=False).mean()
        d = k.ewm(com=m2 - 1, adjust=False).mean()
        j = 3 * k - 2 * d

        # Determine signal
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

        # Determine position
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

        # Determine trend alignment
        trend = "unknown"
        valid_mas = [v for v in ma_values.values() if v is not None]

        if len(valid_mas) == len(periods):
            # Bullish alignment: shorter MA > longer MA
            if all(valid_mas[i] >= valid_mas[i + 1] for i in range(len(valid_mas) - 1)):
                trend = "bullish_alignment"
            # Bearish alignment: shorter MA < longer MA
            elif all(valid_mas[i] <= valid_mas[i + 1] for i in range(len(valid_mas) - 1)):
                trend = "bearish_alignment"
            # Mixed
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

        # RSI
        rsi = cls.calculate_rsi(closes, period=rsi_period)
        if rsi is not None:
            result["rsi_14"] = rsi

        # MACD
        macd = cls.calculate_macd(
            closes,
            fast_period=macd_params.get("fast", 12),
            slow_period=macd_params.get("slow", 26),
            signal_period=macd_params.get("signal", 9),
        )
        if macd is not None:
            result["macd"] = macd

        # BOLL
        boll = cls.calculate_boll(
            closes,
            period=boll_params.get("period", 20),
            std_dev=boll_params.get("std_dev", 2),
        )
        if boll is not None:
            result["boll"] = boll

        # MA
        ma = cls.calculate_ma(closes, periods=ma_periods)
        if ma is not None:
            result["ma"] = ma

        # KDJ (requires highs and lows)
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

- [ ] **Step 2: 创建 test_indicators.py — RSI 测试**

```python
"""Tests for the TechnicalIndicators module."""

import pytest

from info_monitor_worker.indicators import TechnicalIndicators


class TestRSI:
    def test_rsi_with_enough_data(self):
        # 20 sample prices (generally uptrending)
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
        # Steadily rising prices
        prices = [float(40 + i * 0.5) for i in range(20)]
        result = TechnicalIndicators.calculate_rsi(prices, period=14)
        assert result is not None
        assert result > 50

    def test_rsi_downtrend_is_below_50(self):
        # Steadily falling prices
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
        # Steadily rising prices should produce high J
        n = 20
        highs = [float(100 + i) for i in range(n)]
        lows = [float(95 + i) for i in range(n)]
        closes = [float(98 + i) for i in range(n)]
        result = TechnicalIndicators.calculate_kdj(highs, lows, closes)
        assert result is not None
        assert result["j"] > 50  # Should be high in uptrend


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

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_indicators.py -v`
Expected: All 18 tests PASS

- [ ] **Step 4: 提交指标计算模块**

```bash
git add apps/python-worker/src/info_monitor_worker/indicators.py apps/python-worker/tests/test_indicators.py
git commit -m "feat(worker): add technical indicators calculation module (RSI/MACD/KDJ/BOLL/MA)"
```

---

## Task 2: 集成指标计算到 PriceNormalizer

**Files:**
- Modify: `apps/python-worker/src/info_monitor_worker/normalizers/price.py`
- Test: `apps/python-worker/tests/test_generic_price_list.py` (existing, verify not broken)

- [ ] **Step 1: 在 price.py 顶部添加导入**

```python
from info_monitor_worker.indicators import TechnicalIndicators
```

- [ ] **Step 2: 在 PriceNormalizer.normalize() 中为 kline 数据计算指标**

在 `PriceNormalizer` 类的 `normalize` 方法中，在构建 records 之后，添加指标计算逻辑：

```python
    def normalize(self, payload: Any) -> List[NormalizedRecord]:
        records: List[NormalizedRecord] = []

        for item in payload:
            occurred_at = str(item["occurred_at"])
            symbol = item.get("symbol")
            url = item.get("url")
            spec = item.get("spec")
            logical_key = None

            if symbol:
                logical_key = f"price:{symbol}:{occurred_at[:10]}"
            elif url:
                logical_key = f"price:{url}:{occurred_at}"
            elif spec:
                logical_key = f"price:{spec}:{occurred_at}:{item['title']}"

            # Compute trust indicators
            trust_score, trust_factors, risk_level = _compute_trust_score(item)

            # Compute technical indicators for kline data
            indicators: Dict[str, Any] = {}
            close_prices = item.get("close_prices")  # Historical close prices from adapter
            high_prices = item.get("high_prices")
            low_prices = item.get("low_prices")

            if close_prices and len(close_prices) >= 2:
                indicators = TechnicalIndicators.calculate_all(
                    closes=close_prices,
                    highs=high_prices,
                    lows=low_prices,
                )

            records.append(
                NormalizedRecord(
                    record_type="price",
                    title=str(item["title"]),
                    occurred_at=occurred_at,
                    source_url=item.get("url"),
                    logical_key=logical_key,
                    content={
                        "price": item["price"],
                        "currency": item.get("currency", "CNY"),
                        "spec": item.get("spec"),
                        "url": item.get("url"),
                        "open": item.get("open"),
                        "high": item.get("high"),
                        "low": item.get("low"),
                        "volume": item.get("volume"),
                        "amount": item.get("amount"),
                        "amplitude": item.get("amplitude"),
                        "symbol": item.get("symbol"),
                        "display_name": item.get("display_name"),
                        "is_outlier": item.get("is_outlier", False),
                        "outlier_reason": item.get("outlier_reason"),
                        # Trust indicators
                        "trust_score": trust_score,
                        "trust_factors": trust_factors,
                        "risk_level": risk_level,
                        # Technical indicators (only for kline data)
                        "indicators": indicators if indicators else None,
                    },
                )
            )

        return records
```

- [ ] **Step 3: 运行现有测试确认不被破坏**

Run: `cd apps/python-worker && python -m pytest tests/test_generic_price_list.py -v`
Expected: All existing tests PASS

- [ ] **Step 4: 提交改动**

```bash
git add apps/python-worker/src/info_monitor_worker/normalizers/price.py
git commit -m "feat(worker): integrate technical indicators into PriceNormalizer"
```

---

## Task 3: 实现 RSI 信号规则

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/event_rules/rsi_signal.py`
- Test: `apps/python-worker/tests/test_rsi_signal_rule.py`

- [ ] **Step 1: 创建 rsi_signal.py**

```python
"""RSI signal event rule — detect overbought/oversold conditions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class RSISignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class RSISignalRule(BaseEventRule):
    """Detect RSI overbought/oversold conditions.

    Configuration options:
    - overbought_threshold: RSI level to trigger overbought signal (default: 70)
    - oversold_threshold: RSI level to trigger oversold signal (default: 30)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> RSISignalResult:
        config = config or {}
        overbought_threshold = config.get("overbought_threshold", 70)
        oversold_threshold = config.get("oversold_threshold", 30)

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return RSISignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        rsi = indicators.get("rsi_14")
        if rsi is None:
            return RSISignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        # Overbought condition
        if rsi >= overbought_threshold:
            return RSISignalResult(
                triggered=True,
                signal="bearish",
                title=f"RSI 超买警告: {rsi:.1f}",
                summary=f"RSI(14) = {rsi:.1f}，超过 {overbought_threshold} 超买线，价格 {price} 可能面临回调压力",
                evidence=[
                    f"RSI(14): {rsi:.1f}",
                    f"超买阈值: {overbought_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        # Oversold condition
        if rsi <= oversold_threshold:
            return RSISignalResult(
                triggered=True,
                signal="bullish",
                title=f"RSI 超卖信号: {rsi:.1f}",
                summary=f"RSI(14) = {rsi:.1f}，低于 {oversold_threshold} 超卖线，价格 {price} 可能存在反弹机会",
                evidence=[
                    f"RSI(14): {rsi:.1f}",
                    f"超卖阈值: {oversold_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return RSISignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

- [ ] **Step 2: 创建 test_rsi_signal_rule.py**

```python
"""Tests for the RSISignalRule event rule."""

from info_monitor_worker.event_rules.rsi_signal import RSISignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_rsi(rsi_value: float, price: float = 100.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={
            "price": price,
            "symbol": "sh600519",
            "indicators": {
                "rsi_14": rsi_value,
            },
        },
    )


class TestRSISignalRule:
    def setup_method(self):
        self.rule = RSISignalRule()

    def test_triggers_overbought_when_rsi_above_70(self):
        record = _make_price_record_with_rsi(75.5)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bearish"
        assert "超买" in result.title

    def test_triggers_oversold_when_rsi_below_30(self):
        record = _make_price_record_with_rsi(25.3)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bullish"
        assert "超卖" in result.title

    def test_no_trigger_when_rsi_normal(self):
        record = _make_price_record_with_rsi(50.0)
        result = self.rule.evaluate(record)
        assert result.triggered is False
        assert result.signal == "neutral"

    def test_no_trigger_when_no_indicators(self):
        record = NormalizedRecord(
            record_type="price",
            title="Stock",
            occurred_at="2026-06-01T09:30:00Z",
            content={"price": 100.0},
        )
        result = self.rule.evaluate(record)
        assert result.triggered is False

    def test_custom_thresholds(self):
        record = _make_price_record_with_rsi(80.0)
        result = self.rule.evaluate(record, config={"overbought_threshold": 85})
        assert result.triggered is False

    def test_evidence_contains_symbol(self):
        record = _make_price_record_with_rsi(75.0)
        result = self.rule.evaluate(record)
        assert any("sh600519" in e for e in result.evidence)
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_rsi_signal_rule.py -v`
Expected: All 6 tests PASS

- [ ] **Step 4: 提交 RSI 规则**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/rsi_signal.py apps/python-worker/tests/test_rsi_signal_rule.py
git commit -m "feat(worker): add RSI overbought/oversold event rule"
```

---

## Task 4: 实现 MACD 信号规则

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/event_rules/macd_signal.py`
- Test: `apps/python-worker/tests/test_macd_signal_rule.py`

- [ ] **Step 1: 创建 macd_signal.py**

```python
"""MACD signal event rule — detect golden cross/death cross signals."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MACDSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MACDSignalRule(BaseEventRule):
    """Detect MACD golden cross and death cross signals.

    Configuration options:
    - signal_types: List of signals to trigger on (default: ["golden_cross", "death_cross"])
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MACDSignalResult:
        config = config or {}
        signal_types = config.get("signal_types", ["golden_cross", "death_cross"])

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return MACDSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        macd = indicators.get("macd")
        if not macd:
            return MACDSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        macd_signal = macd.get("signal", "neutral")
        dif = macd.get("dif", 0)
        dea = macd.get("dea", 0)
        hist = macd.get("hist", 0)
        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        if macd_signal not in signal_types:
            return MACDSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        if macd_signal == "golden_cross":
            return MACDSignalResult(
                triggered=True,
                signal="bullish",
                title="MACD 金叉信号",
                summary=f"DIF({dif:.3f}) 上穿 DEA({dea:.3f})，MACD 金叉形成，价格 {price} 可能开启上涨趋势",
                evidence=[
                    f"DIF: {dif:.3f}",
                    f"DEA: {dea:.3f}",
                    f"MACD柱: {hist:.3f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        if macd_signal == "death_cross":
            return MACDSignalResult(
                triggered=True,
                signal="bearish",
                title="MACD 死叉信号",
                summary=f"DIF({dif:.3f}) 下穿 DEA({dea:.3f})，MACD 死叉形成，价格 {price} 可能开启下跌趋势",
                evidence=[
                    f"DIF: {dif:.3f}",
                    f"DEA: {dea:.3f}",
                    f"MACD柱: {hist:.3f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return MACDSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

- [ ] **Step 2: 创建 test_macd_signal_rule.py**

```python
"""Tests for the MACDSignalRule event rule."""

from info_monitor_worker.event_rules.macd_signal import MACDSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_macd(signal: str, dif: float = 1.0, dea: float = 0.8, hist: float = 0.4) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={
            "price": 100.0,
            "symbol": "sh600519",
            "indicators": {
                "macd": {
                    "dif": dif,
                    "dea": dea,
                    "hist": hist,
                    "signal": signal,
                },
            },
        },
    )


class TestMACDSignalRule:
    def setup_method(self):
        self.rule = MACDSignalRule()

    def test_triggers_golden_cross(self):
        record = _make_price_record_with_macd("golden_cross")
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bullish"
        assert "金叉" in result.title

    def test_triggers_death_cross(self):
        record = _make_price_record_with_macd("death_cross", dif=-1.0, dea=-0.8, hist=-0.4)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bearish"
        assert "死叉" in result.title

    def test_no_trigger_on_bullish_signal(self):
        record = _make_price_record_with_macd("bullish")
        result = self.rule.evaluate(record)
        assert result.triggered is False

    def test_custom_signal_types(self):
        record = _make_price_record_with_macd("bullish")
        result = self.rule.evaluate(record, config={"signal_types": ["bullish", "golden_cross"]})
        assert result.triggered is True

    def test_no_trigger_when_no_macd(self):
        record = NormalizedRecord(
            record_type="price",
            title="Stock",
            occurred_at="2026-06-01T09:30:00Z",
            content={"price": 100.0, "indicators": {"rsi_14": 50.0}},
        )
        result = self.rule.evaluate(record)
        assert result.triggered is False
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_macd_signal_rule.py -v`
Expected: All 5 tests PASS

- [ ] **Step 4: 提交 MACD 规则**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/macd_signal.py apps/python-worker/tests/test_macd_signal_rule.py
git commit -m "feat(worker): add MACD golden/death cross event rule"
```

---

## Task 5: 实现 KDJ 信号规则

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/event_rules/kdj_signal.py`
- Test: `apps/python-worker/tests/test_kdj_signal_rule.py`

- [ ] **Step 1: 创建 kdj_signal.py**

```python
"""KDJ signal event rule — detect overbought/oversold conditions via J line."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class KDJSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class KDJSignalRule(BaseEventRule):
    """Detect KDJ overbought/oversold conditions using J line.

    Configuration options:
    - overbought_threshold: J value to trigger overbought (default: 100)
    - oversold_threshold: J value to trigger oversold (default: 0)
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> KDJSignalResult:
        config = config or {}
        overbought_threshold = config.get("overbought_threshold", 100)
        oversold_threshold = config.get("oversold_threshold", 0)

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        kdj = indicators.get("kdj")
        if not kdj:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        j_value = kdj.get("j")
        k_value = kdj.get("k", 0)
        d_value = kdj.get("d", 0)

        if j_value is None:
            return KDJSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        # Overbought: J > 100
        if j_value > overbought_threshold:
            return KDJSignalResult(
                triggered=True,
                signal="bearish",
                title=f"KDJ 超买警告: J={j_value:.1f}",
                summary=f"KDJ J值 = {j_value:.1f}，超过 {overbought_threshold}，K={k_value:.1f} D={d_value:.1f}，价格 {price} 可能面临回调",
                evidence=[
                    f"J值: {j_value:.1f}",
                    f"K值: {k_value:.1f}",
                    f"D值: {d_value:.1f}",
                    f"超买阈值: {overbought_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        # Oversold: J < 0
        if j_value < oversold_threshold:
            return KDJSignalResult(
                triggered=True,
                signal="bullish",
                title=f"KDJ 超卖信号: J={j_value:.1f}",
                summary=f"KDJ J值 = {j_value:.1f}，低于 {oversold_threshold}，K={k_value:.1f} D={d_value:.1f}，价格 {price} 可能存在反弹机会",
                evidence=[
                    f"J值: {j_value:.1f}",
                    f"K值: {k_value:.1f}",
                    f"D值: {d_value:.1f}",
                    f"超卖阈值: {oversold_threshold}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return KDJSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

- [ ] **Step 2: 创建 test_kdj_signal_rule.py**

```python
"""Tests for the KDJSignalRule event rule."""

from info_monitor_worker.event_rules.kdj_signal import KDJSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_kdj(j: float, k: float = 50.0, d: float = 50.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={
            "price": 100.0,
            "symbol": "sh600519",
            "indicators": {
                "kdj": {"k": k, "d": d, "j": j},
            },
        },
    )


class TestKDJSignalRule:
    def setup_method(self):
        self.rule = KDJSignalRule()

    def test_triggers_overbought_when_j_above_100(self):
        record = _make_price_record_with_kdj(j=120.5, k=85.0, d=70.0)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bearish"
        assert "超买" in result.title

    def test_triggers_oversold_when_j_below_0(self):
        record = _make_price_record_with_kdj(j=-15.3, k=20.0, d=30.0)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bullish"
        assert "超卖" in result.title

    def test_no_trigger_when_j_normal(self):
        record = _make_price_record_with_kdj(j=50.0)
        result = self.rule.evaluate(record)
        assert result.triggered is False

    def test_custom_thresholds(self):
        record = _make_price_record_with_kdj(j=105.0)
        result = self.rule.evaluate(record, config={"overbought_threshold": 120})
        assert result.triggered is False
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_kdj_signal_rule.py -v`
Expected: All 4 tests PASS

- [ ] **Step 4: 提交 KDJ 规则**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/kdj_signal.py apps/python-worker/tests/test_kdj_signal_rule.py
git commit -m "feat(worker): add KDJ overbought/oversold event rule"
```

---

## Task 6: 实现 BOLL 信号规则

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/event_rules/boll_signal.py`
- Test: `apps/python-worker/tests/test_boll_signal_rule.py`

- [ ] **Step 1: 创建 boll_signal.py**

```python
"""BOLL signal event rule — detect price breakouts above/below Bollinger Bands."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class BOLLSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class BOLLSignalRule(BaseEventRule):
    """Detect price breakouts above upper or below lower Bollinger Bands.

    Configuration options:
    - band: 'upper', 'lower', or 'both' (default: 'both')
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> BOLLSignalResult:
        config = config or {}
        band = config.get("band", "both")

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return BOLLSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        boll = indicators.get("boll")
        if not boll:
            return BOLLSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        position = boll.get("position", "unknown")
        upper = boll.get("upper")
        middle = boll.get("middle")
        lower = boll.get("lower")
        current_price = boll.get("current_price", 0)
        symbol = normalized_record.content.get("symbol", "")

        # Above upper band — potential overbought / breakout
        if position == "above_upper" and band in ("upper", "both"):
            return BOLLSignalResult(
                triggered=True,
                signal="bearish",
                title="BOLL 突破上轨警告",
                summary=f"价格 {current_price} 突破布林带上轨 {upper}，可能面临回调或突破确认",
                evidence=[
                    f"当前价格: {current_price}",
                    f"上轨: {upper}",
                    f"中轨: {middle}",
                    f"下轨: {lower}",
                    f"标的: {symbol}",
                ],
            )

        # Below lower band — potential oversold / breakdown
        if position == "below_lower" and band in ("lower", "both"):
            return BOLLSignalResult(
                triggered=True,
                signal="bullish",
                title="BOLL 突破下轨信号",
                summary=f"价格 {current_price} 跌破布林带下轨 {lower}，可能存在反弹机会或趋势加速",
                evidence=[
                    f"当前价格: {current_price}",
                    f"上轨: {upper}",
                    f"中轨: {middle}",
                    f"下轨: {lower}",
                    f"标的: {symbol}",
                ],
            )

        return BOLLSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

- [ ] **Step 2: 创建 test_boll_signal_rule.py**

```python
"""Tests for the BOLLSignalRule event rule."""

from info_monitor_worker.event_rules.boll_signal import BOLLSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_boll(position: str, current_price: float = 120.0) -> NormalizedRecord:
    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={
            "price": current_price,
            "symbol": "sh600519",
            "indicators": {
                "boll": {
                    "upper": 118.0,
                    "middle": 115.0,
                    "lower": 112.0,
                    "position": position,
                    "current_price": current_price,
                },
            },
        },
    )


class TestBOLLSignalRule:
    def setup_method(self):
        self.rule = BOLLSignalRule()

    def test_triggers_above_upper_band(self):
        record = _make_price_record_with_boll("above_upper", current_price=120.5)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bearish"
        assert "上轨" in result.title

    def test_triggers_below_lower_band(self):
        record = _make_price_record_with_boll("below_lower", current_price=110.2)
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bullish"
        assert "下轨" in result.title

    def test_no_trigger_in_middle(self):
        record = _make_price_record_with_boll("above_middle", current_price=116.0)
        result = self.rule.evaluate(record)
        assert result.triggered is False

    def test_filter_by_band_type(self):
        record = _make_price_record_with_boll("above_upper")
        result = self.rule.evaluate(record, config={"band": "lower"})
        assert result.triggered is False
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_boll_signal_rule.py -v`
Expected: All 4 tests PASS

- [ ] **Step 4: 提交 BOLL 规则**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/boll_signal.py apps/python-worker/tests/test_boll_signal_rule.py
git commit -m "feat(worker): add BOLL breakout event rule"
```

---

## Task 7: 实现 MA 均线排列信号规则

**Files:**
- Create: `apps/python-worker/src/info_monitor_worker/event_rules/moving_average_signal.py`
- Test: `apps/python-worker/tests/test_moving_average_signal_rule.py`

- [ ] **Step 1: 创建 moving_average_signal.py**

```python
"""Moving Average signal event rule — detect bullish/bearish MA alignment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MovingAverageSignalResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MovingAverageSignalRule(BaseEventRule):
    """Detect bullish or bearish moving average alignment.

    Configuration options:
    - alignment: 'bullish', 'bearish', or 'both' (default: 'both')
    """

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MovingAverageSignalResult:
        config = config or {}
        alignment = config.get("alignment", "both")

        indicators = normalized_record.content.get("indicators")
        if not indicators:
            return MovingAverageSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        ma = indicators.get("ma")
        if not ma:
            return MovingAverageSignalResult(
                triggered=False,
                signal="neutral",
                title="",
                summary="",
                evidence=[],
            )

        trend = ma.get("trend", "unknown")
        price = normalized_record.content.get("price", 0)
        symbol = normalized_record.content.get("symbol", "")

        # Bullish alignment: MA5 > MA10 > MA20 > MA60
        if trend == "bullish_alignment" and alignment in ("bullish", "both"):
            return MovingAverageSignalResult(
                triggered=True,
                signal="bullish",
                title="均线多头排列",
                summary=f"MA5({ma.get('ma5', 0):.2f}) > MA10({ma.get('ma10', 0):.2f}) > MA20({ma.get('ma20', 0):.2f}) > MA60({ma.get('ma60', 0):.2f})，均线呈多头排列，价格 {price} 处于强势状态",
                evidence=[
                    f"MA5: {ma.get('ma5', 0):.2f}",
                    f"MA10: {ma.get('ma10', 0):.2f}",
                    f"MA20: {ma.get('ma20', 0):.2f}",
                    f"MA60: {ma.get('ma60', 0):.2f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        # Bearish alignment: MA5 < MA10 < MA20 < MA60
        if trend == "bearish_alignment" and alignment in ("bearish", "both"):
            return MovingAverageSignalResult(
                triggered=True,
                signal="bearish",
                title="均线空头排列",
                summary=f"MA5({ma.get('ma5', 0):.2f}) < MA10({ma.get('ma10', 0):.2f}) < MA20({ma.get('ma20', 0):.2f}) < MA60({ma.get('ma60', 0):.2f})，均线呈空头排列，价格 {price} 处于弱势状态",
                evidence=[
                    f"MA5: {ma.get('ma5', 0):.2f}",
                    f"MA10: {ma.get('ma10', 0):.2f}",
                    f"MA20: {ma.get('ma20', 0):.2f}",
                    f"MA60: {ma.get('ma60', 0):.2f}",
                    f"当前价格: {price}",
                    f"标的: {symbol}",
                ],
            )

        return MovingAverageSignalResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

- [ ] **Step 2: 创建 test_moving_average_signal_rule.py**

```python
"""Tests for the MovingAverageSignalRule event rule."""

from info_monitor_worker.event_rules.moving_average_signal import MovingAverageSignalRule
from info_monitor_worker.models import NormalizedRecord


def _make_price_record_with_ma(trend: str, mas: dict = None) -> NormalizedRecord:
    default_mas = {
        "ma5": 120.0,
        "ma10": 118.0,
        "ma20": 115.0,
        "ma60": 110.0,
        "trend": trend,
    }
    if mas:
        default_mas.update(mas)

    return NormalizedRecord(
        record_type="price",
        title="Stock Price",
        occurred_at="2026-06-01T09:30:00Z",
        content={
            "price": 121.0,
            "symbol": "sh600519",
            "indicators": {
                "ma": default_mas,
            },
        },
    )


class TestMovingAverageSignalRule:
    def setup_method(self):
        self.rule = MovingAverageSignalRule()

    def test_triggers_bullish_alignment(self):
        record = _make_price_record_with_ma("bullish_alignment")
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bullish"
        assert "多头排列" in result.title

    def test_triggers_bearish_alignment(self):
        record = _make_price_record_with_ma(
            "bearish_alignment",
            {"ma5": 110.0, "ma10": 112.0, "ma20": 115.0, "ma60": 120.0},
        )
        result = self.rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "bearish"
        assert "空头排列" in result.title

    def test_no_trigger_on_mixed(self):
        record = _make_price_record_with_ma("mixed")
        result = self.rule.evaluate(record)
        assert result.triggered is False

    def test_filter_by_alignment_type(self):
        record = _make_price_record_with_ma("bullish_alignment")
        result = self.rule.evaluate(record, config={"alignment": "bearish"})
        assert result.triggered is False
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd apps/python-worker && python -m pytest tests/test_moving_average_signal_rule.py -v`
Expected: All 4 tests PASS

- [ ] **Step 4: 提交 MA 规则**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/moving_average_signal.py apps/python-worker/tests/test_moving_average_signal_rule.py
git commit -m "feat(worker): add MA alignment event rule"
```

---

## Task 8: 注册信号规则并接入 WorkerService

**Files:**
- Modify: `apps/python-worker/src/info_monitor_worker/event_rules/__init__.py`
- Modify: `apps/python-worker/src/info_monitor_worker/service.py`

- [ ] **Step 1: 在 event_rules/__init__.py 中添加导入和导出**

```python
"""High-signal event rules."""

from info_monitor_worker.event_rules.boll_signal import BOLLSignalRule
from info_monitor_worker.event_rules.consecutive_movement import ConsecutiveMovementRule
from info_monitor_worker.event_rules.financial_direction import FinancialDirectionRule
from info_monitor_worker.event_rules.keyword_match import KeywordMatchRule
from info_monitor_worker.event_rules.kdj_signal import KDJSignalRule
from info_monitor_worker.event_rules.macro_deviation import MacroDeviationRule
from info_monitor_worker.event_rules.macd_signal import MACDSignalRule
from info_monitor_worker.event_rules.moving_average_signal import MovingAverageSignalRule
from info_monitor_worker.event_rules.price_30d_low import ThirtyDayLowRule
from info_monitor_worker.event_rules.price_breakout import PriceBreakoutRule
from info_monitor_worker.event_rules.rsi_signal import RSISignalRule

__all__ = [
    "BOLLSignalRule",
    "ConsecutiveMovementRule",
    "FinancialDirectionRule",
    "KeywordMatchRule",
    "KDJSignalRule",
    "MacroDeviationRule",
    "MACDSignalRule",
    "MovingAverageSignalRule",
    "ThirtyDayLowRule",
    "PriceBreakoutRule",
    "RSISignalRule",
]
```

- [ ] **Step 2: 在 WorkerService 中初始化技术指标规则**

在 `apps/python-worker/src/info_monitor_worker/service.py` 顶部补充导入：

```python
from info_monitor_worker.event_rules.boll_signal import BOLLSignalRule
from info_monitor_worker.event_rules.kdj_signal import KDJSignalRule
from info_monitor_worker.event_rules.macd_signal import MACDSignalRule
from info_monitor_worker.event_rules.moving_average_signal import MovingAverageSignalRule
from info_monitor_worker.event_rules.rsi_signal import RSISignalRule
```

在 `WorkerService.__init__` 中初始化规则实例：

```python
        self.rsi_signal_rule = RSISignalRule()
        self.macd_signal_rule = MACDSignalRule()
        self.kdj_signal_rule = KDJSignalRule()
        self.boll_signal_rule = BOLLSignalRule()
        self.ma_signal_rule = MovingAverageSignalRule()
```

- [ ] **Step 3: 在 _evaluate_events 的 info_type == 'price' 分支内追加指标规则评估**

在现有 `price_30d_low` 评估之后追加以下代码：

```python
            indicators = normalized_record.content.get("indicators")
            if indicators:
                indicator_rules = [
                    ("rsi_signal", "rsi_signal", self.rsi_signal_rule, normalized_record, None),
                    ("macd_signal", "macd_signal", self.macd_signal_rule, normalized_record, None),
                    ("kdj_signal", "kdj_signal", self.kdj_signal_rule, normalized_record, None),
                    ("boll_signal", "boll_signal", self.boll_signal_rule, normalized_record, None),
                    ("ma_signal", "ma_signal", self.ma_signal_rule, normalized_record, None),
                ]

                for event_type, event_key_suffix, rule, record, extra in indicator_rules:
                    rule_result = rule.evaluate(record)
                    if rule_result.triggered:
                        indicator_event_key = (
                            f"{theme.theme_id}:{source.source_id}:{event_key_suffix}:"
                            f"{record_identity}:{normalized_record.occurred_at}"
                        )
                        self._emit_event_with_notification(
                            connection=connection,
                            run_id=run_id,
                            theme_id=theme.theme_id,
                            source_id=source.source_id,
                            change_id=change_id,
                            event_key=indicator_event_key,
                            event_type=event_type,
                            signal=rule_result.signal,
                            title=rule_result.title,
                            summary=rule_result.summary,
                            occurred_at=normalized_record.occurred_at,
                            evidence=rule_result.evidence,
                        )
```

- [ ] **Step 4: 运行相关现有测试确认集成未破坏主流程**

Run:
```bash
cd apps/python-worker && python -m pytest tests/test_price_30d_low_rule.py tests/test_generic_price_list.py -v
```
Expected: 全部通过

- [ ] **Step 5: 提交规则注册与服务集成**

```bash
git add apps/python-worker/src/info_monitor_worker/event_rules/__init__.py apps/python-worker/src/info_monitor_worker/service.py
git commit -m "feat(worker): register technical indicator event rules and integrate into service"
```

---

## Task 9: 扩展共享类型契约

**Files:**
- Modify: `packages/shared-contracts/src/index.ts`

- [ ] **Step 1: 在 shared-contracts 中补充价格记录的 indicators 类型**

在现有类型附近追加以下类型定义：

```typescript
export type MACDIndicator = {
  dif?: number | null;
  dea?: number | null;
  hist?: number | null;
  signal?: string | null;
};

export type KDJIndicator = {
  k?: number | null;
  d?: number | null;
  j?: number | null;
  signal?: string | null;
};

export type BOLLIndicator = {
  upper?: number | null;
  middle?: number | null;
  lower?: number | null;
  position?: string | null;
  currentPrice?: number | null;
};

export type MAIndicator = {
  ma5?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  trend?: string | null;
};

export type TechnicalIndicators = {
  rsi14?: number | null;
  macd?: MACDIndicator | null;
  kdj?: KDJIndicator | null;
  boll?: BOLLIndicator | null;
  ma?: MAIndicator | null;
};
```

- [ ] **Step 2: 在 ThemeRecord.content 所在的使用点，补充页面层类型（可选约定）**

若 `ThemeRecord.content` 已采用 `Record<string, unknown>`，保持后端兼容；前端页面/组件使用时按接口约定解释 `indicators`。

- [ ] **Step 3: 类型检查（推荐）**

Run:
```bash
cd apps/frontend && npm run typecheck
cd apps/api && npm run typecheck
```
Expected: 无 TS 报错

- [ ] **Step 4: 提交类型契约扩展**

```bash
git add packages/shared-contracts/src/index.ts
git commit -m "feat(contracts): add technical indicator types for price records"
```

---

## Task 10: 前端实现技术指标面板与信号卡

**Files:**
- Create: `apps/frontend/src/views/workspace/[workspaceId]/reports/components/TechnicalIndicatorsPanel.vue`
- Create: `apps/frontend/src/views/workspace/[workspaceId]/reports/components/IndicatorSignalCard.vue`
- Modify: `apps/frontend/src/views/workspace/[workspaceId]/reports/components/StockMarketReportsBoard.vue`

- [ ] **Step 1: 创建 IndicatorSignalCard.vue**

```vue
<script setup lang="ts">
defineProps<{
  title: string
  value: string
  signal: string
  description?: string
}>()

const signalColors: Record<string, string> = {
  bullish: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bearish: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  overbought: 'bg-amber-50 text-amber-700 border-amber-200',
  oversold: 'bg-sky-50 text-sky-700 border-sky-200',
  golden_cross: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  death_cross: 'bg-rose-50 text-rose-700 border-rose-200',
  bullish_alignment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bearish_alignment: 'bg-rose-50 text-rose-700 border-rose-200',
}
</script>

<template>
  <div class="rounded-2xl border border-slate-400/15 bg-white/70 p-4">
    <div class="flex items-center justify-between">
      <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">{{ title }}</div>
      <span
        class="rounded-full border px-2 py-0.5 text-[0.76rem] font-semibold"
        :class="signalColors[signal] ?? signalColors.neutral"
      >
        {{ signal }}
      </span>
    </div>
    <div class="mt-2 text-[1.15rem] font-semibold text-ink-heading">{{ value }}</div>
    <p v-if="description" class="mt-1 text-[0.88rem] leading-6 text-ink-body">{{ description }}</p>
  </div>
</template>
```

- [ ] **Step 2: 创建 TechnicalIndicatorsPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import IndicatorSignalCard from './IndicatorSignalCard.vue'

type MACDIndicator = {
  dif?: number | null
  dea?: number | null
  hist?: number | null
  signal?: string | null
}

type KDJIndicator = {
  k?: number | null
  d?: number | null
  j?: number | null
  signal?: string | null
}

type BOLLIndicator = {
  upper?: number | null
  middle?: number | null
  lower?: number | null
  position?: string | null
  currentPrice?: number | null
}

type MAIndicator = {
  ma5?: number | null
  ma10?: number | null
  ma20?: number | null
  ma60?: number | null
  trend?: string | null
}

type TechnicalIndicators = {
  rsi14?: number | null
  macd?: MACDIndicator | null
  kdj?: KDJIndicator | null
  boll?: BOLLIndicator | null
  ma?: MAIndicator | null
}

const props = defineProps<{
  indicators?: TechnicalIndicators | null
}>()

const hasIndicators = computed(() => {
  return props.indicators && Object.keys(props.indicators).length > 0
})

const rsiCard = computed(() => {
  const rsi = props.indicators?.rsi14
  if (rsi == null) return null

  let signal = 'neutral'
  let description = 'RSI 处于正常区间'

  if (rsi >= 70) {
    signal = 'overbought'
    description = 'RSI 超买区间，价格可能面临回调压力'
  } else if (rsi <= 30) {
    signal = 'oversold'
    description = 'RSI 超卖区间，价格可能存在反弹机会'
  }

  return {
    title: 'RSI(14)',
    value: rsi.toFixed(1),
    signal,
    description,
  }
})

const macdCard = computed(() => {
  const macd = props.indicators?.macd
  if (!macd) return null

  return {
    title: 'MACD',
    value: `DIF ${macd.dif?.toFixed(3) ?? '-'} / DEA ${macd.dea?.toFixed(3) ?? '-'}`,
    signal: macd.signal ?? 'neutral',
    description:
      macd.signal === 'golden_cross'
        ? 'DIF 上穿 DEA，金叉形成'
        : macd.signal === 'death_cross'
        ? 'DIF 下穿 DEA，死叉形成'
        : undefined,
  }
})

const kdjCard = computed(() => {
  const kdj = props.indicators?.kdj
  if (!kdj) return null

  return {
    title: 'KDJ',
    value: `K ${kdj.k?.toFixed(1) ?? '-'} / D ${kdj.d?.toFixed(1) ?? '-'} / J ${kdj.j?.toFixed(1) ?? '-'}`,
    signal: kdj.signal ?? 'neutral',
  }
})

const bollCard = computed(() => {
  const boll = props.indicators?.boll
  if (!boll) return null

  const upper = boll.upper?.toFixed(2) ?? '-'
  const middle = boll.middle?.toFixed(2) ?? '-'
  const lower = boll.lower?.toFixed(2) ?? '-'

  return {
    title: 'BOLL(20)',
    value: `上轨 ${upper} / 中轨 ${middle} / 下轨 ${lower}`,
    signal: boll.position === 'above_upper' ? 'bearish' : boll.position === 'below_lower' ? 'bullish' : 'neutral',
  }
})

const maCard = computed(() => {
  const ma = props.indicators?.ma
  if (!ma) return null

  return {
    title: '均线排列',
    value: `MA5 ${ma.ma5?.toFixed(2) ?? '-'} / MA10 ${ma.ma10?.toFixed(2) ?? '-'}`,
    signal: ma.trend === 'bullish_alignment' ? 'bullish_alignment' : ma.trend === 'bearish_alignment' ? 'bearish_alignment' : 'neutral',
  }
})
</script>

<template>
  <article class="card">
    <div class="card-topline">
      <h3>技术指标</h3>
      <span class="text-[0.88rem] text-ink-secondary">当前周期关键信号</span>
    </div>

    <div v-if="!hasIndicators" class="rounded-2xl bg-slate-50/90 px-4 py-6 text-[0.92rem] leading-6 text-ink-secondary">
      暂无可用的技术指标数据，请确认数据源已返回 K 线序列。
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <IndicatorSignalCard
        v-if="rsiCard"
        :title="rsiCard.title"
        :value="rsiCard.value"
        :signal="rsiCard.signal"
        :description="rsiCard.description"
      />
      <IndicatorSignalCard
        v-if="macdCard"
        :title="macdCard.title"
        :value="macdCard.value"
        :signal="macdCard.signal"
        :description="macdCard.description"
      />
      <IndicatorSignalCard
        v-if="kdjCard"
        :title="kdjCard.title"
        :value="kdjCard.value"
        :signal="kdjCard.signal"
      />
      <IndicatorSignalCard
        v-if="bollCard"
        :title="bollCard.title"
        :value="bollCard.value"
        :signal="bollCard.signal"
      />
      <IndicatorSignalCard
        v-if="maCard"
        :title="maCard.title"
        :value="maCard.value"
        :signal="maCard.signal"
      />
    </div>
  </article>
</template>
```

- [ ] **Step 3: 在 StockMarketReportsBoard.vue 中引入 TechnicalIndicatorsPanel**

在组件顶部导入：

```vue
<script setup lang="ts">
// 现有导入保持不变
import TechnicalIndicatorsPanel from './TechnicalIndicatorsPanel.vue'
</script>
```

在模板内现有 `card-topline` 区域附近追加指标面板区块（示例位置：`盘后结构` 板块后）：

```vue
<TechnicalIndicatorsPanel :indicators="latestPriceIndicators" />
```

在 `<script setup>` 中补充读取逻辑：

```ts
const latestPriceIndicators = computed(() => {
  const firstRecordWithIndicators = effectiveStockMarketReport.value?.timeline
    ?.map((item) => item as unknown as Record<string, unknown>)
    ?.find((item) => item && (item as Record<string, unknown>).indicators)

  if (!firstRecordWithIndicators) {
    return null
  }

  return (firstRecordWithIndicators as Record<string, unknown>).indicators as Record<string, unknown> | null
})
```

- [ ] **Step 4: 前端构建与类型检查**

Run:
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run build
```
Expected: 成功构建

- [ ] **Step 5: 提交前端指标面板**

```bash
git add apps/frontend/src/views/workspace/[workspaceId]/reports/components/TechnicalIndicatorsPanel.vue apps/frontend/src/views/workspace/[workspaceId]/reports/components/IndicatorSignalCard.vue apps/frontend/src/views/workspace/[workspaceId]/reports/components/StockMarketReportsBoard.vue
git commit -m "feat(frontend): add technical indicators panel and signal cards to stock reports"
```

---

## Task 11: 端到端验证

**Files:**
- 运行现有测试与构建验证

- [ ] **Step 1: 运行 Worker 单测**

Run:
```bash
cd apps/python-worker && python -m pytest tests -v
```
Expected: 全部通过

- [ ] **Step 2: 运行 API 类型检查**

Run:
```bash
cd apps/api && npm run typecheck
```
Expected: 无类型报错

- [ ] **Step 3: 运行前端类型检查与构建**

Run:
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run build
```
Expected: 成功

- [ ] **Step 4: 提交最后集成验证说明（可选）**

```bash
git add -A
git commit -m "chore: finalize technical indicators integration verification"
```
