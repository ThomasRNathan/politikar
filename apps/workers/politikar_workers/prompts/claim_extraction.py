"""Claim extraction prompt. Sources : PROMPTS.md prompt 1."""
from __future__ import annotations

from dataclasses import dataclass

CLAIM_TYPES = [
    "factual_assertion",
    "promise",
    "opinion",
    "rhetorical",
    "prediction",
    "normative_statement",
]
TOPIC_TAGS = [
    "economy",
    "employment",
    "fiscal_policy",
    "public_debt",
    "security",
    "justice",
    "immigration",
    "health",
    "education",
    "ecology_climate",
    "energy",
    "agriculture",
    "housing",
    "foreign_policy",
    "europe",
    "defense",
    "institutions",
    "social_protection",
    "culture",
    "digital",
    "transport",
    "research",
    "other",
]


SYSTEM_PROMPT = """\
Tu es un assistant éditorial pour politikar, une plateforme open-source d'analyse de la véracité du discours politique français. Ta tâche est d'extraire des claims (énoncés vérifiables) à partir d'un texte source produit par un homme ou une femme politique français.

Définition d'un claim :
- une assertion factuelle (chiffres, événements, citations)
- une promesse (engagement à faire, ne pas faire, ou obtenir un résultat)
- une opinion structurée
- une prédiction
- un énoncé normatif explicite

Un claim est atomique : un énoncé = une idée vérifiable. Si une phrase contient deux idées, produis deux claims.

N'extrais PAS :
- les questions rhétoriques sans contenu vérifiable
- les formules de politesse, remerciements, transitions
- les références procédurales ("je laisse la parole à")
- les énoncés purement émotionnels sans contenu vérifiable

Pour chaque claim, fournis le texte verbatim, une version normalisée, le type, les tags thématiques, les valeurs numériques mentionnées (avec unité et période si présente), les entités nommées et une confiance d'extraction entre 0 et 1.

Garde-fous :
- neutralité partisane stricte
- jamais d'attaque personnelle, qualifie le propos uniquement
- vocabulaire contraint, pas d'invention de catégorie

Si le texte ne contient aucun claim utile, retourne `{ "claims": [] }`. Si le texte est en dehors du périmètre (privé, mineur, hors sujet politique), invoque l'outil `refuse_extraction` avec un motif.
"""


def submit_claims_tool() -> dict:
    return {
        "name": "submit_claims",
        "description": "Soumet la liste des claims extraits du texte source.",
        "input_schema": {
            "type": "object",
            "required": ["claims"],
            "additionalProperties": False,
            "properties": {
                "claims": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": [
                            "claim_text",
                            "claim_normalized",
                            "claim_type",
                            "topic_tags",
                            "extraction_confidence",
                        ],
                        "additionalProperties": False,
                        "properties": {
                            "claim_text": {"type": "string", "minLength": 1},
                            "claim_normalized": {"type": "string", "minLength": 1},
                            "claim_type": {"type": "string", "enum": CLAIM_TYPES},
                            "topic_tags": {
                                "type": "array",
                                "minItems": 1,
                                "items": {"type": "string", "enum": TOPIC_TAGS},
                            },
                            "numeric_values": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["value", "unit"],
                                    "properties": {
                                        "value": {"type": "number"},
                                        "unit": {"type": "string"},
                                        "period": {"type": ["string", "null"]},
                                        "scope": {"type": ["string", "null"]},
                                    },
                                },
                            },
                            "named_entities": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["text", "type"],
                                    "properties": {
                                        "text": {"type": "string"},
                                        "type": {
                                            "type": "string",
                                            "enum": [
                                                "person",
                                                "organization",
                                                "location",
                                                "date",
                                                "law",
                                                "concept",
                                            ],
                                        },
                                    },
                                },
                            },
                            "context_window": {"type": ["string", "null"]},
                            "extraction_confidence": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                            },
                        },
                    },
                }
            },
        },
    }


def refuse_extraction_tool() -> dict:
    return {
        "name": "refuse_extraction",
        "description": "Refuse l'extraction si le texte est hors périmètre.",
        "input_schema": {
            "type": "object",
            "required": ["reason"],
            "properties": {
                "reason": {
                    "type": "string",
                    "enum": [
                        "non_political",
                        "private_content",
                        "minor_subject",
                        "ambiguous_speaker",
                        "other",
                    ],
                },
                "details": {"type": "string"},
            },
        },
    }


@dataclass(slots=True)
class ClaimExtractionPrompt:
    id: str
    purpose: str
    version: str
    llm_model: str
    system_prompt: str
    tools: list[dict]


CLAIM_EXTRACTION_V1 = ClaimExtractionPrompt(
    id="claim_extraction@v1.0.0",
    purpose="claim_extraction",
    version="v1.0.0",
    llm_model="claude-sonnet-4-6",
    system_prompt=SYSTEM_PROMPT,
    tools=[submit_claims_tool(), refuse_extraction_tool()],
)
