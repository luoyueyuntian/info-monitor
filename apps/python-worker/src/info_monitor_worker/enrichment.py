"""LLM enrichment step for the worker pipeline.

Inserts between normalization and event rule evaluation.
Gracefully degrades when LLM is unavailable.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from info_monitor_worker.llm.base import EnrichmentResult
from info_monitor_worker.llm.factory import get_llm_provider

logger = logging.getLogger(__name__)


async def enrich_record(
    title: str,
    content: Dict[str, Any],
    info_type: str,
    source_name: str = "",
) -> Optional[EnrichmentResult]:
    """Enrich a normalized record using LLM.

    Args:
        title: Record title.
        content: Record content dict.
        info_type: Information type (price, news_announcement, etc.).
        source_name: Source name for context.

    Returns:
        EnrichmentResult or None if LLM is unavailable or enrichment fails.
    """
    provider = get_llm_provider()
    if not provider:
        return None

    try:
        if info_type in ("news_announcement", "content_update"):
            publisher = content.get("publisher", source_name)
            body = content.get("description", content.get("summary", title))
            return await provider.enrich_news(title=title, content=body, publisher=publisher)

        if info_type == "financial_event":
            event_class = content.get("event_class", "")
            body = content.get("description", content.get("summary", title))
            return await provider.enrich_financial_event(
                title=title, content=body, event_class=event_class
            )

        # Price and other types: lightweight enrichment
        if info_type == "price":
            spec = content.get("spec", "")
            price = content.get("price")
            currency = content.get("currency", "")
            price_str = f" {price} {currency}" if price else ""
            summary = f"Price monitoring: {title}"
            if spec:
                summary += f" ({spec})"
            if price_str:
                summary += f" at{price_str}"
            return EnrichmentResult(summary=summary)

        return None

    except Exception as exc:
        logger.debug("Enrichment failed for '%s': %s", title, exc)
        return None


def enrich_record_sync(
    title: str,
    content: Dict[str, Any],
    info_type: str,
    source_name: str = "",
) -> Optional[EnrichmentResult]:
    """Synchronous wrapper for enrich_record.

    Falls back to None if async runtime is unavailable.
    """
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Can't run async in a running loop; skip enrichment
            return None
        return loop.run_until_complete(enrich_record(title, content, info_type, source_name))
    except RuntimeError:
        # No event loop; create one
        try:
            return asyncio.run(enrich_record(title, content, info_type, source_name))
        except Exception:
            return None
    except Exception:
        return None
