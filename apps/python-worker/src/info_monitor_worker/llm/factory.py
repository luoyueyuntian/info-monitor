"""LLM provider factory."""

from __future__ import annotations

import logging
import os
from typing import Optional

from info_monitor_worker.llm.base import LLMProvider

logger = logging.getLogger(__name__)

_provider: Optional[LLMProvider] = None


def create_llm_provider() -> Optional[LLMProvider]:
    """Create an LLM provider based on environment configuration.

    Returns:
        LLMProvider instance, or None if LLM is disabled.
    """
    provider_name = os.getenv("LLM_PROVIDER", "none").lower()

    if provider_name == "none" or not provider_name:
        return None

    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "")
    base_url = os.getenv("LLM_BASE_URL")
    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1000"))

    if provider_name == "claude":
        from info_monitor_worker.llm.claude_provider import ClaudeProvider

        return ClaudeProvider(
            api_key=api_key,
            model=model or "claude-sonnet-4-20250514",
            base_url=base_url,
            timeout=timeout,
            max_tokens=max_tokens,
        )

    if provider_name == "openai":
        from info_monitor_worker.llm.openai_provider import OpenAIProvider

        return OpenAIProvider(
            api_key=api_key,
            model=model or "gpt-4o-mini",
            base_url=base_url,
            timeout=timeout,
        )

    if provider_name == "local":
        from info_monitor_worker.llm.local_provider import LocalProvider

        return LocalProvider(
            model=model or "llama3.2",
            base_url=base_url,
            timeout=timeout,
        )

    logger.warning("Unknown LLM_PROVIDER: %s", provider_name)
    return None


def get_llm_provider() -> Optional[LLMProvider]:
    """Get or create the singleton LLM provider."""
    global _provider
    if _provider is None:
        _provider = create_llm_provider()
        if _provider:
            logger.info("LLM provider initialized: %s", os.getenv("LLM_PROVIDER", "none"))
    return _provider


def reset_llm_provider() -> None:
    """Reset the singleton (for testing)."""
    global _provider
    _provider = None
