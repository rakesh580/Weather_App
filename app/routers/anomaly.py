from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Request

from app.http import UpstreamError, upstream_http_error
from app.rate_limit import limiter
from app.services import open_meteo, owm

router = APIRouter(prefix="/api", tags=["intelligence"])


def classify(abs_z: float) -> str:
    if abs_z < 0.5:
        return "Normal"
    if abs_z < 1.0:
        return "Slightly Unusual"
    if abs_z < 2.0:
        return "Unusual"
    if abs_z < 3.0:
        return "Rare"
    return "Extremely Rare"


@router.get("/anomaly")
@limiter.limit("20/minute")
async def weather_anomaly(
    request: Request, lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)
) -> dict:
    """Compare today's conditions with the 30-year climatology for this date and place."""
    now = datetime.now(tz=UTC)
    try:
        historical = await open_meteo.climatology(lat, lon, now.month, now.day)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    if not historical:
        raise HTTPException(status_code=404, detail="Insufficient historical data for this location")
    try:
        wx = await owm.current(lat, lon)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc

    current_temp = wx["main"]["temp"]
    current_high = wx["main"].get("temp_max", current_temp)
    current_low = wx["main"].get("temp_min", current_temp)
    z_high = (current_high - historical["mean_high"]) / max(historical["std_high"], 0.1)
    diff = round(current_high - historical["mean_high"], 1)
    all_highs = historical.get("all_highs", [])
    percentile = round(sum(1 for h in all_highs if h < current_high) / len(all_highs) * 100, 1) if all_highs else None

    decades = sorted(historical.get("decade_avgs", {}).items())
    warming_rate = None
    if len(decades) >= 2:
        warming_rate = round((decades[-1][1] - decades[0][1]) / (len(decades) - 1), 1)

    return {
        "location": wx.get("name", "Unknown"),
        "date": now.strftime("%Y-%m-%d"),
        "current": {
            "temp": round(current_temp, 1),
            "temp_high": round(current_high, 1),
            "temp_low": round(current_low, 1),
        },
        "historical_avg": {"temp_high": historical["mean_high"], "temp_low": historical["mean_low"]},
        "historical_std": {"temp_high": historical["std_high"], "temp_low": historical["std_low"]},
        "anomaly": {
            "z_score": round(z_high, 2),
            "classification": classify(abs(z_high)),
            "percentile": percentile,
            "degrees_diff": diff,
            "direction": "warmer" if diff > 0 else "cooler",
        },
        "historical_range": {"record_high": historical["record_high"], "record_low": historical["record_low"]},
        "trend": {"decade_avgs": historical.get("decade_avgs", {}), "warming_rate_per_decade": warming_rate},
        "sample_years": 30,
    }
