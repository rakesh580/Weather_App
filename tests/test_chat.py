import os

import httpx
from app.config import get_settings


async def test_chat_unconfigured_returns_503(client):
    r = await client.post("/api/chat", json={"message": "Will it rain?"})
    assert r.status_code == 503


async def test_chat_uses_searched_city_context(client, upstream, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    get_settings.cache_clear()
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.content.decode()
        captured["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={"choices": [{"message": {"content": "Yes, bring an umbrella."}}]})

    upstream.post("https://api.groq.com/openai/v1/chat/completions").mock(side_effect=handler)
    r = await client.post("/api/chat", json={"message": "Umbrella?", "lat": 47.6, "lon": -122.33, "city": "Seattle"})
    assert r.status_code == 200
    assert r.json()["response"] == "Yes, bring an umbrella."
    assert r.json()["context_city"] == "Seattle"
    assert "light rain" in captured["body"]
    assert captured["auth"] == "Bearer gsk_test"


async def test_chat_accepts_frontend_journey_context_keys(client, upstream, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    get_settings.cache_clear()
    upstream.post("https://api.groq.com/openai/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})
    )
    r = await client.post(
        "/api/chat",
        json={
            "message": "How is my drive?",
            "journey_context": {"from": "A", "to": "B", "distance_miles": 10, "duration_hours": 1, "waypoints": []},
        },
    )
    assert r.status_code == 200


async def test_chat_rejects_unknown_journey_keys(client):
    r = await client.post("/api/chat", json={"message": "x", "journey_context": {"evil": 1}})
    assert r.status_code == 422


async def test_chat_stream_emits_sse(client, upstream, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    get_settings.cache_clear()
    sse = (
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'
        "data: [DONE]\n\n"
    )
    upstream.post("https://api.groq.com/openai/v1/chat/completions").mock(
        return_value=httpx.Response(200, text=sse, headers={"content-type": "text/event-stream"})
    )
    r = await client.post("/api/chat/stream", json={"message": "hi"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")
    assert '{"delta": "Hel"}' in r.text
    assert '{"delta": "lo"}' in r.text
    assert '"done": true' in r.text


async def test_api_key_guard(client, upstream, monkeypatch):
    monkeypatch.setenv("SKYPULSE_API_KEY", "secret")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    get_settings.cache_clear()
    r = await client.post("/api/chat", json={"message": "hi"})
    assert r.status_code == 401
    upstream.post("https://api.groq.com/openai/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})
    )
    r = await client.post("/api/chat", json={"message": "hi"}, headers={"X-API-Key": "secret"})
    assert r.status_code == 200


async def test_briefing(client, upstream, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    get_settings.cache_clear()
    upstream.get("https://api.open-meteo.com/v1/forecast").mock(
        return_value=httpx.Response(
            200,
            json={
                "timezone": "UTC",
                "utc_offset_seconds": 0,
                "hourly": {
                    "time": [10**10],
                    "temperature_2m": [65],
                    "apparent_temperature": [64],
                    "precipitation_probability": [20],
                    "precipitation": [0],
                    "weather_code": [1],
                    "wind_speed_10m": [5],
                    "wind_gusts_10m": [9],
                    "relative_humidity_2m": [50],
                    "uv_index": [4],
                    "is_day": [1],
                    "cloud_cover": [10],
                },
                "daily": {"time": []},
            },
        )
    )
    upstream.post("https://api.groq.com/openai/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": "Mild and dry today."}}]})
    )
    r = await client.get("/api/briefing", params={"lat": 47.6, "lon": -122.33, "name": "Seattle"})
    assert r.status_code == 200
    assert r.json()["briefing"] == "Mild and dry today."
    assert r.json()["city"] == "Seattle"
    assert os.environ.get("GROQ_API_KEY") == "gsk_test"
