"""LLM provider abstraction. Picks the runtime backend based on env vars:

  - if MISTRAL_API_KEY is set       → Mistral La Plateforme (free tier)
  - elif ANTHROPIC_API_KEY is set   → Anthropic Claude (paid)
  - else                            → RuntimeError with a clear hint

Callers (extraction.py, verify.py) talk only to this abstraction so we
can swap providers without rewriting prompt code. Tool schemas are
expressed in the Anthropic-style `name` + `input_schema` shape ; the
Mistral client maps them to the OpenAI/Mistral function shape internally.
"""
from __future__ import annotations

import os
from typing import Protocol

from loguru import logger


class ToolCallProtocol(Protocol):
    name: str
    input: dict


class LLMClient(Protocol):
    def call_with_tool(
        self,
        *,
        system: str,
        user_text: str,
        tools: list[dict],
        model: str | None = ...,
        max_tokens: int = ...,
    ) -> ToolCallProtocol: ...


def get_llm_client(*, prefer: str | None = None) -> LLMClient:
    """Return a configured LLM client. `prefer` forces a specific backend
    when both are configured. Otherwise, Mistral wins because it costs
    zero on the free tier.
    """
    pref = (prefer or os.environ.get("POLITIKAR_LLM_PROVIDER") or "auto").lower()

    if pref in ("mistral", "auto") and os.environ.get("MISTRAL_API_KEY"):
        from politikar_workers.clients.mistral_client import MistralClient

        logger.info("llm.provider=mistral model={}", os.environ.get("MISTRAL_MODEL", "mistral-small-latest"))
        return MistralClient()

    if pref in ("anthropic", "auto") and os.environ.get("ANTHROPIC_API_KEY"):
        from politikar_workers.clients.anthropic_client import AnthropicClient

        logger.info("llm.provider=anthropic model={}", os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"))
        return AnthropicClient()

    raise RuntimeError(
        "No LLM provider configured. Set MISTRAL_API_KEY (free tier "
        "https://console.mistral.ai/) or ANTHROPIC_API_KEY before "
        "running extraction or verification."
    )
