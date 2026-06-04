from __future__ import annotations

from typing import Any, List

from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.normalizers.base import BaseNormalizer


class NewsAnnouncementNormalizer(BaseNormalizer):
    def normalize(self, payload: Any) -> List[NormalizedRecord]:
        records: List[NormalizedRecord] = []

        for item in payload:
            occurred_at = str(item["occurred_at"])
            logical_key = item.get("url") or f"news_announcement:{item['title']}:{occurred_at[:10]}"
            records.append(
                NormalizedRecord(
                    record_type="news_announcement",
                    title=str(item["title"]),
                    occurred_at=occurred_at,
                    source_url=item.get("url"),
                    logical_key=logical_key,
                    content={
                        "url": item.get("url"),
                        "publisher": item.get("publisher"),
                        "category": item.get("category", "news_announcement"),
                        "release_topic": item.get("release_topic"),
                        "release_topic_label": item.get("release_topic_label"),
                        "description": item.get("description"),
                    },
                )
            )

        return records
