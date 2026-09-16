"""US National Weather Service alerts (api.weather.gov) — free, keyless, US coverage only."""

from __future__ import annotations

from app.cache import AsyncTTLCache
from app.config import get_settings
from app.http import UpstreamError, get_json

PROVIDER = "NWS"
_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=2000, ttl=get_settings().alerts_cache_ttl)

SEVERITY_ORDER = {"Extreme": 0, "Severe": 1, "Moderate": 2, "Minor": 3, "Unknown": 4}


def _in_us_bbox(lat: float, lon: float) -> bool:
    # CONUS + Alaska + Hawaii + PR, generous bounds. Everything else short-circuits to "no alerts".
    return (24 <= lat <= 72 and -180 <= lon <= -66) or (17 <= lat <= 19 and -68 <= lon <= -64)


async def alerts(lat: float, lon: float) -> dict:
    if not _in_us_bbox(lat, lon):
        return {"alerts": [], "coverage": "unsupported"}

    async def fetch() -> dict:
        try:
            data = await get_json(
                "https://api.weather.gov/alerts/active",
                provider=PROVIDER,
                params={"point": f"{round(lat, 4)},{round(lon, 4)}"},
                headers={"Accept": "application/geo+json"},
            )
        except UpstreamError:
            return {"alerts": [], "coverage": "unavailable"}
        items = []
        for feature in data.get("features", []):
            p = feature.get("properties", {})
            items.append(
                {
                    "id": p.get("id"),
                    "event": p.get("event"),
                    "headline": p.get("headline"),
                    "severity": p.get("severity", "Unknown"),
                    "urgency": p.get("urgency"),
                    "certainty": p.get("certainty"),
                    "onset": p.get("onset"),
                    "ends": p.get("ends") or p.get("expires"),
                    "sender": p.get("senderName"),
                    "description": (p.get("description") or "")[:1500],
                    "instruction": (p.get("instruction") or "")[:800],
                    "areas": p.get("areaDesc"),
                }
            )
        items.sort(key=lambda a: SEVERITY_ORDER.get(a["severity"], 4))
        return {"alerts": items, "coverage": "us"}

    return await _cache.get_or_fetch((round(lat, 2), round(lon, 2)), fetch)
