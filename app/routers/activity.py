from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.http import UpstreamError, upstream_http_error
from app.rate_limit import limiter
from app.services import owm
from app.services.scoring import ACTIVITY_PROFILES, score_window

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("/types")
def activity_types() -> list[dict]:
    return [
        {"id": k, "name": v["name"], "icon": v["icon"], "description": v["description"]}
        for k, v in ACTIVITY_PROFILES.items()
    ]


def _group(windows: list[dict]) -> list[dict]:
    golden, current = [], []

    def flush() -> None:
        if current:
            golden.append(
                {
                    "start": current[0]["start"],
                    "end": current[-1]["start"],
                    "avg_score": round(sum(g["score"] for g in current) / len(current), 1),
                    "conditions": current[0]["description"],
                    "windows": list(current),
                }
            )
            current.clear()

    for w in windows:
        if w["score"] >= 70:
            current.append(w)
        else:
            flush()
    flush()
    golden.sort(key=lambda g: g["avg_score"], reverse=True)
    return golden


@router.get("/optimize")
@limiter.limit("30/minute")
async def optimize(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    activity: str = Query(..., min_length=1, max_length=50),
    duration_hours: float = Query(default=1, ge=0.5, le=8),
) -> dict:
    """Score every 3-hour forecast window for an activity and surface the best 'golden' windows."""
    if activity not in ACTIVITY_PROFILES:
        raise HTTPException(status_code=400, detail=f"Unknown activity. Choose from: {list(ACTIVITY_PROFILES)}")
    profile = ACTIVITY_PROFILES[activity]
    try:
        entries = (await owm.forecast(lat, lon)).get("list", [])
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    if not entries:
        raise HTTPException(status_code=502, detail="No forecast data available")

    windows = []
    for e in entries:
        temp, humidity, wind, pop = e["main"]["temp"], e["main"]["humidity"], e["wind"]["speed"], e.get("pop", 0)
        windows.append(
            {
                "start": e.get("dt_txt", ""),
                "dt": e["dt"],
                "end": "",
                "score": score_window(temp, wind, pop, humidity, profile),
                "temp": round(temp, 1),
                "wind": round(wind, 1),
                "pop": round(pop, 2),
                "humidity": humidity,
                "description": e["weather"][0]["description"],
                "weather_icon": e["weather"][0].get("icon", "01d"),
            }
        )
    golden = _group(windows)
    best = [w for w in windows if w["score"] >= 70]
    avoid = [w for w in windows if w["score"] < 40]
    name = profile["name"].lower()
    if golden:
        top = golden[0]
        summary = f"Best time for {name}: {top['start']} with {top['conditions']}. Score: {top['avg_score']}/100."
    elif best:
        summary = f"A few decent windows available for {name}, but conditions aren't ideal."
    else:
        summary = f"No great windows for {name} in the next 5 days. Consider indoor alternatives."
    return {
        "activity": {
            "id": activity,
            "name": profile["name"],
            "icon": profile["icon"],
            "description": profile["description"],
        },
        "best_windows": golden[:5],
        "all_windows": windows,
        "avoid_windows": avoid[:5],
        "ai_summary": summary,
    }
