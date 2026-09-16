"""OpenRouteService (routing + fallback geocoding) and Nominatim geocoding."""

from __future__ import annotations

from app.cache import AsyncTTLCache
from app.config import get_settings
from app.http import UpstreamError, get_json

_geocode_cache: AsyncTTLCache[list] = AsyncTTLCache(maxsize=5000, ttl=get_settings().geocode_cache_ttl)


async def geocode_address(query: str, limit: int = 5) -> list[dict]:
    """Nominatim first (best for street addresses), ORS as fallback. Never raises."""

    async def fetch() -> list[dict]:
        try:
            results = await get_json(
                "https://nominatim.openstreetmap.org/search",
                provider="Nominatim",
                params={"q": query, "format": "json", "limit": limit, "addressdetails": 1},
            )
            if results:
                return [
                    {
                        "name": r.get("display_name", "Unknown"),
                        "lat": float(r["lat"]),
                        "lon": float(r["lon"]),
                        "country": r.get("address", {}).get("country_code", "").upper(),
                        "state": r.get("address", {}).get("state", ""),
                    }
                    for r in results
                ]
        except (UpstreamError, KeyError, ValueError):
            pass
        key = get_settings().ors_api_key
        if not key:
            return []
        try:
            data = await get_json(
                "https://api.openrouteservice.org/geocode/search",
                provider="ORS",
                params={"api_key": key, "text": query, "size": limit},
            )
            return [
                {
                    "name": f.get("properties", {}).get("label", "Unknown"),
                    "lat": f["geometry"]["coordinates"][1],
                    "lon": f["geometry"]["coordinates"][0],
                    "country": f.get("properties", {}).get("country", ""),
                    "state": f.get("properties", {}).get("region", ""),
                }
                for f in data.get("features", [])
            ]
        except (UpstreamError, KeyError, IndexError):
            return []

    return await _geocode_cache.get_or_fetch((query.strip().lower(), limit), fetch)


async def driving_route(o_lat: float, o_lon: float, d_lat: float, d_lon: float) -> dict | None:
    """Returns {coords: [[lat, lon], ...], elevations: {(lat, lon): ft}, distance_m, duration_s} or None."""
    key = get_settings().ors_api_key
    if not key:
        return None
    try:
        data = await get_json(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            provider="ORS",
            params={
                "api_key": key,
                "start": f"{o_lon},{o_lat}",
                "end": f"{d_lon},{d_lat}",
                "elevation": "true",
            },
            timeout=12,
        )
        feature = data["features"][0]
        raw = feature["geometry"]["coordinates"]
        return {
            "coords": [[c[1], c[0]] for c in raw],
            "elevations": {(round(c[1], 5), round(c[0], 5)): (c[2] * 3.28084 if len(c) > 2 else None) for c in raw},
            "distance_m": feature["properties"]["summary"]["distance"],
            "duration_s": feature["properties"]["summary"]["duration"],
        }
    except (UpstreamError, KeyError, IndexError, TypeError):
        return None
