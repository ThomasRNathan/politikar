"""Verification cascade prompt (step 4 of the cascade).

Sources : PROMPTS.md prompt 4. Used after Python pre-collected evidences
from the internal base, fact-checkers, and data APIs.
"""
from __future__ import annotations

from dataclasses import dataclass

FACTUAL_VERDICTS = [
    "true",
    "mostly_true",
    "mixed",
    "mostly_false",
    "false",
    "unverifiable",
    "misleading_context",
]


SYSTEM_PROMPT = """\
Tu es un évaluateur factuel pour politikar. Tu reçois un claim factuel attribué à un politique français, accompagné d'évidences déjà collectées par un pipeline en amont (extraits de fact-checkers, valeurs d'API publiques, contexte source). Ta tâche est d'émettre un verdict structuré.

Verdicts possibles (vocabulaire fixe, ne jamais en inventer) :
- true : claim aligné avec les évidences à plus de 90 %
- mostly_true : aligné avec nuance, quelques imprécisions sans changer le sens
- mixed : éléments vrais et faux mêlés, ou dépend du cadrage
- mostly_false : faux dans le sens dominant, mais avec une part de vrai
- false : contredit clairement par les évidences
- unverifiable : aucune évidence solide accessible
- misleading_context : techniquement vrai mais présenté de manière à induire en erreur

Règles strictes :
- Tu ne dois jamais qualifier la personne (jamais "ment", "trompe"), uniquement le propos.
- Tu cites systématiquement chaque évidence utilisée avec son URL et un extrait court (< 250 caractères).
- Si les évidences disponibles ne permettent pas de trancher, choisis `unverifiable`. Ne tente pas de combler avec ta connaissance générale, sauf pour des faits notoires et incontestés (ex: dates de mandats).
- Tu produis un `reasoning` neutre, en français, structuré en deux ou trois paragraphes, lisible par un public non-spécialiste.
- `confidence` reflète ta certitude sur le verdict émis (pas sur la véracité du claim).
- Pour un claim politiquement clivant, traite avec exactement la même rigueur qu'un claim consensuel.

Format obligatoire de sortie : invocation de l'outil `submit_verdict`.
"""


def submit_verdict_tool() -> dict:
    return {
        "name": "submit_verdict",
        "description": "Soumet le verdict structuré pour le claim.",
        "input_schema": {
            "type": "object",
            "required": [
                "verdict",
                "confidence_score",
                "reasoning",
                "evidence",
                "data_sources_used",
            ],
            "additionalProperties": False,
            "properties": {
                "verdict": {"type": "string", "enum": FACTUAL_VERDICTS},
                "confidence_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                },
                "reasoning": {
                    "type": "string",
                    "minLength": 100,
                    "maxLength": 2000,
                },
                "evidence": {
                    "type": "array",
                    "minItems": 0,
                    "items": {
                        "type": "object",
                        "required": [
                            "source_url",
                            "source_label",
                            "quote",
                            "weight",
                            "kind",
                        ],
                        "properties": {
                            "source_url": {"type": "string", "format": "uri"},
                            "source_label": {"type": "string"},
                            "quote": {"type": "string", "maxLength": 250},
                            "weight": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                            },
                            "kind": {
                                "type": "string",
                                "enum": [
                                    "fact_checker",
                                    "data_api",
                                    "official_document",
                                    "press_article",
                                    "other",
                                ],
                            },
                        },
                    },
                },
                "data_sources_used": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "needs_human_review": {"type": "boolean"},
                "human_review_reason": {
                    "type": ["string", "null"],
                    "enum": [
                        "low_confidence",
                        "sensitive_topic",
                        "fact_checker_disagreement",
                        "data_ambiguity",
                        "complex_temporal",
                        None,
                    ],
                },
            },
        },
    }


@dataclass(slots=True)
class VerificationCascadePrompt:
    id: str
    purpose: str
    version: str
    llm_model: str
    system_prompt: str
    tools: list[dict]


VERIFICATION_CASCADE_V1 = VerificationCascadePrompt(
    id="verification_cascade@v1.0.0",
    purpose="verification_cascade",
    version="v1.0.0",
    llm_model="claude-sonnet-4-6",
    system_prompt=SYSTEM_PROMPT,
    tools=[submit_verdict_tool()],
)
