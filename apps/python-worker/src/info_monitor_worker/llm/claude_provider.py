"""Claude (Anthropic) LLM provider."""

from __future__ import annotations

import os
from typing import Optional

from info_monitor_worker.llm.base import LLMProvider


class ClaudeProvider(LLMProvider):
    """Anthropic Claude LLM provider."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514",
        base_url: Optional[str] = None,
        timeout: float = 30.0,
        max_tokens: int = 4096,
    ) -> None:
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self.default_max_tokens = max_tokens
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import anthropic

                kwargs = {"api_key": self.api_key}
                if self.base_url:
                    kwargs["base_url"] = self.base_url
                self._client = anthropic.Anthropic(**kwargs)
            except ImportError:
                raise RuntimeError(
                    "anthropic package not installed. "
                    "Install with: pip install 'anthropic>=0.40.0'"
                )
        return self._client

    async def complete(self, system: str, user: str, max_tokens: int = 1000) -> str:
        client = self._get_client()
        response = client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text
