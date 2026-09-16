from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Request

from app.http import UpstreamError, upstream_http_error
from app.rate_limit import limiter
from app.services import open_meteo, overpass, owm
from app.services.geo import FEET_PER_METER

router = APIRouter(prefix="/api", tags=["intelligence"])


@router.get("/microclimate")
@limiter.limit("20/minute")
async def microclimate(
    request: Request, lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)
) -> dict:
    """Estimate local temperature corrections: elevation lapse rate, urban heat island, water, slope aspect."""
    try:
        wx = await owm.current(lat, lon)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    station_temp = wx["main"]["temp"]
    station_lat = wx.get("coord", {}).get("lat", lat)
    station_lon = wx.get("coord", {}).get("lon", lon)
    is_night = wx["weather"][0].get("icon", "01d").endswith("n")

    delta = 0.001  # ~111 m
    loc_elev, station_elev, elev_n, elev_s, land = await asyncio.gather(
        open_meteo.elevation_m(lat, lon),
        open_meteo.elevation_m(station_lat, station_lon),
        open_meteo.elevation_m(lat + delta, lon),
        open_meteo.elevation_m(lat - delta, lon),
        overpass.land_use(lat, lon),
    )

    corrections: dict[str, dict] = {}
    elev_diff_ft = (loc_elev - station_elev) * FEET_PER_METER
    elev_corr = max(-15.0, min(15.0, -3.5 * (elev_diff_ft / 1000)))
    corrections["elevation"] = {
        "correction_f": round(elev_corr, 1),
        "details": f"{round(elev_diff_ft)}ft {'above' if elev_diff_ft > 0 else 'below'} station",
    }

    built = land["built_up_fraction"]
    uhi = min(8.0, built * 8 * (1.5 if is_night else 0.7)) if built > 0.1 else 0.0
    corrections["urban_heat"] = {"correction_f": round(uhi, 1), "details": f"{round(built * 100)}% built-up area"}

    water = 0.0
    if land["water_nearby"]:
        proximity = max(0.0, 1 - land["water_distance_km"] / 2.0)
        warm = datetime.now(tz=UTC).month in (5, 6, 7, 8, 9)
        water = max(-5.0, min(5.0, (-3 * proximity if warm else 2 * proximity) * 1.3))
    corrections["water_proximity"] = {
        "correction_f": round(water, 1),
        "details": f"Water within {round(land['water_distance_km'], 1)}km"
        if land["water_nearby"]
        else "Water not nearby",
    }

    aspect = 0.0
    ns_slope = elev_s - elev_n  # positive = south-facing
    if not is_night:
        if ns_slope > 5:
            aspect = min(3.0, ns_slope / 10)
        elif ns_slope < -5:
            aspect = max(-2.0, ns_slope / 10)
    corrections["terrain_aspect"] = {"correction_f": round(aspect, 1), "details": "Slope orientation analysis"}

    total = max(-15.0, min(15.0, elev_corr + uhi + water + aspect))
    confidence = "high" if abs(total) < 2 else "medium" if abs(total) < 6 else "low"
    explanation = (
        f"Station reports {round(station_temp)}°F. Your location is estimated ~{abs(round(total))}°F "
        f"{'cooler' if total < 0 else 'warmer'} due to local terrain and environment."
        if abs(total) >= 1
        else "Your location closely matches the nearest weather station."
    )
    return {
        "station_temp": round(station_temp, 1),
        "estimated_temp": round(station_temp + total, 1),
        "total_correction": round(total, 1),
        "corrections": corrections,
        "confidence": confidence,
        "explanation": explanation,
        "station_elevation_ft": round(station_elev * FEET_PER_METER),
        "location_elevation_ft": round(loc_elev * FEET_PER_METER),
    }
