"""Abstract LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class EnrichmentResult:
    """Result of an LLM enrichment call."""

    summary: Optional[str] = None
    sentiment: Optional[str] = None  # "bullish", "bearish", "neutral"
    entities: Optional[List[str]] = None
    impact: Optional[str] = None  # "high", "medium", "low"
    category: Optional[str] = None
    raw_response: Optional[str] = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def complete(self, system: str, user: str, max_tokens: int = 1000) -> str:
        """Generate a completion from the LLM.

        Args:
            system: System prompt.
            user: User prompt.
            max_tokens: Maximum tokens in response.

        Returns:
            The LLM response text.
        """
        ...

    async def classify(self, text: str, categories: List[str]) -> Dict[str, float]:
        """Classify text into categories with confidence scores.

        Args:
            text: Text to classify.
            categories: List of category labels.

        Returns:
            Dict mapping category labels to confidence scores (0.0-1.0).
        """
        prompt = (
            f"Classify the following text into one or more of these categories: "
            f"{', '.join(categories)}.\n\n"
            f"Text: {text}\n\n"
            f"Respond with a JSON object mapping each relevant category to a "
            f"confidence score between 0.0 and 1.0. Only include categories "
            f"with confidence > 0.3."
        )

        response = await self.complete(
            system="You are a text classification assistant. Respond only with valid JSON.",
            user=prompt,
            max_tokens=200,
        )

        try:
            import json

            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {}

    async def enrich_news(self, title: str, content: str, publisher: str = "") -> EnrichmentResult:
        """Enrich a news/announcement item.

        Args:
            title: News title.
            content: News content or summary.
            publisher: Publisher name.

        Returns:
            EnrichmentResult with summary, sentiment, entities, and impact.
        """
        system = (
            "You are a financial news analyst. Analyze the given news and provide:\n"
            "1. A one-sentence summary (max 100 chars)\n"
            "2. Sentiment: bullish, bearish, or neutral\n"
            "3. Key entities (companies, indices, policies)\n"
            "4. Market impact: high, medium, or low\n\n"
            "Respond with valid JSON: {\"summary\": \"...\", \"sentiment\": \"...\", "
            "\"entities\": [...], \"impact\": \"...\"}"
        )

        user_text = f"Title: {title}\nContent: {content}"
        if publisher:
            user_text = f"Publisher: {publisher}\n{user_text}"

        response = await self.complete(system=system, user=user_text, max_tokens=300)

        try:
            import json

            data = json.loads(response)
            return EnrichmentResult(
                summary=data.get("summary"),
                sentiment=data.get("sentiment"),
                entities=data.get("entities"),
                impact=data.get("impact"),
                raw_response=response,
            )
        except (json.JSONDecodeError, ValueError):
            return EnrichmentResult(raw_response=response)

    async def enrich_financial_event(
        self,
        title: str,
        content: str,
        event_class: str = "",
    ) -> EnrichmentResult:
        """Enrich a financial event.

        Args:
            title: Event title.
            content: Event content or summary.
            event_class: Event classification (e.g., "regulatory_announcement").

        Returns:
            EnrichmentResult with summary, sentiment, and impact.
        """
        system = (
            "You are a financial market analyst. Analyze the given financial event and provide:\n"
            "1. A one-sentence summary (max 100 chars)\n"
            "2. Market direction: bullish, bearish, or neutral\n"
            "3. Market impact: high, medium, or low\n\n"
            "Respond with valid JSON: {\"summary\": \"...\", \"sentiment\": \"...\", \"impact\": \"...\"}"
        )

        user_text = f"Title: {title}\nContent: {content}"
        if event_class:
            user_text = f"Event class: {event_class}\n{user_text}"

        response = await self.complete(system=system, user=user_text, max_tokens=300)

        try:
            import json

            data = json.loads(response)
            return EnrichmentResult(
                summary=data.get("summary"),
                sentiment=data.get("sentiment"),
                impact=data.get("impact"),
                raw_response=response,
            )
        except (json.JSONDecodeError, ValueError):
            return EnrichmentResult(raw_response=response)
