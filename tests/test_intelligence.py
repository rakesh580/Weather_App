from datetime import UTC

import httpx
from app.services.geo import bearing_deg, classify_weather, haversine_km, sample_waypoints, sunrise_sunset
from app.services.scoring import score_window, trapezoid_score, weather_penalty


def test_haversine_known_distance():
    # New York → London ≈ 5570 km
    assert abs(haversine_km(40.7128, -74.0060, 51.5074, -0.1278) - 5570) < 20


def test_bearing_north_is_zero():
    assert abs(bearing_deg(0, 0, 1, 0)) < 0.01


def test_sample_waypoints_keeps_endpoints():
    line = [[0, 0], [0, 0.5], [0, 1.0], [0, 1.5], [0, 2.0]]
    wps = sample_waypoints(line, interval_km=100)
    assert wps[0] == [0, 0]
    assert wps[-1] == [0, 2.0]
    assert len(wps) >= 2


def test_classify_weather():
    assert classify_weather(211)[0] == "storm"
    assert classify_weather(500)[0] == "rain"
    assert classify_weather(800)[0] == "clear"
    assert classify_weather(804)[0] == "clouds"


def test_sunrise_sunset_is_utc_iso():
    from datetime import date

    rise, set_ = sunrise_sunset(47.6, -122.33, date(2026, 6, 21))
    assert rise and rise.endswith("+00:00")
    assert set_ and set_ > rise


def test_trapezoid_score():
    assert trapezoid_score(50, 45, 65) == 100
    assert 0 < trapezoid_score(40, 45, 65) < 100
    assert trapezoid_score(-100, 45, 65) == 0


def test_score_window_prefers_ideal_conditions():
    from app.services.scoring import ACTIVITY_PROFILES

    running = ACTIVITY_PROFILES["running"]
    assert score_window(55, 5, 0.0, 50, running) > score_window(95, 30, 0.9, 95, running)


def test_weather_penalty_thunderstorm_is_worst():
    assert weather_penalty(211) > weather_penalty(500) > weather_penalty(800)


async def test_activity_types(client):
    r = await client.get("/api/activity/types")
    assert r.status_code == 200
    assert any(a["id"] == "running" for a in r.json())


async def test_activity_optimize(client, upstream):
    r = await client.get("/api/activity/optimize", params={"lat": 47.6, "lon": -122.33, "activity": "running"})
    assert r.status_code == 200
    body = r.json()
    assert body["activity"]["id"] == "running"
    assert len(body["all_windows"]) == 40
    assert body["ai_summary"]


async def test_activity_unknown(client):
    r = await client.get("/api/activity/optimize", params={"lat": 1, "lon": 2, "activity": "skydiving"})
    assert r.status_code == 400


async def test_pressure_trend(client, upstream):
    from datetime import datetime

    from tests.conftest import owm_forecast

    now = int(datetime.now(tz=UTC).timestamp())
    upstream.get("https://api.openweathermap.org/data/2.5/forecast").mock(
        return_value=httpx.Response(200, json=owm_forecast(now))
    )
    r = await client.get("/api/health/pressure-trend", params={"lat": 47.6, "lon": -122.33})
    assert r.status_code == 200
    body = r.json()
    assert len(body["hours"]) == len(body["pressures"]) > 0
    assert body["hours"][-1] <= 48


async def test_anomaly(client, upstream):
    from datetime import datetime

    now = datetime.now(tz=UTC)
    dates, highs, lows, precip = [], [], [], []
    for year in range(now.year - 30, now.year):
        for offset in range(-3, 4):
            from datetime import timedelta

            d = (datetime(year, now.month, min(now.day, 28)) + timedelta(days=offset)).strftime("%Y-%m-%d")
            dates.append(d)
            highs.append(70 + (year % 5))
            lows.append(50)
            precip.append(0)
    upstream.get("https://archive-api.open-meteo.com/v1/archive").mock(
        return_value=httpx.Response(
            200,
            json={
                "daily": {
                    "time": dates,
                    "temperature_2m_max": highs,
                    "temperature_2m_min": lows,
                    "precipitation_sum": precip,
                }
            },
        )
    )
    r = await client.get("/api/anomaly", params={"lat": 47.6, "lon": -122.33})
    assert r.status_code == 200
    body = r.json()
    assert body["anomaly"]["classification"] in {"Normal", "Slightly Unusual", "Unusual", "Rare", "Extremely Rare"}
    assert body["historical_range"]["record_high"] >= body["historical_avg"]["temp_high"]


async def test_logistics_optimize_returns_aware_timestamps(client, upstream):
    r = await client.post(
        "/api/logistics/optimize",
        json={
            "stops": [
                {"lat": 47.6, "lon": -122.33, "name": "A", "duration_minutes": 30},
                {"lat": 47.7, "lon": -122.4, "name": "B", "duration_minutes": 15},
                {"lat": 47.5, "lon": -122.2, "name": "C", "duration_minutes": 45},
            ],
            "start_time": "2030-01-01T09:00:00Z",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert sorted(body["optimized_order"]) == [0, 1, 2]
    assert body["stops_detail"][0]["arrival"].endswith("+00:00")
    assert body["comparison"]["optimized_penalty"] <= body["comparison"]["naive_penalty"]


async def test_journey_straight_line_fallback(client, upstream):
    upstream.get("https://api.openweathermap.org/geo/1.0/reverse").mock(
        return_value=httpx.Response(200, json=[{"name": "Midpoint"}])
    )
    r = await client.post(
        "/api/journey",
        json={
            "origin_lat": 47.6,
            "origin_lon": -122.33,
            "origin_name": "Seattle",
            "dest_lat": 45.5,
            "dest_lon": -122.68,
            "dest_name": "Portland",
            "departure_time": "2030-01-01T09:00:00Z",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["used_real_route"] is False
    assert body["waypoints"][0]["name"] == "Seattle"
    assert body["waypoints"][-1]["name"] == "Portland"
    assert body["waypoints"][0]["estimated_arrival"].startswith("2030-01-01T09:00:00+00:00")
    assert len(body["segments"]) == len(body["waypoints"]) - 1
    assert body["total_distance_miles"] > 100


async def test_journey_rejects_bad_departure(client):
    r = await client.post(
        "/api/journey",
        json={
            "origin_lat": 0,
            "origin_lon": 0,
            "dest_lat": 1,
            "dest_lon": 1,
            "departure_time": "yesterday",
        },
    )
    assert r.status_code == 422
