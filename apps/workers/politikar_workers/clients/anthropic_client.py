"""Anthropic Claude wrapper. Wraps `anthropic.Anthropic` with our standard
prompt-caching strategy and tool use parsing for the politikar pipelines.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import anthropic
from loguru import logger
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)


@dataclass(slots=True)
class ToolCall:
    name: str
    input: dict[str, Any]


class AnthropicClient:
    def __init__(self, *, api_key: str | None = None, model: str | None = None):
        key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY missing. Add it to your environment "
                "before running extraction or verification."
            )
        self.client = anthropic.Anthropic(api_key=key)
        self.default_model = model or os.environ.get(
            "ANTHROPIC_MODEL", "claude-sonnet-4-6"
        )

    @retry(
        retry=retry_if_exception_type(anthropic.APIStatusError),
        wait=wait_exponential(min=1, max=20),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    def call_with_tool(
        self,
        *,
        system: str,
        user_text: str,
        tools: list[dict],
        model: str | None = None,
        max_tokens: int = 4096,
    ) -> ToolCall:
        """Call Claude with prompt caching on the system prompt and force a
        tool_use response. Returns the first tool call invoked.
        """
        msg = self.client.messages.create(
            model=model or self.default_model,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=tools,
            tool_choice={"type": "any"},
            messages=[{"role": "user", "content": user_text}],
        )
        for block in msg.content:
            if block.type == "tool_use":
                logger.debug(
                    "tool_use received name={} stop_reason={}",
                    block.name,
                    msg.stop_reason,
                )
                return ToolCall(name=block.name, input=block.input)
        raise RuntimeError(
            f"No tool_use block in Claude response. stop_reason={msg.stop_reason}"
        )
