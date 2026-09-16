"""Pure geo / astronomy helpers (no I/O)."""

from __future__ import annotations

import math
from datetime import UTC, date, datetime

EARTH_RADIUS_KM = 6371.0
MILES_PER_KM = 0.621371
METERS_PER_MILE = 1609.34
FEET_PER_METER = 3.28084


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial bearing (0-360°) from point 1 to point 2."""
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)
    x = math.sin(dlon) * math.cos(lat2r)
    y = math.cos(lat1r) * math.sin(lat2r) - math.sin(lat1r) * math.cos(lat2r) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def sample_waypoints(coords: list[list[float]], interval_km: float = 128) -> list[list[float]]:
    """Pick points along a polyline roughly every `interval_km`, always keeping both ends."""
    if not coords:
        return []
    waypoints = [coords[0]]
    accumulated = 0.0
    for i in range(1, len(coords)):
        accumulated += haversine_km(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
        if accumulated >= interval_km:
            waypoints.append(coords[i])
            accumulated = 0.0
    if waypoints[-1] != coords[-1]:
        waypoints.append(coords[-1])
    return waypoints


def interpolate_line(lat1: float, lon1: float, lat2: float, lon2: float, interval_km: float = 128) -> list[list[float]]:
    """Straight-line fallback when no routing provider is available."""
    total = haversine_km(lat1, lon1, lat2, lon2)
    n = max(2, int(total / interval_km) + 1)
    return [[lat1 + (lat2 - lat1) * i / n, lon1 + (lon2 - lon1) * i / n] for i in range(n + 1)]


def classify_weather(weather_id: int) -> tuple[str, str]:
    """Map an OpenWeatherMap condition id to (severity, hex colour)."""
    if 200 <= weather_id < 300:
        return "storm", "#ef4444"
    if 300 <= weather_id < 600:
        return "rain", "#f59e0b"
    if 600 <= weather_id < 700:
        return "snow", "#f97316"
    if 700 <= weather_id < 800:
        return "fog", "#f97316"
    if weather_id == 800:
        return "clear", "#22c55e"
    if weather_id <= 802:
        return "clouds", "#a3e635"
    return "clouds", "#facc15"


SEVERITY_RANK = {"clear": 0, "clouds": 1, "unknown": 2, "fog": 3, "rain": 4, "snow": 5, "storm": 6}


def solar_elevation_deg(lat: float, lon: float, when: datetime) -> float:
    """Approximate solar elevation angle for a UTC datetime."""
    day_of_year = when.timetuple().tm_yday
    declination = 23.45 * math.sin(math.radians(360 / 365 * (day_of_year - 81)))
    decl_rad = math.radians(declination)
    solar_noon_utc = 12 - lon / 15
    hour_angle = (when.hour + when.minute / 60 - solar_noon_utc) * 15
    sin_elev = math.sin(math.radians(lat)) * math.sin(decl_rad) + math.cos(math.radians(lat)) * math.cos(
        decl_rad
    ) * math.cos(math.radians(hour_angle))
    return math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))


def estimate_uv_index(lat: float, lon: float, clouds_pct: float, when: datetime) -> float:
    """Clear-sky UV estimate from solar elevation, attenuated by cloud cover."""
    elev = solar_elevation_deg(lat, lon, when)
    if elev <= 0:
        return 0.0
    max_uvi = 12.0 * math.sin(math.radians(elev)) ** 0.6
    cloud_factor = 1 - (clouds_pct / 100) * 0.75
    return round(max(0.0, max_uvi * cloud_factor), 1)


def sunrise_sunset(lat: float, lon: float, day: date) -> tuple[str | None, str | None]:
    """Sunrise / sunset ISO strings (UTC) via the NOAA-style algorithm. None for polar day/night."""
    a_val = (14 - day.month) // 12
    y = day.year + 4800 - a_val
    m = day.month + 12 * a_val - 3
    jdn = day.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    n = jdn - 2451545 + 0.5
    j_star = n - lon / 360.0
    mean_anomaly = (357.5291 + 0.98560028 * j_star) % 360
    m_rad = math.radians(mean_anomaly)
    center = 1.9148 * math.sin(m_rad) + 0.02 * math.sin(2 * m_rad) + 0.0003 * math.sin(3 * m_rad)
    lam = (mean_anomaly + center + 180 + 102.9372) % 360
    lam_rad = math.radians(lam)
    j_transit = 2451545.0 + j_star + 0.0053 * math.sin(m_rad) - 0.0069 * math.sin(2 * lam_rad)
    sin_dec = math.sin(lam_rad) * math.sin(math.radians(23.4397))
    cos_dec = math.cos(math.asin(sin_dec))
    lat_rad = math.radians(lat)
    denom = math.cos(lat_rad) * cos_dec
    if denom == 0:
        return None, None
    cos_omega = (math.sin(math.radians(-0.833)) - math.sin(lat_rad) * sin_dec) / denom
    if cos_omega > 1 or cos_omega < -1:
        return None, None
    omega = math.degrees(math.acos(cos_omega))

    def jd_to_dt(jd: float) -> datetime:
        unix = (jd - 2440587.5) * 86400
        return datetime.fromtimestamp(unix, tz=UTC).replace(second=0, microsecond=0)

    return jd_to_dt(j_transit - omega / 360.0).isoformat(), jd_to_dt(j_transit + omega / 360.0).isoformat()


def find_closest_forecast(forecast_list: list[dict], target_ts: int) -> tuple[dict | None, bool]:
    """Closest 3-hourly forecast entry to a unix timestamp; `reliable` if within 90 minutes."""
    if not forecast_list:
        return None, False
    closest = min(forecast_list, key=lambda e: abs(e["dt"] - target_ts))
    return closest, abs(closest["dt"] - target_ts) < 5400
