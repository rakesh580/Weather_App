from __future__ import annotations

import asyncio
import itertools
from datetime import UTC, datetime

from fastapi import APIRouter, Request

from app.rate_limit import limiter
from app.schemas.requests import LogisticsRequest, parse_iso
from app.services import owm
from app.services.geo import MILES_PER_KM, find_closest_forecast, haversine_km
from app.services.scoring import penalty_label, weather_penalty

router = APIRouter(prefix="/api/logistics", tags=["logistics"])
AVG_SPEED_MPH = 40.0


@router.post("/optimize")
@limiter.limit("10/minute")
async def optimize(request: Request, req: LogisticsRequest) -> dict:
    """Brute-force the stop order (n ≤ 8) that minimises weather exposure, ties broken by distance."""
    departure_ts = parse_iso(req.start_time).timestamp()
    stops = req.stops
    n = len(stops)
    forecasts = await asyncio.gather(*(owm.forecast_list(s.lat, s.lon) for s in stops))
    dist = [
        [haversine_km(a.lat, a.lon, b.lat, b.lon) * MILES_PER_KM if i != j else 0.0 for j, b in enumerate(stops)]
        for i, a in enumerate(stops)
    ]

    def evaluate(order: list[int]) -> tuple[float, float, list[dict]]:
        total_penalty = total_dist = 0.0
        ts = departure_ts
        details = []
        for idx, i in enumerate(order):
            s = stops[i]
            if idx > 0:
                miles = dist[order[idx - 1]][i]
                ts += miles / AVG_SPEED_MPH * 3600
                total_dist += miles
            entry, _ = find_closest_forecast(forecasts[i], int(ts))
            if entry:
                temp, desc = entry["main"]["temp"], entry["weather"][0]["description"]
                wid, wind, pop = entry["weather"][0]["id"], entry["wind"]["speed"], entry.get("pop", 0)
                penalty = weather_penalty(wid, pop, wind, temp)
            else:
                temp, desc, wid, wind, pop, penalty = 70, "unknown", 800, 0, 0, 0
            total_penalty += penalty
            depart_ts = ts + s.duration_minutes * 60
            details.append(
                {
                    "index": i,
                    "name": s.name,
                    "lat": s.lat,
                    "lon": s.lon,
                    "arrival": datetime.fromtimestamp(ts, tz=UTC).isoformat(),
                    "departure": datetime.fromtimestamp(depart_ts, tz=UTC).isoformat(),
                    "weather": {
                        "temp": round(temp, 1),
                        "description": desc,
                        "weather_id": wid,
                        "wind_speed": round(wind, 1),
                        "pop": round(pop, 2),
                    },
                    "penalty": round(penalty, 1),
                    "score_label": penalty_label(penalty),
                }
            )
            ts = depart_ts
        return total_penalty, total_dist, details

    best = (float("inf"), 0.0, [], list(range(n)))
    for perm in itertools.permutations(range(n)):
        penalty, d, details = evaluate(list(perm))
        if penalty < best[0] or (penalty == best[0] and d < best[1]):
            best = (penalty, d, details, list(perm))
    best_penalty, best_dist, best_details, best_order = best
    naive_penalty, naive_dist, _ = evaluate(list(range(n)))
    improvement = round((1 - best_penalty / max(naive_penalty, 0.1)) * 100, 1) if naive_penalty > 0 else 0
    if improvement > 20:
        briefing = (
            f"Reordering your stops reduces weather exposure by {improvement}%. "
            "We avoid the worst conditions by visiting weather-sensitive stops at better times."
        )
    elif improvement > 0:
        briefing = (
            f"Minor improvement of {improvement}% by reordering. Conditions are fairly consistent across your stops."
        )
    else:
        briefing = "Your original order is already optimal for weather conditions."
    return {
        "optimized_order": best_order,
        "stops_detail": best_details,
        "comparison": {
            "naive_penalty": round(naive_penalty, 1),
            "optimized_penalty": round(best_penalty, 1),
            "improvement_pct": max(0, improvement),
            "naive_distance_miles": round(naive_dist, 1),
            "optimized_distance_miles": round(best_dist, 1),
        },
        "ai_briefing": briefing,
    }
