"""Open-Meteo client — free, keyless: hourly forecast, 30-year archive, elevation."""

from __future__ import annotations

import statistics
from datetime import UTC, datetime

from app.cache import AsyncTTLCache
from app.config import get_settings
from app.http import get_json

PROVIDER = "Open-Meteo"

_hourly_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=2000, ttl=get_settings().hourly_cache_ttl)
_climatology_cache: AsyncTTLCache[dict] = AsyncTTLCache(maxsize=500, ttl=86400)
_elevation_cache: AsyncTTLCache[float] = AsyncTTLCache(maxsize=5000, ttl=604800)

HOURLY_FIELDS = [
    "temperature_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_gusts_10m",
    "relative_humidity_2m",
    "uv_index",
    "is_day",
    "cloud_cover",
]


async def hourly(lat: float, lon: float, hours: int = 48) -> dict:
    """48h hourly forecast in the location's local timezone (imperial units to match OWM)."""

    async def fetch() -> dict:
        data = await get_json(
            "https://api.open-meteo.com/v1/forecast",
            provider=PROVIDER,
            params={
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "hourly": ",".join(HOURLY_FIELDS),
                "daily": "sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "temperature_unit": "fahrenheit",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "timezone": "auto",
                "forecast_days": 3,
                "timeformat": "unixtime",
            },
        )
        h = data.get("hourly", {})
        times = h.get("time", [])
        now_ts = datetime.now(tz=UTC).timestamp()
        start = 0
        for i, t in enumerate(times):
            if t + 3600 > now_ts:  # include the current hour
                start = i
                break
        rows = []
        for i in range(start, min(len(times), start + hours)):

            def at(field: str, idx: int = i):
                values = h.get(field) or []
                return values[idx] if idx < len(values) else None

            rows.append(
                {
                    "dt": times[i],
                    "temperature": at("temperature_2m"),
                    "feels_like": at("apparent_temperature"),
                    "pop": (at("precipitation_probability") or 0) / 100,
                    "precip_in": at("precipitation") or 0,
                    "weather_code": at("weather_code"),
                    "wind_speed": at("wind_speed_10m"),
                    "wind_gust": at("wind_gusts_10m"),
                    "humidity": at("relative_humidity_2m"),
                    "uvi": at("uv_index"),
                    "is_day": bool(at("is_day")),
                    "clouds": at("cloud_cover"),
                }
            )
        d = data.get("daily", {})
        daily = [
            {
                "date": d.get("time", [])[i],
                "sunrise": (d.get("sunrise") or [None])[i] if i < len(d.get("sunrise") or []) else None,
                "sunset": (d.get("sunset") or [None])[i] if i < len(d.get("sunset") or []) else None,
                "uv_max": (d.get("uv_index_max") or [None])[i] if i < len(d.get("uv_index_max") or []) else None,
                "high": (d.get("temperature_2m_max") or [None])[i]
                if i < len(d.get("temperature_2m_max") or [])
                else None,
                "low": (d.get("temperature_2m_min") or [None])[i]
                if i < len(d.get("temperature_2m_min") or [])
                else None,
                "pop_max": ((d.get("precipitation_probability_max") or [0])[i] or 0) / 100
                if i < len(d.get("precipitation_probability_max") or [])
                else None,
            }
            for i in range(len(d.get("time", [])))
        ]
        return {
            "timezone": data.get("timezone"),
            "utc_offset_seconds": data.get("utc_offset_seconds", 0),
            "hourly": rows,
            "daily": daily,
        }

    return await _hourly_cache.get_or_fetch((round(lat, 2), round(lon, 2), hours), fetch)


async def climatology(lat: float, lon: float, month: int, day: int) -> dict | None:
    """30-year daily archive filtered to ±3 days of the target date. One upstream call, cached 24h."""

    async def fetch() -> dict | None:
        current_year = datetime.now(tz=UTC).year
        data = await get_json(
            "https://archive-api.open-meteo.com/v1/archive",
            provider=PROVIDER,
            params={
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
                "start_date": f"{current_year - 30}-01-01",
                "end_date": f"{current_year - 1}-12-31",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "temperature_unit": "fahrenheit",
            },
            timeout=30,
        )
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        highs = daily.get("temperature_2m_max", [])
        lows = daily.get("temperature_2m_min", [])
        target_doy = datetime(2000, month, day).timetuple().tm_yday
        all_highs: list[float] = []
        all_lows: list[float] = []
        decade_highs: dict[str, list[float]] = {}
        for i, date_str in enumerate(dates):
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                continue
            diff = abs(dt.timetuple().tm_yday - target_doy)
            if diff > 180:
                diff = 365 - diff
            if diff > 3:
                continue
            h = highs[i] if i < len(highs) else None
            lo = lows[i] if i < len(lows) else None
            if h is not None:
                all_highs.append(h)
                decade_highs.setdefault(f"{(dt.year // 10) * 10}s", []).append(h)
            if lo is not None:
                all_lows.append(lo)
        if len(all_highs) < 10:
            return None
        return {
            "all_highs": all_highs,
            "mean_high": round(statistics.mean(all_highs), 1),
            "std_high": round(statistics.stdev(all_highs), 1) if len(all_highs) > 1 else 1.0,
            "mean_low": round(statistics.mean(all_lows), 1) if all_lows else 0,
            "std_low": round(statistics.stdev(all_lows), 1) if len(all_lows) > 1 else 1.0,
            "record_high": round(max(all_highs), 1),
            "record_low": round(min(all_lows), 1) if all_lows else None,
            "sample_size": len(all_highs),
            "decade_avgs": {k: round(statistics.mean(v), 1) for k, v in sorted(decade_highs.items())},
        }

    doy = datetime(2000, month, day).timetuple().tm_yday
    return await _climatology_cache.get_or_fetch((round(lat, 1), round(lon, 1), doy), fetch)


async def elevation_m(lat: float, lon: float) -> float:
    async def fetch() -> float:
        try:
            data = await get_json(
                "https://api.open-meteo.com/v1/elevation",
                provider=PROVIDER,
                params={"latitude": lat, "longitude": lon},
                timeout=5,
            )
            return float(data.get("elevation", [0])[0])
        except Exception:
            return 0.0

    return await _elevation_cache.get_or_fetch((round(lat, 4), round(lon, 4)), fetch)
