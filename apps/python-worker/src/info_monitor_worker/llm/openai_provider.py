"""OpenAI LLM provider."""

from __future__ import annotations

import os
from typing import Optional

from info_monitor_worker.llm.base import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI LLM provider."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import openai

                kwargs = {"api_key": self.api_key}
                if self.base_url:
                    kwargs["base_url"] = self.base_url
                self._client = openai.OpenAI(**kwargs)
            except ImportError:
                raise RuntimeError(
                    "openai package not installed. "
                    "Install with: pip install 'openai>=1.50.0'"
                )
        return self._client

    async def complete(self, system: str, user: str, max_tokens: int = 1000) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content or ""
