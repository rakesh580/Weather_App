"""AI endpoints: chat (JSON + SSE streaming) and the daily briefing."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.cache import AsyncTTLCache
from app.http import UpstreamError
from app.rate_limit import limiter
from app.routers.weather import ZONE_TO_CITY, shape_current
from app.schemas.requests import ChatRequest
from app.security import require_api_key
from app.services import ai, nws, open_meteo, owm

logger = logging.getLogger("skypulse.chat")
router = APIRouter(prefix="/api", tags=["ai"])
_briefing_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=500, ttl=1800)


async def weather_context(req: ChatRequest) -> dict | None:
    """Live conditions for the city the user is looking at (lat/lon), else a legacy timezone city."""
    lat, lon, label = req.lat, req.lon, req.city
    if lat is None or lon is None:
        zone = ZONE_TO_CITY.get(req.timezone or "")
        if not zone:
            return None
        lat, lon, label = zone["lat"], zone["lon"], zone["city"]
    try:
        cur = shape_current(await owm.current(lat, lon), lat, lon, label or "")
    except UpstreamError:
        return None
    return {
        "city": cur["city"],
        "country": cur["country"],
        "temperature_f": cur["temperature"],
        "feels_like_f": cur["feels_like"],
        "conditions": cur["weather"],
        "humidity_pct": cur["humidity"],
        "wind_mph": cur["wind_speed"],
        "observed_utc": datetime.fromtimestamp(cur["dt"] or 0, tz=UTC).isoformat(),
    }


@router.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request, chat_req: ChatRequest, _auth: None = Depends(require_api_key)) -> dict:
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI Chat is not configured on this server.")
    ctx = await weather_context(chat_req)
    prompt = ai.build_user_message(chat_req.message, ctx, chat_req.journey_context)
    try:
        answer = await ai.complete(prompt)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="AI response timed out. Please try again.") from exc
    except Exception as exc:
        logger.exception("Chat completion failed")
        raise HTTPException(
            status_code=502, detail="AI Chat is temporarily unavailable. Please try again later."
        ) from exc
    return {
        "response": answer,
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "context_city": ctx["city"] if ctx else None,
    }


@router.post("/chat/stream")
@limiter.limit("10/minute")
async def chat_stream(
    request: Request, chat_req: ChatRequest, _auth: None = Depends(require_api_key)
) -> StreamingResponse:
    """Server-Sent Events: `data: {"delta": "..."}` chunks, then `data: {"done": true}`."""
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI Chat is not configured on this server.")
    ctx = await weather_context(chat_req)
    prompt = ai.build_user_message(chat_req.message, ctx, chat_req.journey_context)

    async def events():
        yield f"data: {json.dumps({'context_city': ctx['city'] if ctx else None})}\n\n"
        try:
            async for delta in ai.stream(prompt):
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception:
            logger.exception("Chat stream failed")
            yield f"data: {json.dumps({'error': 'AI Chat is temporarily unavailable.'})}\n\n"
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(
        events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/briefing")
@limiter.limit("10/minute")
async def briefing(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str = Query(default="", max_length=120),
    _auth: None = Depends(require_api_key),
) -> dict:
    """AI-written daily briefing from current conditions, the next 24h and any active alerts. Cached 30 min."""
    if not ai.available():
        raise HTTPException(status_code=503, detail="AI briefing is not configured on this server.")

    async def build() -> dict:
        try:
            current_raw, hourly, alerts = await asyncio.gather(
                owm.current(lat, lon), open_meteo.hourly(lat, lon, 24), nws.alerts(lat, lon)
            )
        except UpstreamError as exc:
            raise HTTPException(status_code=502, detail=f"{exc.provider} is unavailable") from exc
        cur = shape_current(current_raw, lat, lon, name)
        rows = hourly["hourly"]
        data = {
            "city": cur["city"],
            "now": {
                "temp_f": cur["temperature"],
                "feels_like_f": cur["feels_like"],
                "conditions": cur["weather"],
                "wind_mph": cur["wind_speed"],
                "humidity": cur["humidity"],
            },
            "next_24h": {
                "high_f": max((r["temperature"] for r in rows if r["temperature"] is not None), default=None),
                "low_f": min((r["temperature"] for r in rows if r["temperature"] is not None), default=None),
                "max_rain_chance": max((r["pop"] for r in rows), default=0),
                "max_wind_gust_mph": max((r["wind_gust"] or 0 for r in rows), default=0),
                "max_uv": max((r["uvi"] or 0 for r in rows), default=0),
            },
            "alerts": [a["event"] for a in alerts.get("alerts", [])][:3],
        }
        try:
            text = await ai.complete(f"[DATA]: {json.dumps(data)}", system=ai.BRIEFING_PROMPT, max_tokens=220)
        except Exception as exc:
            logger.exception("Briefing failed")
            raise HTTPException(status_code=502, detail="AI briefing is temporarily unavailable.") from exc
        return {"briefing": text, "city": cur["city"], "generated_at": datetime.now(tz=UTC).isoformat()}

    return await _briefing_cache.get_or_fetch((round(lat, 2), round(lon, 2)), build)
