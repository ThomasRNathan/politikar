# PROMPTS

> Catalogue des prompts LLM versionnés utilisés par politkar. Chaque prompt est référencé par son `id` (ex. `claim_extraction@v1.0.0`) et persisté dans la table `prompt_versions`. Toute évolution change la version, jamais le contenu d'une version publiée. Les verdicts produits stockent leur `prompt_version` pour reproductibilité historique.

## 1. Principes communs à tous les prompts

1. **Neutralité partisane** : aucune référence à un parti, une famille politique ou une idéologie comme bonne/mauvaise. Les prompts traitent toutes les positions politiques avec le même niveau d'exigence.
2. **Pas d'attaque personnelle** : ne jamais qualifier un politique de "menteur" ; toujours qualifier un *propos* comme "jugé faux selon méthode X avec confiance Y".
3. **Citations obligatoires** : tout claim factuel ou tout verdict doit citer ses sources (avec URL si dispo, sinon nom de la source).
4. **Tool use strict** : sortie via `tool_use` (Anthropic) avec `input_schema` JSON Schema. Pas de free-text reply en production.
5. **Refus explicite** : si le contenu input est en dehors du périmètre (par exemple discours non politique, contenu privé, mineur identifiable), retourner un refus structuré avec `reason`.
6. **Prompt caching** : système et règles méthodologiques en `cache_control: { type: "ephemeral" }` pour amortir les hits.
7. **Vocabulaire contraint** : `claim_type`, `verdict`, `topic_tag` sont énumérés et stricts. Le modèle ne peut pas inventer de nouvelle valeur.
8. **Transparence du raisonnement** : le `reasoning` final est lisible par le grand public, en français, neutre, structuré.

## 2. Modèles utilisés

| Usage | Modèle par défaut | Escalade |
|---|---|---|
| Extraction de claims | `claude-sonnet-4-6` | aucune |
| Classification claim type | `claude-sonnet-4-6` | aucune |
| Identification orateur | `claude-sonnet-4-6` | aucune |
| Vérification cascade (raisonnement) | `claude-sonnet-4-6` | `claude-opus-4-7` si `politician.tier == 'P0'` ou désaccord fact-checkers |
| Suivi promesses | `claude-opus-4-7` | aucune (analyses complexes) |
| Génération raisonnement public | `claude-sonnet-4-6` | aucune |

## 3. Vocabulaire des sorties

```python
ClaimType = Literal[
    "factual_assertion", "promise", "opinion",
    "rhetorical", "prediction", "normative_statement"
]

FactualVerdict = Literal[
    "true", "mostly_true", "mixed",
    "mostly_false", "false",
    "unverifiable", "misleading_context"
]

PromiseVerdict = Literal[
    "kept", "partially_kept", "broken",
    "in_progress", "abandoned", "too_early"
]

TopicTag = Literal[
    "economy", "employment", "fiscal_policy", "public_debt",
    "security", "justice", "immigration",
    "health", "education", "ecology_climate",
    "energy", "agriculture", "housing",
    "foreign_policy", "europe", "defense",
    "institutions", "social_protection", "culture",
    "digital", "transport", "research", "other"
]
```

## 4. Prompt 1 : extraction de claims

### Identifiant : `claim_extraction@v1.0.0`

### Modèle : `claude-sonnet-4-6`

### Objectif

À partir d'un texte source (transcript, déclaration officielle, intervention parlementaire), extraire la liste des claims atomiques attribuables à un orateur connu.

### System prompt

```
Tu es un assistant éditorial pour politkar, une plateforme open-source d'analyse de la véracité du discours politique français. Ta tâche est d'extraire des claims (énoncés vérifiables) à partir d'un texte source produit par un homme ou une femme politique français.

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
- les références procédurales (`je laisse la parole à`)
- les énoncés purement émotionnels sans contenu vérifiable

Pour chaque claim, fournis :
- le texte verbatim
- une version normalisée (ponctuation propre, accents standards)
- le type
- les tags thématiques
- les valeurs numériques mentionnées (avec unité et période si présente)
- les entités nommées (personnes, organisations, lieux, dates)
- le contexte (200 caractères avant et après)
- une confiance d'extraction entre 0 et 1

Respecte le vocabulaire contraint suivant :
[ClaimType: factual_assertion | promise | opinion | rhetorical | prediction | normative_statement]
[TopicTag: economy | employment | ...]

Si le texte ne contient aucun claim utile, retourne `{ "claims": [] }`.

Si le texte est en dehors du périmètre (privé, mineur, hors sujet politique), invoque l'outil `refuse_extraction` avec un motif.
```

### Tool schema

```json
{
  "name": "submit_claims",
  "description": "Soumet la liste des claims extraits du texte source",
  "input_schema": {
    "type": "object",
    "required": ["claims"],
    "additionalProperties": false,
    "properties": {
      "claims": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [
            "claim_text", "claim_normalized", "claim_type",
            "topic_tags", "extraction_confidence"
          ],
          "additionalProperties": false,
          "properties": {
            "claim_text": { "type": "string", "minLength": 1 },
            "claim_normalized": { "type": "string", "minLength": 1 },
            "claim_type": {
              "type": "string",
              "enum": [
                "factual_assertion", "promise", "opinion",
                "rhetorical", "prediction", "normative_statement"
              ]
            },
            "topic_tags": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "string",
                "enum": [
                  "economy", "employment", "fiscal_policy", "public_debt",
                  "security", "justice", "immigration",
                  "health", "education", "ecology_climate",
                  "energy", "agriculture", "housing",
                  "foreign_policy", "europe", "defense",
                  "institutions", "social_protection", "culture",
                  "digital", "transport", "research", "other"
                ]
              }
            },
            "numeric_values": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["value", "unit"],
                "properties": {
                  "value": { "type": "number" },
                  "unit": { "type": "string" },
                  "period": { "type": ["string", "null"] },
                  "scope": { "type": ["string", "null"] }
                }
              }
            },
            "named_entities": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["text", "type"],
                "properties": {
                  "text": { "type": "string" },
                  "type": {
                    "type": "string",
                    "enum": ["person", "organization", "location", "date", "law", "concept"]
                  }
                }
              }
            },
            "context_window": { "type": ["string", "null"] },
            "extraction_confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          }
        }
      }
    }
  }
}
```

Outil de refus complémentaire :

```json
{
  "name": "refuse_extraction",
  "description": "Refuse l'extraction si le texte est hors périmètre",
  "input_schema": {
    "type": "object",
    "required": ["reason"],
    "properties": {
      "reason": {
        "type": "string",
        "enum": ["non_political", "private_content", "minor_subject", "ambiguous_speaker", "other"]
      },
      "details": { "type": "string" }
    }
  }
}
```

### User prompt template

```
ORATEUR : {{politician.full_name}} ({{politician.current_function}}, {{politician.current_party}})
DATE : {{source.occurred_at}}
CANAL : {{source.channel}}
TYPE DE SOURCE : {{source.source_type}}

TEXTE SOURCE :
"""
{{source.transcript_or_raw_text}}
"""

Extrais les claims selon les règles ci-dessus en utilisant l'outil `submit_claims`. Si rien de vérifiable, retourne une liste vide.
```

### Stratégie de cache

`cache_control: ephemeral` sur le system prompt complet (stable, ~3500 tokens). User prompt non caché (variable).

### Test plan

30 textes test couvrant :
- 5 interventions parlementaires AN (verbatim XML)
- 5 communiqués Élysée
- 5 transcripts interview matinale 1-on-1
- 5 transcripts plateau multi-invités
- 5 tweets longs politiques
- 5 cas limites : texte vide, texte non politique, texte sur mineur, texte ambigu

Critères de succès :
- 0 claim hallucinné (vérifié à la main)
- Récall >= 80 % des claims utiles évidents
- Précision sur le `claim_type` >= 90 %
- Précision sur `topic_tags` >= 80 %
- Refus correct sur les 5 cas limites

## 5. Prompt 2 : classification du type de claim

### Identifiant : `claim_classification@v1.0.0`

### Modèle : `claude-sonnet-4-6`

### Note

Inclus dans `claim_extraction@v1.0.0` (le type est extrait au moment de l'extraction). Existe en prompt indépendant pour reclassification batch en cas de migration de vocabulaire ou de correction.

### System prompt

```
Tu reçois un claim atomique attribué à un politique. Ta tâche est de le classer dans l'une des catégories suivantes :
- factual_assertion : énoncé portant sur des faits vérifiables (chiffres, événements passés, situations actuelles)
- promise : engagement à faire ou obtenir quelque chose dans le futur, attribuable à l'orateur ou à son camp
- opinion : jugement personnel, valeur, préférence
- rhetorical : énoncé sans contenu vérifiable, formule de style
- prediction : projection chiffrée ou qualitative sur le futur, sans engagement personnel
- normative_statement : énoncé sur ce qui devrait être (sans engagement à le faire)

Si plusieurs catégories s'appliquent, choisis la plus restrictive (factual > promise > prediction > normative > opinion > rhetorical).
```

### Tool schema

```json
{
  "name": "classify_claim",
  "input_schema": {
    "type": "object",
    "required": ["claim_type", "confidence"],
    "properties": {
      "claim_type": {
        "type": "string",
        "enum": [
          "factual_assertion", "promise", "opinion",
          "rhetorical", "prediction", "normative_statement"
        ]
      },
      "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
      "secondary_type": {
        "type": ["string", "null"],
        "enum": [
          "factual_assertion", "promise", "opinion",
          "rhetorical", "prediction", "normative_statement", null
        ]
      }
    }
  }
}
```

## 6. Prompt 3 : identification de l'orateur

### Identifiant : `speaker_identification@v1.0.0`

### Modèle : `claude-sonnet-4-6`

### Objectif

Lorsqu'un transcript ne donne pas explicitement le nom de l'orateur (cas plateau TV, débat), matcher chaque segment à un `politician_id` du référentiel.

### System prompt

```
Tu reçois un transcript et la liste des politiques candidats présents. Pour chaque segment, identifie le politique qui parle. Si l'attribution est ambiguë ou impossible, retourne `unknown`.

Indices à utiliser :
- mentions explicites ("Monsieur X, votre réponse")
- intros et présentations en début d'émission
- references croisées ("comme l'a dit Madame Y")
- patterns linguistiques uniquement si tu en es certain (déconseillé sans autre indice)
```

### Tool schema

```json
{
  "name": "attribute_segments",
  "input_schema": {
    "type": "object",
    "required": ["segments"],
    "properties": {
      "segments": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["segment_index", "politician_id", "confidence"],
          "properties": {
            "segment_index": { "type": "integer", "minimum": 0 },
            "politician_id": { "type": ["string", "null"] },
            "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
            "evidence": { "type": "string" }
          }
        }
      }
    }
  }
}
```

### User prompt template

```
ÉMISSION : {{source.channel}} ({{source.occurred_at}})
PARTICIPANTS DÉCLARÉS :
{{#participants}}
- id={{id}} | {{full_name}} ({{current_function}}, {{current_party}})
{{/participants}}

SEGMENTS (déjà découpés et indexés) :
{{#segments}}
[{{index}}] "{{text}}"
{{/segments}}

Attribue chaque segment via `attribute_segments`.
```

## 7. Prompt 4 : cascade de vérification

### Identifiant : `verification_cascade@v1.0.0`

### Modèle : `claude-sonnet-4-6` (escalade `claude-opus-4-7` si confiance < 0.7 ou claim sensible)

### Objectif

Pour un `factual_assertion` donné, exécuter une cascade de vérification structurée et produire un verdict, un raisonnement, et une liste d'evidences.

### Architecture

Cette cascade est implémentée comme une chaîne d'étapes côté Python, avec Claude appelé sur l'étape 4 uniquement (raisonnement final). Les étapes 1-3 sont des lookups programmatiques.

```
1. Lookup interne (Python, pgvector cosine > 0,92)
   - hit > retourner verdict cached + flag already_verified
2. Lookup fact-checkers (Python, embedding sur summary fact-checker > 0,85)
   - hit > evidence kind="fact_checker", weight 0.85
3. Lookup data API (Python, sur numeric_values du claim)
   - tentative INSEE/Eurostat/data.gouv.fr selon topic_tags
   - hit > evidence kind="data_api", weight 0.90
4. Raisonnement Claude
   - input : claim + evidences collectées + contexte source
   - output : verdict + reasoning + confidence + evidences finales
```

### System prompt (étape 4 uniquement)

```
Tu es un évaluateur factuel pour politkar. Tu reçois un claim factuel attribué à un politique français, accompagné d'évidences déjà collectées par un pipeline en amont (extraits de fact-checkers, valeurs d'API publiques, contexte source). Ta tâche est d'émettre un verdict structuré.

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
- `confidence` reflète ta certitude sur le verdict émis (pas sur la véracité du claim). Si `unverifiable`, `confidence` peut rester élevée si tu es certain qu'aucune source ne tranche.
- Pour un claim politiquement clivant, traite avec exactement la même rigueur qu'un claim consensuel.

Format obligatoire de sortie : invocation de l'outil `submit_verdict`.
```

### Tool schema

```json
{
  "name": "submit_verdict",
  "input_schema": {
    "type": "object",
    "required": ["verdict", "confidence_score", "reasoning", "evidence", "data_sources_used"],
    "additionalProperties": false,
    "properties": {
      "verdict": {
        "type": "string",
        "enum": [
          "true", "mostly_true", "mixed",
          "mostly_false", "false",
          "unverifiable", "misleading_context"
        ]
      },
      "confidence_score": {
        "type": "number",
        "minimum": 0,
        "maximum": 1
      },
      "reasoning": {
        "type": "string",
        "minLength": 100,
        "maxLength": 2000
      },
      "evidence": {
        "type": "array",
        "minItems": 0,
        "items": {
          "type": "object",
          "required": ["source_url", "source_label", "quote", "weight", "kind"],
          "properties": {
            "source_url": { "type": "string", "format": "uri" },
            "source_label": { "type": "string" },
            "quote": { "type": "string", "maxLength": 250 },
            "weight": { "type": "number", "minimum": 0, "maximum": 1 },
            "kind": {
              "type": "string",
              "enum": ["fact_checker", "data_api", "official_document", "press_article", "other"]
            }
          }
        }
      },
      "data_sources_used": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "needs_human_review": { "type": "boolean" },
      "human_review_reason": {
        "type": ["string", "null"],
        "enum": [
          "low_confidence", "sensitive_topic", "fact_checker_disagreement",
          "data_ambiguity", "complex_temporal", null
        ]
      }
    }
  }
}
```

### User prompt template

```
CLAIM À ÉVALUER :
"""
{{claim.claim_text}}
"""

ATTRIBUTION : {{politician.full_name}} ({{politician.current_function}}), {{source.occurred_at}}, {{source.channel}}
TYPE : factual_assertion
TAGS : {{claim.topic_tags}}
VALEURS NUMÉRIQUES MENTIONNÉES : {{claim.numeric_values}}

ÉVIDENCES PRÉ-COLLECTÉES :

{{#evidence_internal}}
[BASE INTERNE]
- Claim similaire id={{id}} déjà vérifié, verdict={{verdict}}, similarity={{similarity}}
{{/evidence_internal}}

{{#evidence_fact_checkers}}
[FACT-CHECKER : {{outlet}}]
- {{summary}}
- URL : {{url}}
- Verdict source : {{verdict_label_source}}
- Date : {{published_at}}
{{/evidence_fact_checkers}}

{{#evidence_data_apis}}
[DONNÉES STRUCTURÉES : {{api_name}}]
- Indicateur : {{indicator_label}}
- Valeur officielle : {{official_value}} ({{period}})
- Source : {{source_url}}
{{/evidence_data_apis}}

CONTEXTE DE L'ÉNONCÉ (200 caractères avant/après) :
"""
{{claim.context_window}}
"""

Émets ton verdict via l'outil `submit_verdict`.
```

### Logique d'escalade

Côté Python, après réception du verdict :

```python
should_escalate = (
    verdict.confidence_score < 0.7
    or politician.tier == "P0"
    or (count_fact_checkers >= 2 and not all_agree)
    or claim.topic_tags & SENSITIVE_TOPICS  # immigration, sécurité, etc.
)

if should_escalate and not already_used_opus:
    rerun_with_model("claude-opus-4-7")
    if final_verdict.confidence_score < 0.6:
        enqueue_for_human_review("low_confidence")
elif verdict.needs_human_review:
    enqueue_for_human_review(verdict.human_review_reason)
else:
    publish_verdict()
```

`SENSITIVE_TOPICS` initial : `{"immigration", "security", "justice", "ecology_climate"}`. Liste à reviser au fil des incidents.

## 8. Prompt 5 : suivi de promesses

### Identifiant : `promise_tracking@v1.0.0`

### Modèle : `claude-opus-4-7`

### Objectif

À partir d'une promesse extraite (claim_type=`promise`) et d'un dossier d'actions du gouvernement ou du parlementaire concerné (lois votées, décrets, budgets, déclarations), évaluer le statut.

### System prompt

```
Tu es chargé de suivre l'état d'avancement d'une promesse politique. Tu reçois :
1. la promesse originale (texte, date, mandat associé)
2. un dossier d'actions et événements depuis la formulation de la promesse
3. la deadline implicite ou explicite (fin de mandat ou date promise)

Verdicts possibles (fixes) :
- kept : promesse tenue, action concrète et complète documentée
- partially_kept : action partielle, ne couvre pas l'engagement complet
- broken : la promesse ne sera ou n'a pas été tenue (action contraire ou inaction définitive)
- in_progress : action en cours, pas encore concluant, deadline pas atteinte
- abandoned : explicitement renoncée
- too_early : moins d'un an depuis la formulation et pas d'action attendue à ce stade

Règles :
- Critères mesurables explicites dans `success_criteria` : ce qui aurait été nécessaire pour qualifier `kept`.
- Liste des actions notables observées avec date et source.
- `confidence` sur le verdict, pas sur le succès final.
- Si la promesse est trop vague pour être évaluée, retourne `too_early` avec `needs_human_review = true`.
```

### Tool schema

```json
{
  "name": "submit_promise_status",
  "input_schema": {
    "type": "object",
    "required": ["status", "confidence_score", "reasoning", "actions_observed", "success_criteria"],
    "properties": {
      "status": {
        "type": "string",
        "enum": ["kept", "partially_kept", "broken", "in_progress", "abandoned", "too_early"]
      },
      "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 },
      "reasoning": { "type": "string", "minLength": 100, "maxLength": 2500 },
      "actions_observed": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["date", "label", "source_url", "kind"],
          "properties": {
            "date": { "type": "string", "format": "date" },
            "label": { "type": "string" },
            "source_url": { "type": "string" },
            "kind": {
              "type": "string",
              "enum": ["law", "decree", "budget_line", "official_statement", "vote", "media_report"]
            }
          }
        }
      },
      "success_criteria": {
        "type": "array",
        "items": { "type": "string" }
      },
      "needs_human_review": { "type": "boolean" }
    }
  }
}
```

## 9. Prompt 6 : génération de raisonnement public

### Identifiant : `reasoning_generation@v1.0.0`

### Modèle : `claude-sonnet-4-6`

### Objectif

À partir d'un verdict structuré et d'évidences, produire un texte explicatif public, en français, neutre, lisible par un public non-spécialiste.

### Note

Sortie déjà produite par le prompt 4 (`reasoning`). Ce prompt 6 existe pour reformuler en cas de revue humaine ou pour mode "explication courte" (carte produit, partage social).

### System prompt

```
Tu reçois un verdict structuré et ses évidences. Tu produis une explication publique respectant ces règles :
- 2 ou 3 paragraphes, 250 à 400 mots
- ton informatif et neutre, pas de jugement de personne
- intègre au moins 2 citations directes (avec guillemets) issues des évidences
- conclusion qui rappelle la méthode (`Selon notre méthodologie publique, ce propos est jugé X avec une confiance de Y %`)
- pas d'em dash, ponctuation française standard
- pas de qualificatif négatif sur la personne
- termine par : `Méthodologie complète : politkar.fr/methode`
```

### Tool schema

```json
{
  "name": "submit_public_reasoning",
  "input_schema": {
    "type": "object",
    "required": ["public_reasoning", "headline"],
    "properties": {
      "public_reasoning": { "type": "string", "minLength": 200, "maxLength": 3000 },
      "headline": { "type": "string", "minLength": 20, "maxLength": 120 }
    }
  }
}
```

## 10. Stratégie de prompt caching

Anthropic supporte jusqu'à 4 breakpoints de cache. Au MVP on en utilise 2 systématiquement, le 3e ponctuellement :

| Breakpoint | Contenu | Hit rate cible |
|---|---|---|
| 1 (système) | system prompt complet (~3k tokens, stable par version) | > 95 % |
| 2 (méthode) | référentiel des sources et règles méthodo (~2k tokens, stable par jour) | > 80 % |
| 3 (contexte source) | transcript long quand on extrait plusieurs claims du même texte | > 60 % |

Coût estimé MVP, en supposant ~5k claims/mois extraits, vérifiés et raisonnés :

| Étape | Tokens / appel | Appels / mois | Coût |
|---|---|---|---|
| Extraction (Sonnet 4.6) | 4k in / 2k out | 1 000 sources | ~12 $ |
| Cascade verdict (Sonnet 4.6) | 5k in / 1k out | 5 000 claims | ~25 $ |
| Cascade verdict (Opus 4.7 escalade ~10%) | 5k in / 1.5k out | 500 | ~12 $ |
| Suivi promesses (Opus 4.7) | 8k in / 2k out | 200 | ~6 $ |
| **Total** | | | **~55 $/mo** |

Tient sous le plafond Anthropic 100 $/mo défini dans ARCHITECTURE.

## 11. Plan de tests

### 11.1 Tests unitaires des prompts

- Suite `pytest` qui charge un fixture `tests/fixtures/claim_extraction/<case>.txt` avec output attendu en JSON.
- Pour chaque case : appelle Anthropic avec le prompt versionné, parse le tool output, compare structurellement.
- Tolérance : `claim_text` peut varier (paraphrase) ; `claim_type`, `topic_tags`, `numeric_values` doivent matcher exactement.

### 11.2 Tests end-to-end de la cascade

- Fixture : 30 claims réels (10 vrais, 10 faux, 10 mixed/unverifiable) avec verdict humain annoté.
- Critère de succès : >= 85 % de match avec le verdict humain sur les 30, >= 90 % sur les 10 clairement vrais et 10 clairement faux.

### 11.3 Test des garde-fous

- Fixture : 10 claims piégés (attaques ad hominem, contenu privé, claims sur mineurs, claims hors politique).
- Critère : refus correct ou verdict `unverifiable` sans dérapage.

### 11.4 Anti-régression sur upgrade de modèle

À chaque montée de version Claude (par exemple `claude-opus-5-x`), rejouer la suite complète, comparer drift avec la version stable. Si drift > 10 % sur les verdicts, geler l'upgrade et investiguer.

## 12. Versionnement et publication

- Tout nouveau prompt ou changement de schema d'outil bump la version (`v1.0.0` -> `v1.1.0` mineur, `v2.0.0` majeur si schema change).
- Insertion en base via une migration ou via le script `scripts/seed-prompts.py`.
- Les verdicts produits avec une version ancienne ne sont jamais réécrits silencieusement. Pour rejouer, on crée une nouvelle `verifications` row avec `superseded_by_verification_id` sur l'ancienne.
- Page publique `/methode` listera les versions de prompt actives.

## 13. Garde-fous transverses (rappel)

- **Pas d'em dash** : règle stricte sur tous les prompts.
- **Pas d'attaque personnelle** : Claude ne doit jamais conclure que la personne ment, trompe, manipule. Toujours sur le propos.
- **Distinguer critique vs jugement moral** : le prompt produit une évaluation factuelle, pas un jugement éthique.
- **Refus en cas de doute fort** : préférer `unverifiable` à un verdict tranché spéculatif.
- **Citations obligatoires** : tout verdict non `unverifiable` doit avoir au moins 1 evidence, idéalement 2.

## 14. Questions ouvertes pour relecture

1. Faut-il un prompt 7 distinct pour la `genération de questions de relance` côté admin (aider le reviewer à challenger le claim) ? Position : non MVP.
2. Topic tags : est-ce qu'on ajoute `women_rights`, `lgbtq`, `religion` dès le MVP ou on les regroupe sous `social_protection` / `culture` ? Position : regroupement initial pour limiter la surface, ouverture en Phase 6 si besoin.
3. Modèle pour `promise_tracking` : Opus 4.7 par défaut. Coût plus élevé. Acceptable ?
4. Sortie multi-langue : les prompts sont en français. À tester pour eurodéputés s'exprimant à Strasbourg en anglais ou allemand. Décision : phase post-MVP.
