from __future__ import annotations

from typing import Any, Dict, List

from info_monitor_worker.indicators import TechnicalIndicators
from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.normalizers.base import BaseNormalizer


def _compute_trust_score(item: dict) -> tuple[int, list[str], str]:
    """Compute trust score for a price item.

    Returns (score, factors, risk_level) where:
    - score: 0-100 (higher = more trustworthy)
    - factors: list of human-readable trust factors
    - risk_level: "likely_valid", "suspicious", "high_risk"
    """
    score = 70  # Base score
    factors: list[str] = []

    price = item.get("price")
    if price is None:
        return 0, ["价格缺失"], "high_risk"

    price = float(price)

    # Check for outlier flag from adapter
    if item.get("is_outlier"):
        score -= 30
        reason = item.get("outlier_reason", "被标记为异常值")
        factors.append(f"异常值标记: {reason}")

    # Check for price being unreasonably low (heuristic)
    if price <= 0:
        score -= 50
        factors.append("价格为零或负数")
    elif price < 1:
        score -= 20
        factors.append("价格极低，可能为测试数据")

    # Check for spec completeness
    if not item.get("spec"):
        score -= 10
        factors.append("缺少规格信息，无法确认是否同配置")

    # Check for URL/source verification
    if item.get("url"):
        score += 5
        factors.append("有来源链接可供核实")
    else:
        score -= 5
        factors.append("缺少来源链接")

    # Check for volume data (higher volume = more reliable price)
    volume = item.get("volume")
    if volume is not None:
        try:
            vol = float(volume)
            if vol > 0:
                score += 5
                factors.append("有成交量数据")
        except (ValueError, TypeError):
            pass

    # Determine risk level
    score = max(0, min(100, score))
    if score >= 70:
        risk_level = "likely_valid"
    elif score >= 40:
        risk_level = "suspicious"
    else:
        risk_level = "high_risk"

    return score, factors, risk_level


class PriceNormalizer(BaseNormalizer):
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
