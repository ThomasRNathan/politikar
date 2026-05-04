# SOURCES

> Inventaire des sources de données de politikar. Politique de sourcing : strictement gratuit, open, scraping de contenus publics au MVP. Pas d'AFP licensing, pas d'API X/Twitter payante avant que le MVP soit validé. Toute source ajoutée doit passer par cette grille (URL, accès, licence, fiabilité, fréquence, priorité, plan B).

## 1. Échelle de fiabilité

| Note | Signification |
|---|---|
| 5 | Source officielle institutionnelle (parlement, gouvernement, autorité indépendante, statistique publique) |
| 4 | Source institutionnelle dérivée vérifiée (NosDéputés, Wikidata curated) ou fact-checker majeur reconnu |
| 3 | Média mainstream avec service vérification ou data-journalisme |
| 2 | Média généraliste sans cellule fact-check dédiée |
| 1 | Source à manier avec prudence, ne sert que d'indice |

## 2. Tableau récapitulatif

| Source | URL | Accès | Licence | Fiabilité | Fréquence | Priorité |
|---|---|---|---|---|---|---|
| Assemblée nationale open data | `data.assemblee-nationale.fr` | API JSON + dumps | Licence ouverte Etalab 2.0 | 5 | journalière | P0 |
| Sénat open data | `data.senat.fr` | dumps XML/JSON | Licence ouverte Etalab 2.0 | 5 | journalière | P0 |
| Sénat (séances) | `senat.fr/seances` | scrape HTML | mention obligatoire | 5 | journalière | P0 |
| NosDéputés.fr | `nosdeputes.fr` | API REST + dumps CSV/JSON | Licence ODbL | 4 | journalière | P0 |
| NosSénateurs.fr | `nossenateurs.fr` | API REST + dumps | Licence ODbL | 4 | journalière | P0 |
| Élysée communiqués | `elysee.fr/actualites` | scrape HTML + RSS | Licence ouverte Etalab 2.0 | 5 | journalière | P0 |
| Matignon / info.gouv.fr | `info.gouv.fr/actualite` | scrape HTML + RSS | Licence ouverte Etalab 2.0 | 5 | journalière | P0 |
| Conseil des ministres | `gouvernement.fr/conseil-des-ministres` | scrape HTML | Licence ouverte Etalab 2.0 | 5 | hebdomadaire | P0 |
| Wikidata SPARQL | `query.wikidata.org` | endpoint SPARQL | CC0 | 4 | hebdomadaire (seeding) | P0 |
| INSEE BDM | `bdm.insee.fr/series/sdmx` | API SDMX | Licence ouverte Etalab 2.0 | 5 | hebdomadaire | P0 |
| Eurostat REST | `ec.europa.eu/eurostat/api/dissemination` | API JSON | Licence Eurostat (libre) | 5 | hebdomadaire | P0 |
| data.gouv.fr | `data.gouv.fr/api` | API REST | Licence ouverte Etalab 2.0 | 5 | hebdomadaire | P0 |
| AFP Factuel | `factuel.afp.com/list/all/all/all/all/0` | scrape HTML | citation obligatoire (extraits courts) | 4 | journalière | P0 |
| CheckNews (Libération) | `liberation.fr/checknews` | scrape HTML | citation obligatoire | 4 | journalière | P0 |
| Les Décodeurs (Le Monde) | `lemonde.fr/les-decodeurs` | scrape HTML + RSS | citation obligatoire | 4 | journalière | P0 |
| Vrai ou Faux (France Info) | `francetvinfo.fr/vrai-ou-faux` | scrape HTML + RSS | citation obligatoire | 4 | journalière | P0 |
| Les Surligneurs | `lessurligneurs.eu` | scrape HTML + RSS | CC BY-NC-SA | 4 | hebdomadaire | P0 |
| Désintox (Arte) | `arte.tv/fr/videos/RC-014335/desintox` | scrape HTML | citation obligatoire | 3 | hebdomadaire | P1 |
| Banque de France | `banque-france.fr/statistiques` | API + bulk | Licence ouverte | 5 | hebdomadaire | P1 |
| Cour des comptes | `ccomptes.fr/fr/publications` | scrape PDF + HTML | Licence ouverte Etalab 2.0 | 5 | mensuelle | P1 |
| YouTube politique (sélection) | `youtube.com` (chaînes ciblées) | yt-dlp + Whisper API | TOS YouTube (usage personnel/recherche) | 3 | hebdomadaire | P1 |
| Parlement européen | `europarl.europa.eu/plenary` | API + dumps + scrape | Licence Commission UE | 5 | hebdomadaire | P1 |
| SSMSI (sécurité intérieure) | `interieur.gouv.fr/Interstats` | bulk Excel | Licence ouverte Etalab 2.0 | 5 | mensuelle | P1 |
| OFDT | `ofdt.fr` | bulk PDF | Licence ouverte | 4 | trimestrielle | P1 |
| DREES (santé/social) | `drees.solidarites-sante.gouv.fr` | bulk + API | Licence ouverte | 5 | mensuelle | P1 |
| DEPP (éducation) | `education.gouv.fr/depp` | bulk Excel | Licence ouverte | 5 | mensuelle | P1 |
| Institut Montaigne | `institutmontaigne.org/notes` | scrape HTML | citation obligatoire | 3 | mensuelle | P1 |
| Terra Nova | `tnova.fr` | scrape HTML | citation obligatoire | 3 | mensuelle | P1 |
| Fondapol | `fondapol.org` | scrape HTML | citation obligatoire | 3 | mensuelle | P1 |
| X / Twitter | API officielle | API v2 Basic | TOS X (200 $/mo) | 2 | quasi temps réel | P2 |
| AFP fil dépêches | API pro | API licence | commerciale | 5 | quasi temps réel | P2 |
| TikTok officiels politiciens | scrape ou TikTok API | TOS TikTok | restreint | 1 | hebdomadaire | P2 |
| Instagram officiels | API Graph | TOS Meta | restreint | 1 | hebdomadaire | P2 |
| Presse complète (Reuters, etc.) | flux RSS / scrape | citation | variable | 2 | journalière | P2 |

## 3. Sources P0 détaillées

### 3.1 Assemblée nationale open data

- **URL principale** : `https://data.assemblee-nationale.fr`
- **Datasets clés** :
  - `Acteurs et organes de la XVIe législature` (référentiel des députés actifs)
  - `Comptes rendus intégraux des séances publiques` (verbatim AN, format XML)
  - `Questions au Gouvernement` (texte intégral)
  - `Scrutins publics` (votes nominatifs)
- **Format** : JSON et XML, dumps quotidiens publiés à 06:00 Paris.
- **Parser cible** : Python `lxml` pour XML séances (gros), `httpx + json` pour le reste.
- **Fréquence ingestion** : journalière 04:00 UTC (cron Inngest).
- **Rate limit observé** : aucun explicite, courtoisie 1 req/s.
- **Plan B** : si dump HS, scrape `assemblee-nationale.fr/dyn/16/seances` HTML.
- **Contenu utile** :
  - Référentiel politiciens P0 et P1 (base seeding) avec mandate dates.
  - `sources` de type `parliamentary_intervention` et `parliamentary_question`.

### 3.2 Sénat open data + scrape séances

- **URL principale** : `https://data.senat.fr` et `https://www.senat.fr/seances`
- **Datasets clés** :
  - `Sénateurs` (référentiel)
  - `Comptes rendus intégraux` (publiés J+1 à J+3)
  - `Questions écrites` et `Questions orales`
- **Format** : JSON et XML pour open data ; HTML pour les séances.
- **Parser cible** : `httpx + json` pour data.senat.fr, `selectolax` pour scrape HTML séances.
- **Fréquence** : journalière 05:00 UTC.
- **Rate limit** : courtoisie 1 req/s, identifiant `User-Agent: politikar/0.1 (https://politikar.fr)`.
- **Plan B** : NosSénateurs.fr couvre 90 % du même contenu.

### 3.3 NosDéputés.fr et NosSénateurs.fr

- **Mainteneur** : association Regards Citoyens.
- **API REST** : `https://www.nosdeputes.fr/<id>/json` pour fiches individuelles, dumps complets dispos.
- **Endpoints clés** :
  - `/députés/json` : liste complète
  - `/<slug>/interventions/json` : interventions parlementaires d'un député
  - `/<slug>/questions/json` : questions écrites
  - `/synthese/data/json` : indicateurs agrégés (présence, amendements, etc.)
- **Fréquence** : journalière, mais snapshot hebdomadaire suffit pour le référentiel.
- **Rate limit** : aucun documenté, courtoisie 1 req/s.
- **Plan B** : reconstruire à partir de l'open data AN/Sénat (plus de travail).
- **Note** : excellente normalisation, à privilégier comme source de référentiel.

### 3.4 Élysée

- **URL** : `https://www.elysee.fr/actualites` (HTML) et `https://www.elysee.fr/feed` (RSS).
- **Types ingérés** : communiqués, déclarations présidentielles, discours, conférences de presse.
- **Parser cible** : `selectolax` pour HTML, `feedparser` pour RSS, déduplication via lien canonique.
- **Fréquence** : journalière 04:30 UTC.
- **Rate limit** : pas de quota explicite ; respecter `Crawl-delay: 10` du robots.txt.
- **Plan B** : agrégation Vie-publique.fr (reprend la plupart des communiqués).

### 3.5 Matignon (info.gouv.fr) et gouvernement.fr

- **URL** : `https://www.info.gouv.fr/actualite` et `https://www.gouvernement.fr/conseil-des-ministres`.
- **Types ingérés** : déclarations PM, comptes rendus Conseil des ministres, communiqués ministériels.
- **Parser cible** : `selectolax` HTML, scraping politely (1 req/2s).
- **Fréquence** : journalière 04:30 UTC.
- **Plan B** : flux RSS officiels si disponibles.

### 3.6 Wikidata SPARQL (seeding du référentiel)

- **Endpoint** : `https://query.wikidata.org/sparql`
- **Usage** : seed initial des `politicians`, `parties`, `regions` France au démarrage.
- **Exemple de requête** (top 50 figures France) :

```sparql
SELECT ?person ?personLabel ?birthDate ?wikipedia ?image WHERE {
  ?person wdt:P31 wd:Q5 ;
          wdt:P27 wd:Q142 ;
          wdt:P39 ?position .
  VALUES ?position {
    wd:Q3044918  # président de la République française
    wd:Q3270492  # Premier ministre français
    wd:Q3044997  # ministre français
    wd:Q3044915  # député français
    wd:Q15686806 # sénateur français
  }
  OPTIONAL { ?person wdt:P569 ?birthDate. }
  OPTIONAL { ?person wdt:P18 ?image. }
  OPTIONAL { ?wikipedia schema:about ?person ; schema:isPartOf <https://fr.wikipedia.org/>. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
}
LIMIT 500
```

- **Format** : JSON via `httpx`.
- **Fréquence** : hebdomadaire (lundi 04:00 UTC).
- **Rate limit** : 60 req/min, requêtes timeout 60s. Respecter via batching.
- **Plan B** : DBpedia ou scrape Wikipédia FR catégorie:Personnalité politique française.

### 3.7 INSEE BDM (Banque de Données Macroéconomiques)

- **Endpoint** : `https://api.insee.fr/series/BDM/V1/data/<dataset>/<series>`
- **Auth** : OAuth 2.0 client credentials (gratuit après inscription).
- **Datasets utiles** : chômage (CHOMAGE-T), inflation IPC, PIB, démographie, criminalité (depuis SSMSI), démographie d'entreprise.
- **Format** : SDMX-JSON.
- **Fréquence** : à la demande lors d'une vérification de claim numérique.
- **Rate limit** : 30 req/min en gratuit.
- **Cache local** : oui, table `data_api_cache` à prévoir, TTL 24h.
- **Plan B** : data.gouv.fr propose souvent les mêmes données en CSV.

### 3.8 Eurostat REST API

- **Endpoint** : `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<dataset>?<params>`
- **Format** : JSON-stat 2.0.
- **Datasets utiles** : chômage UE, dette publique, inflation, statistiques migration, énergie.
- **Fréquence** : à la demande.
- **Rate limit** : aucun documenté, courtoisie.
- **Plan B** : OCDE stats.

### 3.9 data.gouv.fr API

- **Endpoint** : `https://www.data.gouv.fr/api/2/datasets/`
- **Auth** : optionnelle (clé API gratuite pour augmenter les quotas).
- **Usage** : recherche de datasets ad hoc (criminalité par commune, chômage local, marché immobilier, etc.).
- **Fréquence** : à la demande.
- **Rate limit** : 1000 req/h en authentifié.

### 3.10 Fact-checkers (AFP Factuel, CheckNews, Les Décodeurs, Vrai ou Faux, Les Surligneurs)

Ces sources sont scrapées avec parcimonie (citation obligatoire, extraits courts, lien systématique vers l'article original) pour alimenter la cascade de vérification (étape 2).

#### AFP Factuel

- **URL** : `https://factuel.afp.com/list/all/all/all/all/<page>`
- **Champs extraits** : titre, claim cité (souvent en intro), verdict en image header (vrai, faux, trompeur), date, URL article.
- **Parser cible** : `selectolax`.
- **Fréquence** : journalière, ne fetch que les nouveaux articles depuis dernière exécution.
- **Volume estimé** : 3 à 8 articles par jour.
- **Plan B** : flux Twitter @AFPFactuel (P2).

#### CheckNews (Libération)

- **URL** : `https://www.liberation.fr/checknews/` (paywall sur certains, mais titre et lead toujours visibles).
- **Champs extraits** : titre (pose la question), lead (résumé verdict), URL article, date.
- **Plan B** : flux RSS Libération filtré par tag `checknews`.

#### Les Décodeurs (Le Monde)

- **URL** : `https://www.lemonde.fr/les-decodeurs/` et flux RSS dédié.
- **Champs extraits** : titre, lead, URL, date.
- **Note paywall** : titre et lead accessibles, corps souvent paywall. Pour l'usage cascade, le résumé du verdict suffit. Citation obligatoire avec lien.

#### Vrai ou Faux (France Info)

- **URL** : `https://www.francetvinfo.fr/vrai-ou-faux/` + flux RSS.
- **Format** : article avec verdict explicite dans l'intro.

#### Les Surligneurs

- **URL** : `https://www.lessurligneurs.eu/` (sous-titre `Le legal-checking de l'actualité`).
- **Spécificité** : focus juridique, utile pour vérifier les claims sur des règles de droit.
- **Licence** : CC BY-NC-SA, donc on peut citer plus largement.

### 3.11 Mécanique générale du scraping fact-checker

- Stocker `fact_check_url`, `verdict_label_source` (verbatim de la source : "Faux", "Trompeur", "Plutôt vrai", etc.), `summary` (lead 1-2 phrases), `published_at`.
- Mapper `verdict_label_source` vers notre vocabulaire (`true`, `mostly_true`, `mixed`, `mostly_false`, `false`, `misleading_context`, `unverifiable`).
- Lors d'une cascade de vérification interne, calculer un embedding du `summary` et chercher matchs > 0,85 cosine sur les claims internes.
- En cas de match, stocker comme `evidence` avec `weight = 0.85` et `kind = "fact_checker"`.

## 4. Sources P1 détaillées (post Phase 4, avant lancement)

### 4.1 YouTube politique (sélection)

- **Outil** : `yt-dlp` pour extraction audio + métadonnées, `OpenAI Whisper API` pour transcription.
- **Chaînes / playlists ciblées au démarrage** :
  - LCP "Ça vous regarde", "La séance"
  - Public Sénat (chaîne YouTube)
  - France Info "Les 4 vérités"
  - France Inter "Le 7/9.30"
  - Europe 1 matin
  - RTL Matin
  - BFM TV "Apolline Matin"
- **Fréquence** : 1 cron hebdomadaire (lundi 05:00 UTC) qui ingère la semaine écoulée.
- **Volume estimé MVP** : ~10h de transcription/sem soit ~15 $/mo Whisper.
- **Légalité** : usage public et académique d'extraits courts pour vérification accepté en France (exception courte citation, art. L122-5 CPI, sous réserve de contexte). Citation systématique avec lien YouTube + timecode.
- **Diarization** : reportée en P1 phase 2, via Replicate `whisperx-diarize` pour plateaux multi-invités. Au démarrage, ne traiter que les interviews 1-on-1.

### 4.2 Cour des comptes

- **URL** : `https://www.ccomptes.fr/fr/publications`
- **Type ingéré** : rapports thématiques et référés (PDF). Utiles pour vérifier promesses budgétaires.
- **Parser** : `pypdf` pour extraction texte, indexation full-text.
- **Fréquence** : mensuelle.

### 4.3 Banque de France, SSMSI, DREES, DEPP, OFDT

Sources de données structurées thématiques utilisées pour vérification. Endpoint généralement bulk Excel ou API. Cache local avec TTL 24h. Mention en évidence des verdicts qui s'appuient dessus.

### 4.4 Parlement européen

- **URL** : `https://www.europarl.europa.eu/plenary/fr/home.html` et `https://data.europarl.europa.eu`.
- **Usage** : verbatim débats, votes, questions parlementaires des eurodéputés français.
- **Fréquence** : hebdomadaire.
- **Plan B** : Politico Europe ou EurActiv comme couverture éditoriale.

## 5. Sources P2 (post-MVP, sous condition)

### 5.1 X / Twitter API v2 Basic

- 200 $/mo, 10k tweets/mo en lecture, 50k posts/mo. Suffisant pour comptes officiels top 50.
- Ingestion : timeline + replies des comptes officiels uniquement, pas de scraping mass.
- Cas d'usage : capter les claims de campagne et réactions à l'actualité.
- Décision MVP : non. À reévaluer après lancement et si budget validé.

### 5.2 AFP fil dépêches

- Licence pro plusieurs k€/an. Trop coûteux MVP. AFP Factuel scrapé reste accessible.

### 5.3 Presse complète

- Flux Reuters, AP, Le Figaro, etc. via RSS et scraping. À traiter dans le module presse post-MVP.

### 5.4 TikTok et Instagram

- Difficiles légalement et techniquement. Usage potentiel : capter les déclarations vidéos non reprises ailleurs. Reporté en P2.

## 6. Considérations légales et éthiques

### 6.1 robots.txt

Tous les scrapers respectent `robots.txt`. Politique : si un site désautorise notre `User-Agent`, on ne scrape pas, point. Sites attendus comme autorisant le scraping public : assemblee-nationale.fr, senat.fr, elysee.fr, info.gouv.fr, sites publics ouverts.

### 6.2 User-Agent

Tous les scrapers envoient :

```
User-Agent: politikar/0.1 (+https://politikar.fr/about; contact@politikar.fr)
```

Identifiant clair pour permettre aux administrateurs de sites de nous contacter.

### 6.3 Rate limit défensif

- Par défaut : 1 req/2s par hostname.
- Backoff exponentiel sur 429 ou 503, max 5 retries.
- Cache local 24h pour les listings (page d'index) afin d'éviter les hits répétés.

### 6.4 Citation systématique

Chaque verdict publié cite ses sources avec :
- URL de la source
- Date d'accès
- Auteur ou institution
- Quote (extrait) avec longueur < 250 caractères pour les sources presse, en respect de l'exception de courte citation.

### 6.5 Droit d'auteur

- Les textes officiels (Assemblée, Sénat, gouvernement) sont sous licence Etalab 2.0 : libre réutilisation avec mention.
- Les fact-checkers (AFP Factuel, CheckNews, Décodeurs) sont sous droit d'auteur classique. On stocke le résumé en interne et on cite, on ne republie pas en intégralité.
- Les transcripts YouTube : courte citation acceptable, lien vers la vidéo source obligatoire.

### 6.6 RGPD

- Politiciens = personnes publiques dans l'exercice de leurs fonctions, traitement légitime.
- On limite aux propos publics (jamais de scraping de comptes privés).
- Mineurs (enfants de politiques) : explicitement exclus.
- Vie privée hors fonction publique : explicitement exclue (santé personnelle, vie amoureuse, etc.).
- Droit d'accès et rectification : procédure formelle dans `RISKS.md` section juridique.

### 6.7 Politique de désindexation et droit à l'oubli

- Pour propos antérieurs à 10 ans : conservés mais peuvent être marqués `archived` et n'entrent plus dans le calcul du score courant.
- Pour mineurs au moment du propos (qui sont devenus politiciens depuis) : suppression sur demande.
- Procédure publique documentée sur la page À propos.

## 7. Plan d'intégration par phase

| Source | Phase d'intégration |
|---|---|
| Wikidata SPARQL | Phase 1 (seeding) |
| NosDéputés / NosSénateurs | Phase 1 (seeding) + Phase 2 (ingestion continue) |
| Assemblée nationale open data | Phase 2 |
| Sénat open data | Phase 2 |
| Élysée + Matignon | Phase 2 |
| Fact-checkers (5 sources) | Phase 4 |
| INSEE BDM | Phase 4 |
| Eurostat | Phase 4 |
| data.gouv.fr | Phase 4 |
| YouTube + Whisper | Phase 2 (1 émission test) puis Phase 6+ |
| Cour des comptes | Phase 7 (suivi promesses) |
| Banque de France, SSMSI, DREES, DEPP | Phase 4+ selon claims rencontrés |
| Parlement européen | Phase 7 |
| X / Twitter | post-MVP P2 |

## 8. Surveillance et alerting des sources

- Chaque connecteur a un health check : nombre de items ingérés sur la dernière fenêtre attendue. Si 0 sur 3 runs consécutifs, alerte Sentry.
- Tableau de bord interne `admin/sources` qui montre dernier ingest réussi, items ingérés, latence, taux d'erreur.
- Plan B systématique documenté ci-dessus.

## 9. Questions ouvertes pour relecture

1. **Périmètre fact-checkers** : faut-il en ajouter (Conspiracy Watch, Hoaxbuster, Fact Check EU) ? Position : non au MVP, on reste sur les 5 majeurs francophones.
2. **Émissions YouTube initiales** : valider la liste et la priorisation. Risque copyright à surveiller.
3. **Wikidata vs scrape Wikipédia** : Wikidata propose un référentiel structuré mais peut être incomplet pour des figures locales. Wikipédia FR a plus de contenu mais moins structuré. Position : Wikidata d'abord, Wikipédia en complément Phase 1.
4. **Sources européennes** : pour rester multi-pays compatible, faut-il prévoir dès le MVP des sources UE-wide (ParlEur, EuObserver) ? Position : non, MVP France only.
