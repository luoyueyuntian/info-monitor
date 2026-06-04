from __future__ import annotations

from typing import Any, List

from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.normalizers.base import BaseNormalizer


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
                    },
                )
            )

        return records
