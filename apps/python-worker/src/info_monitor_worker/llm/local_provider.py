"""Local LLM provider (Ollama-compatible)."""

from __future__ import annotations

import os
from typing import Optional

from info_monitor_worker.llm.base import LLMProvider


class LocalProvider(LLMProvider):
    """Local LLM provider using Ollama-compatible API."""

    def __init__(
        self,
        model: str = "llama3.2",
        base_url: Optional[str] = None,
        timeout: float = 60.0,
    ) -> None:
        self.model = model
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "http://localhost:11434")
        self.timeout = timeout

    async def complete(self, system: str, user: str, max_tokens: int = 1000) -> str:
        try:
            import httpx
        except ImportError:
            raise RuntimeError("httpx package required for local LLM provider")

        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"num_predict": max_tokens},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")
