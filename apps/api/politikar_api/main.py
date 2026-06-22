"""politikar FastAPI application.

Provides:
  - GET /health : liveness + dependency probes
  - GET /admin/me : echoes the JWT claims when admin auth is configured
  - POST /admin/extract : enqueue an ad-hoc extraction job (stub)

The full admin surface (claim review, source management, agg refresh) lands
in subsequent commits as the ingestion pipeline matures.
"""
from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, status
from loguru import logger
from pydantic import BaseModel

app = FastAPI(
    title="politikar API",
    description="Admin and ingestion API for politikar.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)


class Health(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=Health, tags=["meta"])
async def health() -> Health:
    return Health(status="ok", service="politikar-api", version="0.1.0")


# ---- admin auth (Supabase JWT) ----------------------------------------

def require_admin(request: Request) -> dict[str, Any]:
    """Stub : verifies a Supabase JWT carrying `app_role=admin` in claims.

    Implementation note : in production this will verify the signature
    against `SUPABASE_JWT_SECRET` (HS256) or the project's JWKS for RS256.
    Until the Supabase project is provisioned we accept a static bearer
    token from `POLITIKAR_ADMIN_TOKEN` for local development only.
    """
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    token = auth.split(" ", 1)[1].strip()
    expected = os.environ.get("POLITIKAR_ADMIN_TOKEN")
    if expected and token == expected:
        return {"app_role": "admin", "source": "static_token"}
    # TODO : verify Supabase JWT here.
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


@app.get("/admin/me", tags=["admin"])
async def admin_me(claims: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return claims


class ExtractRequest(BaseModel):
    politician_full_name: str
    politician_function: str
    politician_party: str
    occurred_at: str
    channel: str
    source_type: str
    text: str


@app.post("/admin/extract", tags=["admin"])
async def admin_extract(
    body: ExtractRequest,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Run claim extraction synchronously and return the structured output.

    For high-volume extraction the orchestration moves to Inngest workers
    (see `apps/workers/`). This endpoint is intended for ad-hoc admin use.
    """
    try:
        from politikar_workers.extraction import ExtractionInput, extract_claims
    except ImportError as err:
        logger.exception("workers package not installed")
        raise HTTPException(
            status_code=503, detail="workers package not installed"
        ) from err
    inp = ExtractionInput(**body.model_dump())
    return extract_claims(inp)
