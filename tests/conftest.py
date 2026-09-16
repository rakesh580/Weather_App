import os

import httpx
import pytest
import respx
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("OPENWEATHER_API_KEY", "test-owm-key")
os.environ.setdefault("ORS_API_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("HF_API_KEY", "")
os.environ.setdefault("SKYPULSE_API_KEY", "")

from app.config import get_settings
from app.main import app
from app.services import owm

OWM_CURRENT = {
    "coord": {"lat": 47.6, "lon": -122.33},
    "name": "Seattle",
    "sys": {"country": "US", "sunrise": 1700000000, "sunset": 1700040000},
    "main": {"temp": 64.2, "feels_like": 63.1, "temp_min": 60.0, "temp_max": 68.0, "humidity": 71, "pressure": 1014},
    "weather": [{"id": 500, "description": "light rain", "icon": "10d"}],
    "wind": {"speed": 9.4, "deg": 210},
    "clouds": {"all": 75},
    "visibility": 10000,
    "dt": 1700000000,
    "timezone": -25200,
}


def owm_forecast(start_ts: int = 1700000000, n: int = 40) -> dict:
    return {
        "city": {"name": "Seattle", "country": "US", "timezone": -25200},
        "list": [
            {
                "dt": start_ts + i * 10800,
                "dt_txt": "2023-11-14 22:00:00",
                "main": {"temp": 55 + (i % 8), "feels_like": 54, "humidity": 60, "pressure": 1010 + (i % 5)},
                "weather": [
                    {
                        "id": 500 if i % 5 == 0 else 801,
                        "description": "rain" if i % 5 == 0 else "few clouds",
                        "icon": "10d",
                    }
                ],
                "wind": {"speed": 5 + (i % 10), "deg": 180},
                "clouds": {"all": 40},
                "pop": 0.6 if i % 5 == 0 else 0.1,
            }
            for i in range(n)
        ],
    }


@pytest.fixture(autouse=True)
def _reset_state():
    get_settings.cache_clear()
    owm.clear_caches()
    yield
    get_settings.cache_clear()
    owm.clear_caches()


@pytest.fixture
async def client():
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac,
    ):
        yield ac


@pytest.fixture
def upstream():
    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api.openweathermap.org/data/2.5/weather").mock(
            return_value=httpx.Response(200, json=OWM_CURRENT)
        )
        mock.get("https://api.openweathermap.org/data/2.5/forecast").mock(
            return_value=httpx.Response(200, json=owm_forecast())
        )
        mock.get("https://api.weather.gov/alerts/active").mock(return_value=httpx.Response(200, json={"features": []}))
        yield mock
