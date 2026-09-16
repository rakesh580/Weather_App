"""OSM Overpass land-use lookup for the microclimate estimator."""

from __future__ import annotations

from app.cache import AsyncTTLCache
from app.http import UpstreamError, post_form

_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=1000, ttl=604800)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


async def land_use(lat: float, lon: float) -> dict:
    async def fetch() -> dict:
        result = {"built_up_fraction": 0.0, "water_nearby": False, "water_distance_km": 99}
        safe_lat, safe_lon = float(round(lat, 6)), float(round(lon, 6))  # numeric only → no QL injection
        built_q = (
            "[out:json][timeout:10];("
            f'way["landuse"~"residential|commercial|industrial|retail"](around:500,{safe_lat},{safe_lon});'
            f'way["building"](around:500,{safe_lat},{safe_lon});'
            ");out count;"
        )
        water_q = (
            "[out:json][timeout:10];("
            f'way["natural"="water"](around:2000,{safe_lat},{safe_lon});'
            f'way["waterway"](around:2000,{safe_lat},{safe_lon});'
            ");out count;"
        )
        try:
            data = await post_form(OVERPASS_URL, provider="Overpass", data={"data": built_q}, timeout=12)
            count = _count(data)
            result["built_up_fraction"] = min(1.0, count / 50)
            data2 = await post_form(OVERPASS_URL, provider="Overpass", data={"data": water_q}, timeout=12)
            water_count = _count(data2)
            if water_count > 0:
                result["water_nearby"] = True
                result["water_distance_km"] = max(0.2, 2.0 - water_count * 0.3)
        except UpstreamError:
            pass
        return result

    return await _cache.get_or_fetch((round(lat, 3), round(lon, 3)), fetch)


def _count(data: dict) -> int:
    """`out count;` returns one element whose tags carry totals; fall back to element count."""
    elements = data.get("elements", [])
    for el in elements:
        tags = el.get("tags", {})
        if "total" in tags:
            try:
                return int(tags["total"])
            except ValueError:
                pass
    return len(elements)
