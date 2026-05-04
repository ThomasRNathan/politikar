# apps/api

FastAPI admin et ingestion. Sert :

- `GET /health` : sonde de vivacité
- `GET /admin/me` : retourne les claims JWT (auth admin requise)
- `POST /admin/extract` : extraction de claims ad hoc (auth admin requise)

Python ≥ 3.11. Géré via uv.

## Lancer en local

```bash
# Une fois
uv sync --all-extras

# À chaque session
export POLITIKAR_ADMIN_TOKEN=dev-token-please-change
uv run uvicorn politikar_api.main:app --reload --port 8000
```

OpenAPI : http://localhost:8000/docs

## Auth admin

Au MVP, deux modes :

1. **Token statique** (dev) : header `Authorization: Bearer $POLITIKAR_ADMIN_TOKEN`.
2. **Supabase JWT** (prod) : à câbler une fois Supabase provisionné. Le
   middleware vérifie la signature HS256 contre `SUPABASE_JWT_SECRET` et
   exige `app_role=admin` dans les claims.

## Production

- Hébergement cible : Railway (always-on, simple).
- Health check : `/health`.
- Logs structurés via `loguru`.
- Sentry : à brancher via `sentry-sdk[fastapi]` après création du projet
  Sentry.

## Status

Le scaffolding est minimal : un endpoint d'extraction et la structure
auth. Au fur et à mesure que les pipelines mûrissent, on ajoute :

- gestion des claims en attente de revue
- déclencheurs manuels d'ingestion
- dashboards admin (latence des connecteurs, coût Anthropic, etc.)
