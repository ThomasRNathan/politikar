# RISKS

> Inventaire des risques juridiques, éthiques, techniques et médiatiques de politikar, avec mitigations associées. Ce document est vivant : tout incident ou nouvelle menace identifiée doit ajouter une ligne ici.

## 1. Risques juridiques

### 1.1 Diffamation

**Risque** : un politique attaqué par un verdict `false` ou `mostly_false` engage une procédure pour diffamation publique (loi 1881 sur la liberté de la presse en France).

**Vraisemblance** : élevée. Surtout pour les figures P0 et lors de cycles électoraux.

**Impact** : assignation, publication forcée d'un droit de réponse, dommages-intérêts, gel du projet.

**Mitigations** :
- Distinction sémantique stricte dans tous les outputs publics : on qualifie le *propos* (`ce propos est jugé faux selon...`), jamais la personne (`X ment`).
- `verifications.reasoning` cite systématiquement au moins une source vérifiable et autorisée (institution ou fact-checker reconnu).
- Verdicts `false` sur P0 obligatoirement passés par revue humaine avant publication (cf. `claim_review_queue` flag P0).
- Conservation immuable de toute la chaîne (source brute, claim, prompt version, verdict, reviewer) pour défense en cas d'action.
- Mention "Méthodologie publique" en pied de chaque verdict avec lien vers `politikar.fr/methode`.
- Clause de bonne foi : politikar publie en s'appuyant sur une méthode rigoureuse et publique, n'a pas d'animosité envers la personne, agit dans un intérêt démocratique.
- Hébergement en Europe (Vercel EU + Supabase EU) pour s'inscrire dans le cadre légal européen.

**Plan B si action en justice** : retrait temporaire du verdict contesté, ouverture immédiate d'une revue avec le comité éditorial, communication transparente sur la procédure.

### 1.2 Droit de réponse

**Risque** : un politique exige un droit de réponse en bonne et due forme (loi 1881, article 13 pour la presse en ligne sous le statut de service de communication au public).

**Vraisemblance** : moyenne à élevée.

**Impact** : obligation de publication du droit de réponse, refus = amende.

**Mitigations** :
- Procédure formalisée et publique sur la page À propos : email dédié `droit-de-reponse@politikar.fr`, template à fournir, délai de traitement annoncé < 30 jours.
- Réponses publiées en regard du verdict contesté, lien réciproque.
- Si le contenu de la réponse soulève un doute factuel sur le verdict, ouverture automatique d'une revue éditoriale avec republication potentielle d'une `verifications` mise à jour (avec `superseded_by_verification_id`).

### 1.3 Conformité RGPD et données personnelles

**Risque** : qualification de politikar comme responsable de traitement de données à caractère personnel, action de la CNIL, droit d'accès et de rectification.

**Vraisemblance** : haute (la CNIL a déjà commenté des projets civic tech).

**Impact** : obligations de mise en conformité (DPO, registre, AIPD), amende RGPD jusqu'à 4 % du CA mondial (faible ici, mais le projet doit être propre).

**Mitigations** :
- Limitation au champ public : aucun traitement de données privées (santé, sexualité, vie familiale hors fonction publique). Audit des champs `politicians.*` pour s'assurer qu'on ne stocke rien hors champ d'exercice public.
- Mineurs : exclus explicitement (les enfants de politiciens, ou les politiciens lorsque mineurs au moment du propos).
- Base légale revendiquée : intérêt légitime, finalité d'information du public sur l'exercice du débat démocratique. Documenté dans une déclaration de confidentialité publique.
- Registre des traitements rédigé et publié.
- DPO désigné (rôle bénévole acceptable au démarrage, à formaliser lors de la sortie publique).
- Procédure d'effacement et de rectification opérationnelle, traitement < 30 jours.
- Hébergement données en UE.

### 1.4 Atteinte à la dignité, harcèlement, incitation à la haine

**Risque** : un agrégat ou un score est interprété comme une attaque ad hominem, ou utilisé par des tiers pour harceler.

**Vraisemblance** : moyenne.

**Impact** : action pénale, retrait forcé.

**Mitigations** :
- Pas de classement "Top 10 des menteurs" ou expression équivalente. Vocabulaire éditorial neutre obligatoire (cf. PROMPTS section 1).
- Refus systématique de moqueries, mèmes, contenu humoristique sur la plateforme officielle (les tiers peuvent en faire ce qu'ils veulent, mais politikar ne génère que du factuel).
- Modération des espaces communautaires (commentaires, contestations) si ouverts. Position MVP : pas de commentaires publics utilisateur, seulement formulaires de droit de réponse et signalement.

### 1.5 Présomption d'innocence

**Risque** : un verdict `false` sur un claim portant sur une accusation pénale en cours pourrait être assimilé à une atteinte à la présomption d'innocence.

**Vraisemblance** : faible mais réelle.

**Mitigations** :
- Refus systématique de fact-checker des claims portant sur des affaires judiciaires en cours (mention dans le prompt 4 et règle Python en amont).
- Dossiers judiciaires : on ingère seulement les communications officielles de la justice (jugements, ordonnances) comme `evidence`.

### 1.6 Loi sur la confiance dans l'économie numérique (LCEN) et statut d'éditeur

**Risque** : politikar est qualifié d'éditeur de contenu (et non d'hébergeur) car il choisit, ordonne, et publie des verdicts. Responsabilité éditoriale pleine.

**Vraisemblance** : forte (qualification probable).

**Impact** : obligations renforcées sur la modération, déclaration de directeur de publication.

**Mitigations** :
- Assumer le statut d'éditeur dès le départ.
- Désigner un directeur de la publication (mention sur la page À propos).
- Adopter une charte déontologique publique (à rédiger en Phase 8 avant lancement public).

## 2. Risques éthiques

### 2.1 Biais des LLM

**Risque** : Claude (et les LLM en général) ont un biais culturel d'entraînement (corpus anglophone majoritaire, biais valeurs USA). Risque d'application non-neutre sur la politique française.

**Vraisemblance** : avérée.

**Impact** : verdicts systématiquement plus durs envers une famille politique, perte de crédibilité.

**Mitigations** :
- Système de prompt insistant sur la neutralité partisane (cf. PROMPTS section 1).
- Audit annuel par panel parité gauche / centre / droite : distribution des verdicts par parti, par topic. Si écart structurel et inexplicable, ajustement des prompts ou des seuils.
- Prompts de garde explicites : "traite avec exactement la même rigueur qu'un claim consensuel" (présent dans `verification_cascade@v1.0.0`).
- Evaluation publique : jeu de tests adversarial avec claims équivalents formulés depuis chaque famille politique, vérification que les verdicts produits sont cohérents.
- Ouverture du benchmark à la communauté pour signaler les biais détectés.

### 2.2 Biais des sources de fact-checking

**Risque** : les fact-checkers eux-mêmes (AFP Factuel, Décodeurs, etc.) ont leurs propres biais éditoriaux, en majorité positionnés au centre gauche. Si politikar utilise leurs verdicts comme evidence, le biais s'intègre.

**Vraisemblance** : avérée.

**Mitigations** :
- Diversification des sources (5 fact-checkers majeurs, pas un seul).
- Pondération des `evidence` par accord croisé : un verdict supporté par 3 fact-checkers indépendants pèse plus qu'un seul.
- Audit de la distribution des `data_sources_used` par parti politique cible : si un parti voit majoritairement un seul fact-checker dans ses verdicts, alerte.
- Ajout post-MVP de fact-checkers de plus à droite si dispo (Faktik n'existe pas en France, mais on suit les bilans Fondapol pour ajustement).
- Verdicts P0 escaladés à Opus + revue humaine : limite la dépendance pure aux fact-checkers.

### 2.3 Framing par sélection des sources

**Risque** : le choix des sources d'information (sites scrapés, émissions YouTube ingérées) crée un biais "ce qu'on voit" qui n'est pas le même selon le parti.

**Vraisemblance** : élevée.

**Mitigations** :
- Liste des sources publique et auditable (cf. SOURCES).
- Couverture symétrique : pour chaque parti représenté à l'AN ou Sénat, garantir un volume comparable de sources ingérées.
- Métriques de couverture : tableau de bord interne `admin/coverage` qui montre le nombre de claims par parti par mois. Alerte si déséquilibre > 30 %.
- Plus de comptes officiels et moins de presse : les comptes officiels (AN, Sénat, communiqués) ne sont pas filtrés, donc plus neutres en couverture.

### 2.4 "Neutralité fausse" et fausse équivalence

**Risque** : en traitant chaque parti à égalité quel que soit son comportement, politikar crée artificiellement une équivalence morale ("les uns mentent autant que les autres") qui peut être trompeuse.

**Vraisemblance** : risque inhérent à toute mesure agrégée.

**Mitigations** :
- Affichage non agrégé en première intention : page d'accueil ne classe pas les partis sur un seul score, mais montre la distribution des verdicts.
- Décomposition par topic : permet de voir où chaque parti est rigoureux ou pas.
- Mention explicite dans la méthodologie : `politikar mesure la véracité du discours, pas la qualité morale ni la pertinence politique des positions`.
- Refus de produire des comparatifs partisans en page d'accueil. Le comparatif est consultable mais nécessite un drill-down explicite.

### 2.5 Dérive vers un journalisme automatisé

**Risque** : la facilité de produire des verdicts à grande échelle pousse à publier sans relecture, érodant la qualité.

**Vraisemblance** : forte si pas de garde-fous.

**Mitigations** :
- Plancher de revue humaine pour les claims P0, sensibles, ou de faible confiance (cf. PROMPTS section 7.1).
- Métrique `% claims publiés sans revue` suivie publiquement, plafond cible 80 % (20 % minimum revus humainement).
- Pas d'automatisation totale du pipeline : la publication d'un verdict requiert un step explicite (cron horaire qui flush la queue après check `is_published = true`).
- Revue éditoriale hebdomadaire d'un échantillon aléatoire de 20 verdicts publiés.

### 2.6 Effet de score unique

**Risque** : un score `74` est lu comme un verdict moral global sur la personne, alors qu'il agrège de l'hétérogène.

**Mitigations** :
- Affichage UX qui rend visible la décomposition par topic (cf. SCORING section 6.1).
- Mention obligatoire de l'incertitude (`74 (intervalle 70-78)`).
- Volume sous-jacent affiché.
- Pas de classement national absolu en page d'accueil.

## 3. Risques techniques

### 3.1 Drift des sites scrapés

**Risque** : un site change son HTML, le scraper se casse silencieusement, on ingère 0 ou des données corrompues.

**Vraisemblance** : élevée.

**Mitigations** :
- Health check par source (cf. SOURCES section 8) avec alerte si 0 ingest sur 3 runs.
- Tests unitaires des parsers sur fixtures HTML capturées, exécutés en CI.
- Schémas Pydantic stricts en sortie de parser : un schéma cassé fait échouer le worker proprement.
- Plan B documenté pour chaque source.

### 3.2 Hallucinations Claude

**Risque** : Claude invente une statistique, une citation, une source.

**Vraisemblance** : connue, présente sur tout LLM.

**Mitigations** :
- Tool use strict avec JSON Schema : pas de free text en production.
- Cascade de vérification : Claude n'a pas accès au web search, il doit s'appuyer sur les `evidences` pré-collectées par le pipeline.
- `confidence_score` qui descend déclenche escalade Opus + revue humaine.
- Tests unitaires de hallucination : prompts piégés avec sources fictives, vérifier que Claude refuse de citer.
- Validation statistique post-production : sur 200 verdicts publiés, échantillonner 20 et vérifier à la main si chaque citation existe vraiment.

### 3.3 Faux duplicats par embeddings

**Risque** : deux claims sémantiquement proches mais factuellement différents (par exemple `chômage à 7 %` vs `chômage à 9 %`) sont fusionnés et un seul verdict s'applique aux deux.

**Vraisemblance** : modérée.

**Mitigations** :
- Seuil de similarity élevé (0,92 cosine) calibré en Phase 3 sur jeu test annoté.
- Vérification supplémentaire : si deux claims fusionnés ont des `numeric_values` divergents (ratio > 1,2), on bloque la fusion et on les traite comme distincts.
- Audit échantillon des fusions toutes les semaines, faux positifs corrigés et seuil ajusté.

### 3.4 Scaling pgvector

**Risque** : au-delà de 100k claims, IVFFlat devient lent ou imprécis.

**Vraisemblance** : moyen terme (an 2-3).

**Mitigations** :
- Migration vers `HNSW` (pgvector >= 0.5) prévue. `m=16, ef_construction=64` initial, ajusté.
- Migration documentée à l'avance, testée en staging avant bascule.

### 3.5 Coût LLM hors contrôle

**Risque** : un bug ou une boucle non bornée multiplie les appels Claude, dépasse le budget.

**Vraisemblance** : modérée (a priori bas avec Inngest mais reste possible).

**Mitigations** :
- Plafonds Anthropic Console : alertes à 50 % et 80 % du budget.
- Feature flag `ingestion_enabled` : pousse à `false` en cas de pic, pause les crons.
- Rate limiting interne sur les appels Claude (par cron run, par topic).
- Idempotence (`raw_text_sha256`) : un même contenu n'est jamais reprocessé.
- Boucle de cascade bornée à 2 itérations max (Sonnet + Opus, point final).

### 3.6 Pertes de données

**Risque** : crash Supabase, suppression accidentelle, drop de table par migration mal écrite.

**Mitigations** :
- Backups quotidiens Supabase Pro automatiques (rétention 7 jours, upgrade vers 30 jours si budget).
- Backups hebdomadaires manuels via `pg_dump` vers S3 (Cloudflare R2 free tier, 10 Go).
- Migrations testées en local avant prod, jamais de DROP non précédé d'un backup explicite.

### 3.7 Sécurité applicative

**Risque** : XSS dans les `verifications.reasoning` ou `claim_text` rendus côté front, SSRF via `evidence.source_url`, injection SQL via paramètres mal échappés.

**Mitigations** :
- React échappe par défaut, pas de `dangerouslySetInnerHTML`.
- Validation stricte des URLs (schemas autorisés `https`, hosts non internes).
- ORM ou paramètres préparés systématiques (`asyncpg`, `supabase-js`). Pas de concat SQL.
- Headers de sécurité HTTP : `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`.
- Audit `npm audit` et `pip-audit` en CI.

## 4. Risques médiatiques et opérationnels

### 4.1 Récupération politique

**Risque** : un parti politique reprend un score politikar pour attaquer un adversaire en campagne, dénaturant le contexte.

**Vraisemblance** : forte une fois le projet visible.

**Mitigations** :
- Charte de citation publique : politikar publie un encart `Comment citer politikar` qui rappelle de mentionner volume sous-jacent, période, intervalle de confiance.
- Pas d'API qui renvoie un seul score sans métadonnées : tout endpoint inclut `n_claims`, `ci_low`, `ci_high`, `period`.
- Communication proactive au moment des élections : rappel public que le score n'est pas un programme et qu'il est dépendant de la couverture des sources.
- Si un acteur reprend de manière manifestement trompeuse, communiqué de mise au point.

### 4.2 Attaque sur la liberté d'expression

**Risque** : un acteur accuse politikar d'être un "ministère de la vérité", d'imposer un récit, de censurer la parole politique.

**Vraisemblance** : élevée.

**Mitigations** :
- Politikar ne supprime aucune parole politique : on ingère, on annote, on rend public. Le politique reste libre de dire ce qu'il veut.
- Insister sur la nature complémentaire et non-prescriptive de l'outil (information du citoyen, pas censure).
- Méthodologie complète et publique, audit ouvert annuel.
- Ne pas se positionner comme "la vérité". Toujours formuler `selon notre méthode publique, ce propos est jugé X avec confiance Y %`.
- Open source du code et des prompts : tout le monde peut auditer, fork, contester.

### 4.3 DDoS post-publication

**Risque** : pic de trafic ou attaque coordonnée au lancement ou suite à la publication d'un verdict très commenté.

**Mitigations** :
- Cloudflare en proxy front : WAF, anti-DDoS, cache CDN.
- Vercel scaling auto sur Fluid Compute.
- Rate limiting applicatif (60 req/min/IP via middleware Next.js + Upstash Redis).
- Plan de continuité : si pic non gérable, désactiver l'API publique le temps de scaler manuellement.

### 4.4 Deepfakes et captures détournées

**Risque** : un acteur photoshoppe une page politikar avec un score inventé, partagé en masse comme "preuve" sur réseaux.

**Mitigations** :
- Watermark optionnel sur les screenshots officiels (mention `politikar.fr/<slug>` discrète).
- Signature de l'API : champ `signature` Ed25519 sur les réponses majeures (post-MVP).
- Communication de mise au point rapide en cas d'incident détecté.
- Surveillance proactive des hashtags `#politikar` sur réseaux (post-MVP).

### 4.5 Risque de sortie de route éditoriale

**Risque** : un contributeur ou bénévole abuse de son accès admin pour pousser un verdict orienté.

**Mitigations** :
- Tracé complet en `audit_log` : tout changement admin est logué avec acteur et payload.
- Multi-eyes pour les verdicts P0 sensibles (deux reviewers indépendants doivent valider).
- Code reviews obligatoires sur les PR qui touchent les prompts ou les seuils de scoring.
- Charte de gouvernance signée par les contributeurs avec accès admin.

## 5. Mitigations transverses

1. **Panel éditorial** : groupe consultatif parité gauche / centre / droite, pluraliste, audite annuellement la distribution des verdicts. Composition publique. Pouvoir de recommandation, pas de veto.
2. **Open source intégral** : code, prompts (avec versions), seuils de scoring, et liste des sources sont publics. Quiconque peut fork et challenger.
3. **API publique read-only** : permet aux chercheurs et journalistes de vérifier indépendamment.
4. **Documentation de la méthode** : page `politikar.fr/methode` lien depuis chaque verdict, navigation claire vers ARCHITECTURE / PROMPTS / SCORING.
5. **Plancher de volume** : pas de score si donnée trop maigre, évite les faux positifs.
6. **Mécanisme de contestation** : email dédié, procédure publique, délai annoncé, traitement tracé.
7. **Audit annuel** : rapport publié au 1er trimestre de chaque année, signé par le panel éditorial, listant : distribution des verdicts par parti, biais détectés, ajustements appliqués.
8. **Refus de l'anonymat des contributeurs sur claims sensibles** : pour les commits qui modifient un verdict P0, identité claire requise.

## 6. Risques résiduels assumés

Même avec les mitigations, certains risques ne peuvent pas être complètement éliminés :

- Aucun système de fact-checking n'est parfaitement neutre : politikar peut afficher un biais résiduel non détecté.
- Une procédure judiciaire peut survenir et obliger à des retraits temporaires.
- Le LLM peut produire un verdict erroné qui passe la revue par chance malheureuse.
- La couverture des sources, par construction, sous-représente certaines voix (locales, marginales).

Ces risques sont assumés. La transparence est notre première ligne de défense : les utilisateurs voient comment c'est calculé, peuvent contester, et l'historique des corrections est public.

## 7. Plan de réponse aux incidents

### 7.1 Incident éditorial (verdict contesté)

1. Réception de la contestation (email ou interface).
2. Acquittement < 48h.
3. Revue par 2 reviewers du panel éditorial (indépendants entre eux).
4. Décision publiée sous 30 jours :
   - maintien : motivé publiquement
   - correction : nouvelle `verifications` row avec `superseded_by` sur l'ancienne, lien public.
   - retrait : flag `is_published = false` avec explication publique.

### 7.2 Incident technique (panne, fuite, breach)

1. Détection (monitoring ou signalement).
2. Acquittement < 1h.
3. Communication de transparence sous 72h max sur la page status.
4. Post-mortem public dans les 14 jours.

### 7.3 Action en justice

1. Saisie immédiate d'un avocat (à pré-engager : structure type cabinet civic tech).
2. Geler temporairement le verdict contesté, mention publique de la procédure.
3. Communication mesurée, pas de polémique.
4. Information du panel éditorial et du DPO.

## 8. Questions ouvertes pour relecture

1. **Statut juridique de politikar** : association loi 1901 ? SAS ? SCIC ? Détermine la responsabilité du directeur de publication. Position : association loi 1901 préférable pour signaler le caractère non lucratif.
2. **Composition initiale du panel éditorial** : combien de membres, comment recrutés, indemnisés ou bénévoles ?
3. **Politique sur les contributions externes** : open contributions sur GitHub, mais quels rôles peut-on déléguer ? Position MVP : revue de code par mainteneur(s), pas de write direct sur main pour les contributeurs externes.
4. **Position sur la presse** : politikar publie ses verdicts ; comment gérer si un média reprend en deformant ? Communiqué dédié vs rectification publique ?
5. **Plan de financement** : si une fondation finance le projet, comment garantir l'indépendance éditoriale (charte de gouvernance) ? Pas de financement par parti ou candidat, jamais.
