# SCORING

> Méthodologie publique du `TruthScore` v1. Tout score affiché par politikar est calculé selon la formule de ce document, avec la version du modèle de prompt et la version du code de scoring tracées dans la table `politician_truth_scores`. Le code de référence vit dans `apps/workers/politikar_workers/scoring.py`. Toute évolution change la version, jamais en silence.

## 1. Objectifs et contraintes

1. **Score lisible** : 0 à 100 publié, plus c'est élevé plus le politique est jugé exact.
2. **Score robuste** : non manipulable trivialement. Pondéré par la vérifiabilité des claims (un claim vague pèse moins qu'une assertion chiffrée).
3. **Score honnête sur l'incertitude** : intervalle de confiance affiché systématiquement, et pas de score si volume insuffisant.
4. **Score décomposable** : par sujet, par fonction, par période. Pas de chiffre unique caricatural.
5. **Score reproductible** : la formule est publique, le code est public, les inputs sont publics.
6. **Anti-gaming** : récompenser les prises de position factuelles vérifiables, pas les banalités.

## 2. Formule

### 2.1 Mappings vers valeurs numériques

| `verifications.verdict` (factuel) | $t_i$ | Inclus dans $f$ |
|---|---|---|
| `true` | 1.00 | oui |
| `mostly_true` | 0.75 | oui |
| `mixed` | 0.50 | oui |
| `misleading_context` | 0.15 | oui (pénalise même si contenu partiellement vrai) |
| `mostly_false` | 0.25 | oui |
| `false` | 0.00 | oui |
| `unverifiable` | n/a | exclu du numérateur et du dénominateur |

| `verifications.verdict` (promesse) | $p_j$ | Inclus dans $p$ |
|---|---|---|
| `kept` | 1.00 | oui |
| `partially_kept` | 0.50 | oui |
| `broken` | 0.00 | oui |
| `abandoned` | 0.00 | oui |
| `in_progress` | n/a | exclu (pas encore décidé) |
| `too_early` | n/a | exclu |

### 2.2 Verifiability par type de claim

Le poids attribué à un claim dépend de sa nature, indépendamment du verdict.

| `claim_type` | $v_i$ |
|---|---|
| `factual_assertion` avec au moins une `numeric_value` | 1.00 |
| `factual_assertion` qualitative seule | 0.80 |
| `promise` | 0.70 |
| `prediction` | 0.50 |
| `normative_statement` | 0.30 |
| `opinion` | 0.00 (exclu) |
| `rhetorical` | 0.00 (exclu) |

### 2.3 Confidence

$c_i$ = `verifications.confidence_score`, ∈ [0, 1].

Verdicts produits par `claude-opus-4-7` ou validés par revue humaine (`verifications.human_reviewed = true`) reçoivent une majoration : $c_i \leftarrow \min(1, 1.05 \times c_i)$.

### 2.4 Topical relevance

$r_i = 0.5 \times \text{topic\_priority}_i + 0.3 \times \text{politician\_tier}_i + 0.2 \times \text{source\_credibility}_i$, normalisé à [0,1].

- `topic_priority` : 1.0 pour topics de premier plan (économie, sécurité, immigration, santé), 0.7 pour seconds (justice, éducation, écologie, etc.), 0.5 pour autres. Configurable, audité publiquement.
- `politician_tier` : 1.0 pour P0, 0.8 pour P1, 0.6 pour P2.
- `source_credibility` : 1.0 pour `source_credibility = 5` (officiel parlementaire), 0.9 pour 4, 0.75 pour 3, 0.5 pour 2, 0.25 pour 1.

### 2.5 Poids global d'un claim

$w_i = c_i \times v_i \times r_i$

### 2.6 Composante factuelle

Pour les claims factuels du politique avec verdict factuel inclus :

$$
f = \begin{cases}
\displaystyle \frac{\sum_i w_i \times t_i}{\sum_i w_i} \times 100 & \text{si } \sum_i w_i > 0 \\[8pt]
\text{NaN} & \text{sinon}
\end{cases}
$$

### 2.7 Composante promesses

Pour les promesses arrivées à terme (statut résolu) :

$$
p = \begin{cases}
\displaystyle \frac{\sum_j w_j \times p_j}{\sum_j w_j} \times 100 & \text{si } \sum_j w_j > 0 \\[8pt]
\text{NaN} & \text{sinon}
\end{cases}
$$

### 2.8 Composante transparence

$\tau$ ∈ [0, 100], défaut 50.

- $+15$ si le politique a publié au moins une correction publique sur ses propres déclarations dans la période.
- $-15$ si plus de 10 % des claims sont `misleading_context` (pattern de cadrage).
- $-10$ si proportion de `unverifiable` > 30 % (tendance à parler en termes vagues invérifiables).
- $+5$ si proportion de `factual_assertion` avec `numeric_values` > 40 % (effort vers des claims précis).

Borne inférieure 0, borne supérieure 100.

### 2.9 Score global

$$
\text{TruthScore} = 0.60 \times f + 0.30 \times p + 0.10 \times \tau
$$

Si $f$ ou $p$ est `NaN`, on renormalise sur les composantes définies. Exemple : si pas de promesses résolues, $\text{TruthScore} = (0.60 \times f + 0.10 \times \tau) / 0.70$.

### 2.10 Plancher de volume (significativité)

`is_significant = true` si et seulement si :
- $N_f \geq 30$ claims factuels résolus avec $w_i > 0$, OU
- $N_p \geq 5$ promesses résolues avec $w_j > 0$.

Sinon, le score est calculé mais l'interface affiche **`Score non significatif (N = X)`** au lieu du chiffre, accompagné d'une barre d'incertitude large. Aucun classement public n'inclut un politique non significatif.

### 2.11 Intervalle de confiance

Bootstrap non paramétrique :
- 1000 resamples avec remplacement de l'ensemble des claims pris en compte.
- Pour chaque resample, recalcul du `TruthScore`.
- $\text{CI}_{95}$ = [percentile 2.5 %, percentile 97.5 %].
- Stocké dans `politician_truth_scores.ci_low`, `ci_high`.
- Affichage public : `74 (intervalle 70-78)`.

### 2.12 Décomposition par topic

Pour chaque `topic_tag`, recalcul du score (composantes $f$, $p$, $\tau$) sur le sous-ensemble des claims taggés. Un claim multi-tag pèse dans chacun de ses topics.

Stocké dans `politician_truth_scores.topic_breakdown` :

```json
{
  "economy":   { "score": 78.0, "n": 42, "ci": [73, 82] },
  "immigration": { "score": 51.5, "n": 31, "ci": [44, 59] },
  "...":       { "...": "..." }
}
```

L'interface affiche le score global et permet de drill-down par topic. Si un topic a moins de 10 claims, son sous-score n'est pas affiché.

## 3. Trois exemples chiffrés

### 3.1 Exemple A : politique "rigoureuse"

`Politicien A`, ministre P0. Sur la période :
- 50 claims factuels résolus.
- 4 promesses résolues.
- Pas de correction publique.
- 0 claim `misleading_context`.
- 60 % de claims avec `numeric_values`.

Détails simplifiés (avec poids $w$ uniformes à 0.85 pour clarté pédagogique) :
- 35 `true` (t=1.0), 8 `mostly_true` (t=0.75), 4 `mixed` (t=0.5), 2 `mostly_false` (t=0.25), 1 `false` (t=0).
- Promesses : 3 `kept` (1.0), 1 `partially_kept` (0.5).

$f = \frac{35 \times 1.0 + 8 \times 0.75 + 4 \times 0.5 + 2 \times 0.25 + 1 \times 0.0}{50} \times 100 = \frac{35 + 6 + 2 + 0.5 + 0}{50} \times 100 = 87.0$

$p = \frac{3 \times 1.0 + 1 \times 0.5}{4} \times 100 = \frac{3.5}{4} \times 100 = 87.5$

$\tau = 50 + 5 = 55$ (bonus précision numérique, pas de correction publique donc pas de +15).

$\text{TruthScore} = 0.60 \times 87.0 + 0.30 \times 87.5 + 0.10 \times 55 = 52.2 + 26.25 + 5.5 = 83.95$

Affichage : **84 (intervalle 80-88)**, significatif.

### 3.2 Exemple B : politique "mixte"

`Politicien B`, président de groupe parlementaire P0. Sur la période :
- 80 claims factuels résolus.
- 6 promesses résolues.
- 1 correction publique enregistrée.
- 6 % `misleading_context` (5 claims sur 80).
- 25 % avec `numeric_values`.

Mix verdicts : 30 `true`, 18 `mostly_true`, 12 `mixed`, 10 `mostly_false`, 5 `false`, 5 `misleading_context`.

$f = \frac{30 \times 1.0 + 18 \times 0.75 + 12 \times 0.5 + 5 \times 0.15 + 10 \times 0.25 + 5 \times 0.0}{80} \times 100 = \frac{30 + 13.5 + 6 + 0.75 + 2.5 + 0}{80} \times 100 = 65.94$

Promesses : 2 `kept`, 2 `partially_kept`, 2 `broken`.

$p = \frac{2 \times 1.0 + 2 \times 0.5 + 2 \times 0.0}{6} \times 100 = \frac{3}{6} \times 100 = 50.0$

$\tau = 50 + 15 = 65$ (correction publique +15 ; la part `misleading_context` à 6 % reste sous le seuil de 10 % et la part numérique à 25 % sous celui de 40 %, donc ni pénalité ni bonus).

$\text{TruthScore} = 0.60 \times 65.94 + 0.30 \times 50.0 + 0.10 \times 65 = 39.56 + 15.0 + 6.5 = 61.06$

Affichage : **61 (intervalle 56-65)**, significatif.

### 3.3 Exemple C : politique au volume insuffisant

`Politicien C`, sénateur P2. Sur la période :
- 12 claims factuels résolus.
- 0 promesse résolue (mandat en cours, jamais ministre).

$N_f = 12 < 30$ et $N_p = 0 < 5$, donc `is_significant = false`.

Score calculé en interne : $f = 72.5$, $\tau = 50$, $\text{TruthScore} = 70.5$.

Affichage public : **`Score non significatif (N = 12)`** avec lien vers la fiche détaillée et la liste des claims. Aucun classement.

## 4. Comparaison avec d'autres systèmes

| Système | Approche | Points forts | Points faibles | Différence avec politikar |
|---|---|---|---|---|
| PolitiFact (USA) | "Truth-O-Meter" 6 niveaux, agrégation simple par % de chaque niveau | popularité, lisibilité | pas de pondération vérifiabilité, pas d'IC, biais sélection | politikar pondère, donne un IC, et exclut les opinions |
| Full Fact (UK) | pas de score numérique unique, fiches qualitatives | très soigné méthodologiquement | difficile à comparer entre politiques | politikar offre comparabilité tout en gardant le détail |
| Faktisk (Norvège) | similaire à PolitiFact, échelle 5 niveaux | bonne couverture nordique | pas de différenciation par sujet | politikar décompose par topic |
| Africa Check | rating qualitatif, pas de score | rigueur narrative | pas de classement | politikar produit un classement avec garde-fous |
| Les Surligneurs (FR) | legal-checking sans score | excellence juridique | pas d'agrégation | politikar les ingère comme source dans la cascade |

Notre différenciateurs : intervalle de confiance affiché, plancher de volume, décomposition par topic, transparence du code et des prompts.

## 5. Anti-gaming

### 5.1 Récompenser les claims vérifiables

La pondération par `verifiability` ($v_i$) signifie qu'un politique qui ne dit que des banalités vagues (opinions, énoncés normatifs) ne maximisera pas son score : ces claims pèsent peu ou rien. À l'inverse, un politique qui prend des positions chiffrées et précises et qui a raison va naturellement monter.

### 5.2 Pénaliser le cadrage trompeur

Le verdict `misleading_context` (techniquement vrai mais induit en erreur) reçoit $t = 0.15$, et un pattern récurrent retire 15 points de transparence. Décourage le "vrai mais qui ment" via cadrage.

### 5.3 Volume comparable

Les classements publics ne se font qu'entre politiques de même `function_id` ou même tier (par exemple "ministres", "présidents de région"). Empêche les comparaisons absurdes (un Premier ministre vs un sénateur).

### 5.4 Plancher de volume

Avec $N_f < 30$, pas de classement. Empêche un politicien à 1 claim vrai de truster les rankings.

### 5.5 Période glissante

Score calculé sur les 24 derniers mois par défaut, période ajustable. Un politique ne peut pas se reposer sur un bilan ancien à long terme. Interface présente aussi un score "carrière complète" en sous-vue.

### 5.6 Audit annuel

Un panel éditorial parité politique gauche / droite / centre revoit en fin d'année :
- la distribution des verdicts par parti
- la distribution des `unverifiable` par parti
- les claims contestés en revue humaine

Si un biais systémique est détecté, ajustement transparent dans les seuils ou les prompts (et bump de version).

## 6. Affichage et UX

### 6.1 Interface

- Score principal : grand nombre + intervalle (ex. `84 (80-88)`).
- Bandeau d'incertitude : barre horizontale avec curseur sur le score, zone CI ombrée.
- Volume sous-jacent : `Calculé sur 50 affirmations factuelles vérifiées et 4 promesses résolues, sur la période 2024-2026`.
- Décomposition : grille de scores par topic, avec `-` si volume insuffisant.
- Lien méthode : pied de page `Méthodologie complète : politikar.fr/methode`.

### 6.2 Mention obligatoire si non significatif

`Score non significatif (N = X claims). Affichage limité aux fiches détaillées.`

### 6.3 Pas de classement national absolu

Pas de page "Top 10 / Flop 10 des politiques français" en page d'accueil. Seuls les classements par fonction homogène sont publiés. Choix éditorial pour limiter la sensationnalisation.

## 7. Code de référence

```python
# apps/workers/politikar_workers/scoring.py
from dataclasses import dataclass
from statistics import quantiles
from typing import Iterable, Literal
import random

VERIDICT_FACTUAL_T = {
    "true": 1.0, "mostly_true": 0.75, "mixed": 0.5,
    "misleading_context": 0.15, "mostly_false": 0.25, "false": 0.0,
}
VERDICT_PROMISE_P = {
    "kept": 1.0, "partially_kept": 0.5, "broken": 0.0, "abandoned": 0.0,
}
VERIFIABILITY = {
    ("factual_assertion", True): 1.0,
    ("factual_assertion", False): 0.8,
    ("promise", None): 0.7,
    ("prediction", None): 0.5,
    ("normative_statement", None): 0.3,
}
TIER_WEIGHT = {"P0": 1.0, "P1": 0.8, "P2": 0.6}
HIGH_PRIORITY_TOPICS = {"economy", "security", "immigration", "health"}
MID_PRIORITY_TOPICS = {
    "justice", "education", "ecology_climate", "fiscal_policy",
    "public_debt", "europe", "foreign_policy", "social_protection",
}

@dataclass
class ClaimRow:
    claim_type: str
    has_numeric: bool
    confidence: float
    topic_tags: list[str]
    politician_tier: str
    source_credibility: int
    verdict: str
    is_human_reviewed: bool
    used_opus: bool

def topic_priority(topic_tags: Iterable[str]) -> float:
    if any(t in HIGH_PRIORITY_TOPICS for t in topic_tags):
        return 1.0
    if any(t in MID_PRIORITY_TOPICS for t in topic_tags):
        return 0.7
    return 0.5

def credibility_norm(c: int) -> float:
    return {5: 1.0, 4: 0.9, 3: 0.75, 2: 0.5, 1: 0.25}.get(c, 0.5)

def claim_weight(c: ClaimRow) -> float:
    if c.claim_type == "factual_assertion":
        v = VERIFIABILITY[("factual_assertion", c.has_numeric)]
    elif c.claim_type in ("promise", "prediction", "normative_statement"):
        v = VERIFIABILITY[(c.claim_type, None)]
    else:
        return 0.0
    if v == 0.0:
        return 0.0
    conf = c.confidence
    if c.is_human_reviewed or c.used_opus:
        conf = min(1.0, conf * 1.05)
    r = (
        0.5 * topic_priority(c.topic_tags)
        + 0.3 * TIER_WEIGHT.get(c.politician_tier, 0.6)
        + 0.2 * credibility_norm(c.source_credibility)
    )
    return conf * v * r

def factual_score(rows: list[ClaimRow]) -> float | None:
    pairs = [
        (claim_weight(c), VERIDICT_FACTUAL_T[c.verdict])
        for c in rows
        if c.claim_type == "factual_assertion" and c.verdict in VERIDICT_FACTUAL_T
    ]
    pairs = [(w, t) for (w, t) in pairs if w > 0]
    if not pairs:
        return None
    num = sum(w * t for w, t in pairs)
    den = sum(w for w, _ in pairs)
    return 100.0 * num / den

def promise_score(rows: list[ClaimRow]) -> float | None:
    pairs = [
        (claim_weight(c), VERDICT_PROMISE_P[c.verdict])
        for c in rows
        if c.claim_type == "promise" and c.verdict in VERDICT_PROMISE_P
    ]
    pairs = [(w, p) for (w, p) in pairs if w > 0]
    if not pairs:
        return None
    num = sum(w * p for w, p in pairs)
    den = sum(w for w, _ in pairs)
    return 100.0 * num / den

def transparency_score(rows: list[ClaimRow], has_public_correction: bool) -> float:
    n_factual = sum(1 for c in rows if c.claim_type == "factual_assertion")
    if n_factual == 0:
        return 50.0
    n_misleading = sum(1 for c in rows if c.verdict == "misleading_context")
    n_unverifiable = sum(1 for c in rows if c.verdict == "unverifiable")
    n_numeric = sum(
        1 for c in rows
        if c.claim_type == "factual_assertion" and c.has_numeric
    )
    score = 50.0
    if has_public_correction:
        score += 15.0
    if n_misleading / n_factual > 0.10:
        score -= 15.0
    if n_unverifiable / max(1, n_factual) > 0.30:
        score -= 10.0
    if n_numeric / n_factual > 0.40:
        score += 5.0
    return max(0.0, min(100.0, score))

def truth_score(
    rows: list[ClaimRow],
    has_public_correction: bool,
) -> tuple[float | None, dict[str, float | None]]:
    f = factual_score(rows)
    p = promise_score(rows)
    tau = transparency_score(rows, has_public_correction)
    weights = {"f": 0.6, "p": 0.3, "tau": 0.1}
    components = {"f": f, "p": p, "tau": tau}
    used = {k: weights[k] for k, v in components.items() if v is not None}
    if not used:
        return None, components
    norm = sum(used.values())
    score = sum(used[k] * components[k] for k in used) / norm
    return score, components

def bootstrap_ci(
    rows: list[ClaimRow],
    has_public_correction: bool,
    n_iter: int = 1000,
    seed: int = 42,
) -> tuple[float, float]:
    rng = random.Random(seed)
    samples = []
    n = len(rows)
    if n == 0:
        return (float("nan"), float("nan"))
    for _ in range(n_iter):
        resample = [rows[rng.randint(0, n - 1)] for _ in range(n)]
        score, _ = truth_score(resample, has_public_correction)
        if score is not None:
            samples.append(score)
    if not samples:
        return (float("nan"), float("nan"))
    samples.sort()
    lo = samples[int(0.025 * len(samples))]
    hi = samples[int(0.975 * len(samples))]
    return (lo, hi)
```

(Fichier complet et testé en Phase 5. Les valeurs et seuils ci-dessus sont la v1 publiée.)

## 8. Tests

- `tests/scoring/test_examples.py` reproduit exactement les 3 exemples chiffrés ci-dessus à 0.5 % près.
- `tests/scoring/test_invariants.py` :
  - score d'un politicien sans claim : `None`, `is_significant = false`.
  - changement d'un seul verdict d'`unverifiable` à `true` ne casse pas la propriété de monotonie (score augmente ou reste).
  - swap d'un `true` vers un `false` doit faire baisser le score.
  - bootstrap stable sur seed fixe.

## 9. Versionnement

`SCORING_VERSION = "v1.0.0"` stocké en colonne `politician_truth_scores.scoring_version` à ajouter dans une migration ultérieure si la formule évolue. Tout changement de pondération ou de seuil bump la minor version.

## 10. Questions ouvertes pour relecture

1. Pondération `0.60 / 0.30 / 0.10` : faut-il rééquilibrer ? Argument pour 0.50 / 0.40 / 0.10 si on veut donner plus de poids aux promesses (proxy d'engagement réel).
2. Mapping `misleading_context = 0.15` vs 0.0 : est-il assez pénalisant ? Position : 0.15 reconnaît qu'il y a une part de vrai, suffit en combo avec le malus transparence.
3. Plancher de volume : 30 claims factuels est-il trop strict pour des politiques moins exposés ? On pourrait abaisser à 20 mais avec CI plus large affiché.
4. Période par défaut : 24 mois. À ajuster ?
5. Audit annuel : composition du panel, processus de désignation ? Nécessite RISKS + un statut juridique du collectif.
