import httpx


async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["providers"]["openweathermap"] is True
    assert "X-Request-ID" in r.headers


async def test_current_weather_shape(client, upstream):
    r = await client.get("/api/weather/coords", params={"lat": 47.6, "lon": -122.33, "name": "Seattle"})
    assert r.status_code == 200
    body = r.json()
    assert body["city"] == "Seattle"
    assert body["temperature"] == 64.2
    assert body["weather_id"] == 500
    assert body["timezone_offset"] == -25200
    assert body["sunrise"] == 1700000000


async def test_current_weather_is_cached(client, upstream):
    from tests.conftest import OWM_CURRENT

    route = upstream.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(200, json=OWM_CURRENT)
    )
    await client.get("/api/weather/coords", params={"lat": 47.6, "lon": -122.33})
    await client.get("/api/weather/coords", params={"lat": 47.6001, "lon": -122.3301})
    assert route.call_count == 1


async def test_upstream_failure_maps_to_502(client, upstream):
    upstream.get("https://api.openweathermap.org/data/2.5/forecast").mock(
        return_value=httpx.Response(500, json={"message": "boom"})
    )
    r = await client.get("/api/forecast/coords", params={"lat": 1, "lon": 2})
    assert r.status_code == 502
    assert "OpenWeatherMap" in r.json()["detail"]


async def test_upstream_bad_key_maps_to_502_with_hint(client, upstream):
    upstream.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(401, json={"message": "Invalid API key"})
    )
    r = await client.get("/api/weather/coords", params={"lat": 1, "lon": 2})
    assert r.status_code == 502
    assert "API key" in r.json()["detail"]


async def test_validation_rejects_bad_coords(client):
    r = await client.get("/api/weather/coords", params={"lat": 95, "lon": 0})
    assert r.status_code == 422


async def test_forecast_shape(client, upstream):
    r = await client.get("/api/forecast/coords", params={"lat": 47.6, "lon": -122.33})
    assert r.status_code == 200
    body = r.json()
    assert body["city"] == "Seattle"
    assert len(body["forecast"]) == 40
    first = body["forecast"][0]
    assert {"dt", "temperature", "pop", "weather_id", "wind_speed"} <= set(first)


async def test_search_returns_empty_on_upstream_error(client, upstream):
    upstream.get("https://api.openweathermap.org/geo/1.0/direct").mock(return_value=httpx.Response(500))
    r = await client.get("/api/search", params={"q": "Sea"})
    assert r.status_code == 200
    assert r.json() == []


async def test_alerts_outside_us_short_circuit(client, upstream):
    route = upstream.get("https://api.weather.gov/alerts/active")
    r = await client.get("/api/alerts", params={"lat": 51.5, "lon": -0.1})
    assert r.json() == {"alerts": [], "coverage": "unsupported"}
    assert route.call_count == 0


async def test_alerts_sorted_by_severity(client, upstream):
    upstream.get("https://api.weather.gov/alerts/active").mock(
        return_value=httpx.Response(
            200,
            json={
                "features": [
                    {"properties": {"id": "a", "event": "Wind Advisory", "severity": "Minor", "headline": "h"}},
                    {"properties": {"id": "b", "event": "Tornado Warning", "severity": "Extreme", "headline": "h"}},
                ]
            },
        )
    )
    r = await client.get("/api/alerts", params={"lat": 35.0, "lon": -97.0})
    events = [a["event"] for a in r.json()["alerts"]]
    assert events == ["Tornado Warning", "Wind Advisory"]


async def test_hourly_uses_open_meteo(client, upstream):
    upstream.get("https://api.open-meteo.com/v1/forecast").mock(
        return_value=httpx.Response(
            200,
            json={
                "timezone": "America/Los_Angeles",
                "utc_offset_seconds": -25200,
                "hourly": {
                    "time": [1, 2, 3],
                    "temperature_2m": [60, 61, 62],
                    "apparent_temperature": [59, 60, 61],
                    "precipitation_probability": [10, 50, 90],
                    "precipitation": [0, 0.1, 0.3],
                    "weather_code": [1, 61, 63],
                    "wind_speed_10m": [5, 6, 7],
                    "wind_gusts_10m": [8, 9, 10],
                    "relative_humidity_2m": [50, 60, 70],
                    "uv_index": [1, 2, 3],
                    "is_day": [1, 1, 0],
                    "cloud_cover": [10, 50, 90],
                },
                "daily": {
                    "time": [1],
                    "sunrise": [1],
                    "sunset": [2],
                    "uv_index_max": [5],
                    "temperature_2m_max": [70],
                    "temperature_2m_min": [50],
                    "precipitation_probability_max": [90],
                },
            },
        )
    )
    r = await client.get("/api/hourly", params={"lat": 47.6, "lon": -122.33})
    assert r.status_code == 200
    body = r.json()
    assert body["timezone"] == "America/Los_Angeles"
    assert body["hourly"][0]["pop"] == 0.1
    assert body["daily"][0]["high"] == 70


async def test_map_tile_validation(client):
    assert (await client.get("/api/map-tile/evil/1/0/0")).status_code == 400
    assert (await client.get("/api/map-tile/clouds_new/1/5/0")).status_code == 400
    assert (await client.get("/api/map-tile/clouds_new/25/0/0")).status_code == 400


async def test_security_headers_on_html_not_api(client):
    api = await client.get("/api/health")
    assert api.headers["x-content-type-options"] == "nosniff"
    assert "content-security-policy" not in api.headers


def test_safe_dist_file_rejects_traversal(tmp_path, monkeypatch):
    from app import main as app_main

    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "assets" / "a.js").write_text("ok")
    (tmp_path / "secret.txt").write_text("nope")
    monkeypatch.setattr(app_main, "FRONTEND_DIST", dist)

    assert app_main._safe_dist_file("assets/a.js") == str((dist / "assets" / "a.js").resolve())
    for bad in ("../secret.txt", "assets/../../secret.txt", "..", "/etc/passwd", "assets//a.js", "~root", "a\\b"):
        assert app_main._safe_dist_file(bad) is None, bad
    assert app_main._safe_dist_file("missing.js") is None
