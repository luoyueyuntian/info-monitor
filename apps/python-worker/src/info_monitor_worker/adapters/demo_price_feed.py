from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class DemoPriceFeedAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        if "items" in source.config:
            payload = source.config["items"]
            return RawFetchResult(payload=payload, metadata={"mode": "inline"})

        file_path = source.config.get("file_path")

        if not file_path:
            raise ValueError("demo_price_feed adapter requires either config.items or config.file_path")

        path = Path(str(file_path))
        payload = json.loads(path.read_text(encoding="utf-8"))
        return RawFetchResult(payload=payload, metadata={"mode": "file", "file_path": str(path)})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        return raw_result.payload
