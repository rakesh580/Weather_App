from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Query

from app.http import UpstreamError, upstream_http_error
from app.services import owm

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/pressure-trend")
async def pressure_trend(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict:
    """48-hour barometric pressure forecast with 3/6/12h deltas (migraine / joint-pain correlation)."""
    try:
        entries = (await owm.forecast(lat, lon)).get("list", [])
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    now_ts = datetime.now(tz=UTC).timestamp()
    hours, pressures = [], []
    for e in entries:
        hrs = (e["dt"] - now_ts) / 3600
        if hrs > 48:
            break
        p = e.get("main", {}).get("pressure")
        if p is not None:
            hours.append(round(hrs, 1))
            pressures.append(p)

    def delta_at(target: float) -> float:
        if not pressures:
            return 0
        for h, p in zip(hours, pressures, strict=True):
            if h >= target:
                return round(p - pressures[0], 1)
        return round(pressures[-1] - pressures[0], 1)

    d6 = delta_at(6)
    return {
        "hours": hours,
        "pressures": pressures,
        "delta_3h": delta_at(3),
        "delta_6h": d6,
        "delta_12h": delta_at(12),
        "rapid_change": abs(d6) > 5,
    }
