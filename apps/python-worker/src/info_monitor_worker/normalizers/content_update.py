from __future__ import annotations

from typing import Any, List

from info_monitor_worker.models import NormalizedRecord
from info_monitor_worker.normalizers.base import BaseNormalizer


class ContentUpdateNormalizer(BaseNormalizer):
    def normalize(self, payload: Any) -> List[NormalizedRecord]:
        records: List[NormalizedRecord] = []

        for item in payload:
            occurred_at = str(item["occurred_at"])
            url = item.get("url")
            title = str(item["title"])
            object_name = item.get("object_name")
            logical_key = url or f"content_update:{object_name or title}:{occurred_at[:10]}:{title}"
            records.append(
                NormalizedRecord(
                    record_type="content_update",
                    title=title,
                    occurred_at=occurred_at,
                    source_url=url,
                    logical_key=logical_key,
                    content={
                        "url": url,
                        "object_name": object_name,
                        "update_type": item.get("update_type", "content_update"),
                        "summary": item.get("summary", title),
                    },
                )
            )

        return records
