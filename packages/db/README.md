# packages/db

Migrations Postgres pour politikar. Cible : Supabase Pro (Postgres 15 +
pgvector >= 0.7).

## Appliquer les migrations

### Option A : Supabase CLI

```bash
# Une seule fois
supabase login
supabase link --project-ref <votre-ref>

# À chaque évolution
supabase db push
```

Les migrations sont auto-détectées dans `packages/db/migrations/` une
fois le projet linké. Le format de nom (`NNN_description.sql`) est compatible.

### Option B : `psql` direct

```bash
export DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

for f in packages/db/migrations/*.sql; do
  echo "applying $f"
  psql "$DATABASE_URL" -f "$f"
done
```

Toutes les migrations sont idempotentes (`if not exists` partout).

## Liste

| # | Fichier | Contenu |
|---|---|---|
| 001 | `001_init.sql` | Extensions, fonctions utilitaires, tables référentiel (regions, parties, functions, politicians, mandates) |
| 002 | `002_sources_claims.sql` | sources, claims, verifications, claim_review_queue, press_coverage |
| 003 | `003_transverse.sql` | prompt_versions, audit_log, politician_truth_scores |
| 004 | `004_aggregations.sql` | Vues matérialisées (politician/party/function/region stats) + `refresh_all_stats()` |
| 005 | `005_public_views.sql` | Vues `_public_*` pour lecture anon |
| 006 | `006_rls.sql` | RLS sur toutes les tables, policies service_role + admin |
| 007 | `007_seed_meta.sql` | Seed minimal des fonctions FR |

## Rafraîchir les agrégats

Une fois des claims+verifications publiés, lancer périodiquement :

```sql
select refresh_all_stats();
```

Côté workers Python : appel programmé via Inngest cron horaire.

## Vérifier le schéma

```bash
psql "$DATABASE_URL" -c "\dt public.*"
psql "$DATABASE_URL" -c "\dv _public_*"
```
