from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request

from app import __version__
from app.config import get_settings
from app.rate_limit import limiter
from app.services import ai, owm

router = APIRouter(tags=["system"])
_started = datetime.now(tz=UTC)


@router.get("/api/health")
def health() -> dict:
    """Liveness/readiness probe with non-secret config flags and cache stats."""
    s = get_settings()
    provider = ai.resolve_provider()
    return {
        "status": "ok",
        "version": __version__,
        "uptime_seconds": int((datetime.now(tz=UTC) - _started).total_seconds()),
        "providers": {
            "openweathermap": bool(s.openweather_api_key),
            "openrouteservice": bool(s.ors_api_key),
            "ai": provider.name if provider else None,
        },
        "cache": owm.cache_stats(),
    }


@router.get("/api/chat/health")
@limiter.limit("5/minute")
async def chat_health(request: Request) -> dict:
    return await ai.health()
