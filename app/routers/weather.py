"""Core weather endpoints: search/geocode, current, forecast, hourly, air quality, UV, alerts."""

from __future__ import annotations

from datetime import UTC, datetime

import pytz
from fastapi import APIRouter, HTTPException, Query

from app.http import UpstreamError, upstream_http_error
from app.services import nws, open_meteo, ors, owm
from app.services.geo import estimate_uv_index

router = APIRouter(prefix="/api", tags=["weather"])

# Legacy zone-based endpoints kept for backwards compatibility with the v1 UI.
ZONE_TO_CITY = {
    "America/New_York": {"lat": 40.7128, "lon": -74.0060, "city": "New York"},
    "America/Chicago": {"lat": 41.8781, "lon": -87.6298, "city": "Chicago"},
    "America/Denver": {"lat": 39.7392, "lon": -104.9903, "city": "Denver"},
    "America/Los_Angeles": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles"},
    "America/Phoenix": {"lat": 33.4484, "lon": -112.0740, "city": "Phoenix"},
    "America/Anchorage": {"lat": 61.2181, "lon": -149.9003, "city": "Anchorage"},
    "Pacific/Honolulu": {"lat": 21.3069, "lon": -157.8583, "city": "Honolulu"},
}

AQI_LABELS = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}

LatQ = Query(..., ge=-90, le=90)
LonQ = Query(..., ge=-180, le=180)


def shape_current(data: dict, lat: float, lon: float, name: str = "") -> dict:
    main = data.get("main", {})
    wx = (data.get("weather") or [{}])[0]
    return {
        "city": name or data.get("name") or "Unknown",
        "country": data.get("sys", {}).get("country", ""),
        "lat": lat,
        "lon": lon,
        "temperature": main.get("temp"),
        "feels_like": main.get("feels_like"),
        "temp_min": main.get("temp_min"),
        "temp_max": main.get("temp_max"),
        "humidity": main.get("humidity"),
        "pressure": main.get("pressure"),
        "visibility": data.get("visibility"),
        "weather": wx.get("description", ""),
        "weather_id": wx.get("id", 800),
        "weather_icon": wx.get("icon", "01d"),
        "wind_speed": data.get("wind", {}).get("speed", 0),
        "wind_deg": data.get("wind", {}).get("deg"),
        "wind_gust": data.get("wind", {}).get("gust"),
        "clouds": data.get("clouds", {}).get("all", 0),
        "rain_1h": data.get("rain", {}).get("1h"),
        "snow_1h": data.get("snow", {}).get("1h"),
        "dt": data.get("dt"),
        "timezone_offset": data.get("timezone", 0),
        "sunrise": data.get("sys", {}).get("sunrise"),
        "sunset": data.get("sys", {}).get("sunset"),
    }


def shape_forecast(data: dict) -> dict:
    entries = []
    for entry in data.get("list", []):
        wx = (entry.get("weather") or [{}])[0]
        entries.append(
            {
                "dt": entry["dt"],
                "time": entry.get("dt_txt", ""),
                "temperature": entry["main"]["temp"],
                "feels_like": entry["main"].get("feels_like"),
                "humidity": entry["main"].get("humidity"),
                "pressure": entry["main"].get("pressure"),
                "weather": wx.get("description", ""),
                "weather_id": wx.get("id", 800),
                "weather_icon": wx.get("icon", "01d"),
                "wind_speed": entry.get("wind", {}).get("speed", 0),
                "wind_deg": entry.get("wind", {}).get("deg"),
                "clouds": entry.get("clouds", {}).get("all", 0),
                "pop": entry.get("pop", 0),
                "rain_3h": entry.get("rain", {}).get("3h", 0),
                "snow_3h": entry.get("snow", {}).get("3h", 0),
            }
        )
    city = data.get("city", {})
    return {
        "city": city.get("name", ""),
        "country": city.get("country", ""),
        "timezone_offset": city.get("timezone", 0),
        "forecast": entries,
    }


@router.get("/weather")
async def weather_by_zone(zone: str = "America/New_York") -> dict:
    if zone not in ZONE_TO_CITY:
        raise HTTPException(status_code=400, detail=f"Unsupported zone. Choose one of: {list(ZONE_TO_CITY)}")
    info = ZONE_TO_CITY[zone]
    try:
        data = await owm.current(info["lat"], info["lon"])
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    return {
        "city": info["city"],
        "timezone": zone,
        "local_time": datetime.now(pytz.timezone(zone)).strftime("%Y-%m-%d %H:%M:%S"),
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"],
    }


@router.get("/forecast")
async def forecast_by_zone(zone: str = "America/New_York") -> dict:
    if zone not in ZONE_TO_CITY:
        raise HTTPException(status_code=400, detail=f"Unsupported zone. Choose one of: {list(ZONE_TO_CITY)}")
    info = ZONE_TO_CITY[zone]
    try:
        data = await owm.forecast(info["lat"], info["lon"])
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    tz = pytz.timezone(zone)
    return {
        "city": info["city"],
        "timezone": zone,
        "forecast": [
            {
                "time": datetime.fromtimestamp(e["dt"], tz).strftime("%Y-%m-%d %H:%M:%S"),
                "temperature": e["main"]["temp"],
                "humidity": e["main"]["humidity"],
                "weather": e["weather"][0]["description"],
                "wind_speed": e["wind"]["speed"],
            }
            for e in data.get("list", [])[:10]
        ],
    }


@router.get("/search")
async def search_city(
    q: str = Query(..., min_length=2, max_length=100), limit: int = Query(default=5, ge=1, le=10)
) -> list[dict]:
    try:
        return await owm.geocode(q, limit)
    except UpstreamError:
        return []


@router.get("/geocode")
async def geocode(
    q: str = Query(..., min_length=2, max_length=200), limit: int = Query(default=5, ge=1, le=10)
) -> list[dict]:
    return await ors.geocode_address(q, limit)


@router.get("/weather/coords")
async def weather_by_coords(
    lat: float = LatQ, lon: float = LonQ, name: str = Query(default="", max_length=100)
) -> dict:
    try:
        data = await owm.current(lat, lon)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    return shape_current(data, lat, lon, name)


@router.get("/forecast/coords")
async def forecast_by_coords(lat: float = LatQ, lon: float = LonQ) -> dict:
    try:
        data = await owm.forecast(lat, lon)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    return shape_forecast(data)


@router.get("/hourly")
async def hourly(lat: float = LatQ, lon: float = LonQ, hours: int = Query(default=48, ge=6, le=72)) -> dict:
    """Hour-by-hour forecast from Open-Meteo (keyless). Includes precipitation probability and UV."""
    try:
        return await open_meteo.hourly(lat, lon, hours)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc


@router.get("/airquality")
async def air_quality(lat: float = LatQ, lon: float = LonQ) -> dict:
    try:
        data = await owm.air_pollution(lat, lon)
        item = data["list"][0]
    except (UpstreamError, KeyError, IndexError):
        return {"aqi": None, "aqi_label": None, "components": {}}
    aqi = item.get("main", {}).get("aqi")
    return {"aqi": aqi, "aqi_label": AQI_LABELS.get(aqi, "Unknown"), "components": item.get("components", {})}


@router.get("/uv")
async def uv_index(lat: float = LatQ, lon: float = LonQ) -> dict:
    """UV index: Open-Meteo measured value when available, else a solar-geometry estimate."""
    try:
        data = await open_meteo.hourly(lat, lon, hours=1)
        first = data["hourly"][0]
        if first.get("uvi") is not None:
            return {"uvi": round(float(first["uvi"]), 1), "source": "open-meteo"}
    except (UpstreamError, KeyError, IndexError, TypeError, ValueError):
        pass
    try:
        clouds = (await owm.current(lat, lon)).get("clouds", {}).get("all", 50)
    except UpstreamError:
        clouds = 50
    return {"uvi": estimate_uv_index(lat, lon, clouds, datetime.now(tz=UTC)), "source": "estimate"}


@router.get("/alerts")
async def alerts(lat: float = LatQ, lon: float = LonQ) -> dict:
    """Active severe-weather alerts (US National Weather Service). Non-US locations return coverage=unsupported."""
    return await nws.alerts(lat, lon)
