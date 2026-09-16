from __future__ import annotations

import asyncio
import itertools
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request

from app.config import get_settings
from app.rate_limit import limiter
from app.schemas.requests import JourneyRequest, parse_iso
from app.services import ors, owm
from app.services.geo import (
    METERS_PER_MILE,
    MILES_PER_KM,
    SEVERITY_RANK,
    bearing_deg,
    classify_weather,
    find_closest_forecast,
    haversine_km,
    interpolate_line,
    sample_waypoints,
    sunrise_sunset,
)

router = APIRouter(prefix="/api", tags=["journey"])
NO_DATA = {
    "temperature": 0,
    "humidity": 0,
    "wind_speed": 0,
    "description": "no data",
    "weather_id": 800,
    "weather_icon": "01d",
    "feels_like": None,
    "pressure": None,
    "clouds_pct": 0,
    "visibility": None,
    "pop": 0,
    "wind_deg": None,
    "rain_3h": 0,
    "snow_3h": 0,
}


@router.post("/journey")
@limiter.limit("15/minute")
async def plan_journey(request: Request, req: JourneyRequest) -> dict:
    """Time-shifted weather along a driving route: forecast at each waypoint for its estimated arrival."""
    if not get_settings().openweather_api_key:
        raise HTTPException(status_code=503, detail="OpenWeatherMap API key not configured")
    departure_ts = parse_iso(req.departure_time).timestamp()

    route = await ors.driving_route(req.origin_lat, req.origin_lon, req.dest_lat, req.dest_lon)
    used_ors = route is not None
    if route:
        coords, elevations = route["coords"], route["elevations"]
        distance_m, duration_s = route["distance_m"], route["duration_s"]
    else:
        distance_m = haversine_km(req.origin_lat, req.origin_lon, req.dest_lat, req.dest_lon) * 1000
        speed = req.avg_speed_mph or 60.0
        duration_s = (distance_m / METERS_PER_MILE) / speed * 3600
        coords, elevations = interpolate_line(req.origin_lat, req.origin_lon, req.dest_lat, req.dest_lon), {}

    wp_coords = sample_waypoints(coords, 128) if used_ors and len(coords) > 2 else coords

    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine_km(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]))
    total_route_km = cum[-1]

    def cum_dist(wp: list[float]) -> float:
        best_j = min(range(len(coords)), key=lambda j: haversine_km(wp[0], wp[1], coords[j][0], coords[j][1]))
        return cum[best_j]

    forecasts = await asyncio.gather(*(owm.forecast_list(wp[0], wp[1]) for wp in wp_coords))
    last = len(wp_coords) - 1
    names = await asyncio.gather(
        *(
            asyncio.sleep(0, result=req.origin_name)
            if i == 0 and req.origin_name
            else asyncio.sleep(0, result=req.dest_name)
            if i == last and req.dest_name
            else owm.reverse_geocode(wp[0], wp[1])
            for i, wp in enumerate(wp_coords)
        )
    )

    waypoints = []
    for i, wp in enumerate(wp_coords):
        wp_km = cum_dist(wp)
        frac = wp_km / total_route_km if total_route_km > 0 else i / max(1, last)
        arrival_ts = departure_ts + frac * duration_s
        arrival_dt = datetime.fromtimestamp(arrival_ts, tz=UTC)
        entry, _reliable = find_closest_forecast(forecasts[i], int(arrival_ts))
        if entry:
            wx = entry["weather"][0]
            weather = {
                "temperature": entry["main"]["temp"],
                "humidity": entry["main"]["humidity"],
                "wind_speed": entry["wind"]["speed"],
                "description": wx["description"],
                "weather_id": wx["id"],
                "weather_icon": wx.get("icon", "01d"),
                "feels_like": entry["main"].get("feels_like"),
                "pressure": entry["main"].get("pressure"),
                "clouds_pct": entry.get("clouds", {}).get("all", 0),
                "visibility": entry.get("visibility"),
                "pop": entry.get("pop", 0),
                "wind_deg": entry.get("wind", {}).get("deg"),
                "rain_3h": entry.get("rain", {}).get("3h", 0),
                "snow_3h": entry.get("snow", {}).get("3h", 0),
            }
            severity, color = classify_weather(wx["id"])
        else:
            weather, (severity, color) = dict(NO_DATA), ("unknown", "#9ca3af")
        if i < last:
            bearing = bearing_deg(wp[0], wp[1], wp_coords[i + 1][0], wp_coords[i + 1][1])
        elif i > 0:
            bearing = bearing_deg(wp_coords[i - 1][0], wp_coords[i - 1][1], wp[0], wp[1])
        else:
            bearing = 0.0
        sunrise, sunset = sunrise_sunset(wp[0], wp[1], arrival_dt.date())
        elevation_ft = elevations.get((round(wp[0], 5), round(wp[1], 5)))
        waypoints.append(
            {
                "lat": wp[0],
                "lon": wp[1],
                "name": names[i],
                "distance_from_origin_miles": round(wp_km * MILES_PER_KM, 1),
                "estimated_arrival": arrival_dt.isoformat(),
                "weather": weather,
                "severity": severity,
                "color": color,
                "route_bearing": round(bearing, 1),
                "sunrise": sunrise,
                "sunset": sunset,
                "elevation_ft": round(elevation_ft) if elevation_ft is not None else None,
            }
        )

    segments = []
    for a, b in itertools.pairwise(waypoints):
        worst = a if SEVERITY_RANK.get(a["severity"], 0) >= SEVERITY_RANK.get(b["severity"], 0) else b
        segments.append(
            {
                "coords": [[a["lat"], a["lon"]], [b["lat"], b["lon"]]],
                "color": worst["color"],
                "severity": worst["severity"],
            }
        )

    return {
        "route_coords": coords,
        "total_distance_miles": round(distance_m / METERS_PER_MILE, 1),
        "total_duration_hours": round(duration_s / 3600, 1),
        "waypoints": waypoints,
        "segments": segments,
        "used_real_route": used_ors,
    }
