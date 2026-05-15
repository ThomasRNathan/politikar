"""Mistral La Plateforme wrapper. Same surface as `AnthropicClient` so
`extraction.py` and the verification cascade can call either provider via
the abstraction in `clients/provider.py`.

Free tier of Mistral La Plateforme covers the MVP volume :
  - mistral-small-latest : ~1 req/sec, ~500k tokens/min
  - rate-limit headers tell us when to slow down
  - tool calling supported (OpenAI-compatible format)
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential


@dataclass(slots=True)
class ToolCall:
    name: str
    input: dict[str, Any]


def _to_mistral_tool(schema: dict) -> dict:
    """Map an Anthropic-style tool spec (`name`, `input_schema`) to the
    Mistral / OpenAI-compatible function-tool shape.
    """
    return {
        "type": "function",
        "function": {
            "name": schema["name"],
            "description": schema.get("description", ""),
            "parameters": schema["input_schema"],
        },
    }


class MistralClient:
    def __init__(self, *, api_key: str | None = None, model: str | None = None):
        key = api_key or os.environ.get("MISTRAL_API_KEY")
        if not key:
            raise RuntimeError(
                "MISTRAL_API_KEY missing. Get a free key at "
                "https://console.mistral.ai/ then set it in your env."
            )
        # Import lazily so the workers package can be imported without the
        # mistralai dependency installed (e.g., in a Supabase-only build).
        from mistralai import Mistral

        self.client = Mistral(api_key=key)
        self.default_model = model or os.environ.get(
            "MISTRAL_MODEL", "mistral-small-latest"
        )

    @retry(
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
        """Call Mistral chat completion forcing a tool invocation. Returns
        the first tool call. Raises on parse failure or absent tool_use.
        """
        mistral_tools = [_to_mistral_tool(t) for t in tools]
        resp = self.client.chat.complete(
            model=model or self.default_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            tools=mistral_tools,
            tool_choice="any",  # force the model to call one of the tools
        )
        # Mistral response has `choices[0].message.tool_calls` (list).
        choice = resp.choices[0]
        message = choice.message
        tool_calls = getattr(message, "tool_calls", None) or []
        if not tool_calls:
            raise RuntimeError(
                f"No tool_call in Mistral response. finish_reason={choice.finish_reason}"
            )
        tc = tool_calls[0]
        # tc.function.arguments is a JSON string per Mistral's API.
        name = tc.function.name
        raw = tc.function.arguments
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
        except json.JSONDecodeError as e:
            logger.error("mistral.tool_args_parse_error name={} err={}", name, e)
            raise
        logger.debug("mistral.tool_call name={} finish_reason={}", name, choice.finish_reason)
        return ToolCall(name=name, input=parsed)
