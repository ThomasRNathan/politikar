"""Extract claims from a source text using Claude.

Wraps the `claim_extraction@v1.0.0` prompt and returns a structured list
of claim dictionaries ready for embedding and persistence.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from loguru import logger

from politikar_workers.clients.provider import LLMClient, get_llm_client
from politikar_workers.prompts.claim_extraction import CLAIM_EXTRACTION_V1


@dataclass(slots=True)
class ExtractionInput:
    politician_full_name: str
    politician_function: str
    politician_party: str
    occurred_at: str
    channel: str
    source_type: str
    text: str


def build_user_prompt(inp: ExtractionInput) -> str:
    return (
        f"ORATEUR : {inp.politician_full_name} ({inp.politician_function}, "
        f"{inp.politician_party})\n"
        f"DATE : {inp.occurred_at}\n"
        f"CANAL : {inp.channel}\n"
        f"TYPE DE SOURCE : {inp.source_type}\n\n"
        f"TEXTE SOURCE :\n\"\"\"\n{inp.text}\n\"\"\"\n\n"
        "Extrais les claims selon les règles ci-dessus en utilisant l'outil "
        "`submit_claims`. Si rien de vérifiable, retourne une liste vide."
    )


def extract_claims(
    inp: ExtractionInput,
    client: LLMClient | None = None,
) -> dict[str, Any]:
    """Extract claims via the configured LLM provider (Mistral free tier
    by default, Anthropic if set). Returns the tool input dict, ie
    `{"claims": [...]}` or `{"reason": "..."}` if the model refuses.
    """
    client = client or get_llm_client()
    prompt = CLAIM_EXTRACTION_V1
    user = build_user_prompt(inp)
    logger.info(
        "extraction.start prompt={} text_len={}",
        prompt.id,
        len(inp.text),
    )
    call = client.call_with_tool(
        system=prompt.system_prompt,
        user_text=user,
        tools=prompt.tools,
    )
    if call.name == "refuse_extraction":
        logger.warning("extraction.refused reason={}", call.input.get("reason"))
        return {"refused": True, **call.input}
    if call.name == "submit_claims":
        n = len(call.input.get("claims", []))
        logger.info("extraction.done n_claims={}", n)
        return {"refused": False, **call.input}
    raise RuntimeError(f"Unexpected tool name: {call.name}")
