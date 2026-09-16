"""OpenWeatherMap client (current, forecast, air pollution, geocoding, tiles)."""

from __future__ import annotations

from typing import Any

import httpx

from app.cache import AsyncTTLCache
from app.config import get_settings
from app.http import UpstreamError, get_client, get_json

PROVIDER = "OpenWeatherMap"
BASE = "https://api.openweathermap.org"

_current_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=2000, ttl=get_settings().weather_cache_ttl)
_forecast_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=2000, ttl=get_settings().forecast_cache_ttl)
_geocode_cache: AsyncTTLCache[list] = AsyncTTLCache(maxsize=5000, ttl=get_settings().geocode_cache_ttl)
_reverse_cache: AsyncTTLCache[str] = AsyncTTLCache(maxsize=5000, ttl=get_settings().geocode_cache_ttl)


def _key(lat: float, lon: float) -> tuple[float, float]:
    return (round(lat, 3), round(lon, 3))


def _params(**extra: Any) -> dict[str, Any]:
    key = get_settings().openweather_api_key
    if not key:
        raise UpstreamError(PROVIDER, "OPENWEATHER_API_KEY is not configured", status=401)
    return {"appid": key, **extra}


async def current(lat: float, lon: float) -> dict:
    async def fetch() -> dict:
        return await get_json(
            f"{BASE}/data/2.5/weather", provider=PROVIDER, params=_params(lat=lat, lon=lon, units="imperial")
        )

    return await _current_cache.get_or_fetch(_key(lat, lon), fetch)


async def forecast(lat: float, lon: float) -> dict:
    async def fetch() -> dict:
        return await get_json(
            f"{BASE}/data/2.5/forecast", provider=PROVIDER, params=_params(lat=lat, lon=lon, units="imperial")
        )

    return await _forecast_cache.get_or_fetch(_key(lat, lon), fetch)


async def forecast_list(lat: float, lon: float) -> list[dict]:
    """Forecast entries only; swallows upstream failures (used for best-effort waypoint lookups)."""
    try:
        return (await forecast(lat, lon)).get("list", [])
    except UpstreamError:
        return []


async def air_pollution(lat: float, lon: float) -> dict:
    return await get_json(f"{BASE}/data/2.5/air_pollution", provider=PROVIDER, params=_params(lat=lat, lon=lon))


async def geocode(query: str, limit: int = 5) -> list[dict]:
    async def fetch() -> list[dict]:
        data = await get_json(f"{BASE}/geo/1.0/direct", provider=PROVIDER, params=_params(q=query, limit=limit))
        return [
            {
                "name": r.get("name"),
                "lat": r.get("lat"),
                "lon": r.get("lon"),
                "country": r.get("country"),
                "state": r.get("state", ""),
            }
            for r in data
        ]

    return await _geocode_cache.get_or_fetch((query.strip().lower(), limit), fetch)


async def reverse_geocode(lat: float, lon: float) -> str:
    async def fetch() -> str:
        try:
            data = await get_json(
                f"{BASE}/geo/1.0/reverse", provider=PROVIDER, params=_params(lat=lat, lon=lon, limit=1)
            )
        except UpstreamError:
            return "Waypoint"
        return (data[0].get("name") if data else None) or "Waypoint"

    return await _reverse_cache.get_or_fetch(_key(lat, lon), fetch)


async def tile(layer: str, z: int, x: int, y: int) -> bytes:
    params = _params()
    url = f"https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png"
    try:
        resp = await get_client().get(url, params=params, timeout=10)
    except httpx.HTTPError as exc:
        raise UpstreamError(PROVIDER, "tile transport error") from exc
    if resp.status_code != 200:
        raise UpstreamError(PROVIDER, "tile fetch failed", status=resp.status_code)
    return resp.content


def cache_stats() -> dict[str, Any]:
    return {"current": _current_cache.stats(), "forecast": _forecast_cache.stats(), "geocode": _geocode_cache.stats()}


def clear_caches() -> None:
    for c in (_current_cache, _forecast_cache, _geocode_cache, _reverse_cache):
        c.clear()
