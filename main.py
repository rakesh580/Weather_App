import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pytz, threading, webbrowser
from datetime import datetime
from typing import Optional
import requests
from dotenv import load_dotenv
from huggingface_hub import InferenceClient, AsyncInferenceClient

# Load environment variables from .env
load_dotenv()

# API keys from environment
API_KEY = os.getenv("OPENWEATHER_API_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")

# Hugging Face Inference API config
HF_MODEL = "meta-llama/Llama-3.3-70B-Instruct"
hf_async_client = AsyncInferenceClient(api_key=HF_API_KEY) if HF_API_KEY else None
hf_sync_client = InferenceClient(api_key=HF_API_KEY) if HF_API_KEY else None

# US Zones with representative cities
ZONE_TO_CITY = {
    "America/New_York": {"lat": 40.7128, "lon": -74.0060, "city": "New York"},
    "America/Chicago": {"lat": 41.8781, "lon": -87.6298, "city": "Chicago"},
    "America/Denver": {"lat": 39.7392, "lon": -104.9903, "city": "Denver"},
    "America/Los_Angeles": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles"},
    "America/Phoenix": {"lat": 33.4484, "lon": -112.0740, "city": "Phoenix"},
    "America/Anchorage": {"lat": 61.2181, "lon": -149.9003, "city": "Anchorage"},
    "Pacific/Honolulu": {"lat": 21.3069, "lon": -157.8583, "city": "Honolulu"},
}

# Create FastAPI app
app = FastAPI(title="SkyPulse Weather API", version="7.0")

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    timezone: Optional[str] = "America/New_York"

class ChatResponse(BaseModel):
    response: str
    timestamp: str

# Serve static frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    """Serve the main HTML page"""
    return FileResponse("static/index.html")


# WEATHER ENDPOINTS
@app.get("/api/weather")
def get_weather(zone: str = "America/New_York"):
    """Fetch current weather"""
    if zone not in ZONE_TO_CITY:
        return {"error": f"Unsupported zone. Choose one of: {list(ZONE_TO_CITY.keys())}"}

    city_info = ZONE_TO_CITY[zone]
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": city_info["lat"],
        "lon": city_info["lon"],
        "appid": API_KEY,
        "units": "imperial"
    }

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": data.get("message", "Failed to fetch weather data")}

    tz = pytz.timezone(zone)
    local_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

    return {
        "city": city_info["city"],
        "timezone": zone,
        "local_time": local_time,
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"]
    }


@app.get("/api/forecast")
def get_forecast(zone: str = "America/New_York"):
    """Fetch 5-day / 3-hour forecast"""
    if zone not in ZONE_TO_CITY:
        return {"error": f"Unsupported zone. Choose one of: {list(ZONE_TO_CITY.keys())}"}

    city_info = ZONE_TO_CITY[zone]
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": city_info["lat"],
        "lon": city_info["lon"],
        "appid": API_KEY,
        "units": "imperial"
    }

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": data.get("message", "Failed to fetch forecast data")}

    tz = pytz.timezone(zone)
    forecast_list = []

    for entry in data["list"][:10]:
        forecast_time = datetime.fromtimestamp(entry["dt"], tz).strftime("%Y-%m-%d %H:%M:%S")
        forecast_list.append({
            "time": forecast_time,
            "temperature": entry["main"]["temp"],
            "humidity": entry["main"]["humidity"],
            "weather": entry["weather"][0]["description"],
            "wind_speed": entry["wind"]["speed"]
        })

    return {
        "city": city_info["city"],
        "timezone": zone,
        "forecast": forecast_list
    }


# SEARCH ENDPOINT — geocode city names
@app.get("/api/search")
def search_city(q: str, limit: int = 5):
    """Search for cities by name using OpenWeatherMap Geocoding API"""
    if not q or len(q) < 2:
        return []

    url = "http://api.openweathermap.org/geo/1.0/direct"
    params = {"q": q, "limit": limit, "appid": API_KEY}

    response = requests.get(url, params=params)
    if response.status_code != 200:
        return []

    results = response.json()
    return [
        {
            "name": r.get("name"),
            "lat": r.get("lat"),
            "lon": r.get("lon"),
            "country": r.get("country"),
            "state": r.get("state", "")
        }
        for r in results
    ]


# WEATHER BY COORDINATES — for searched cities and geolocation
@app.get("/api/weather/coords")
def get_weather_by_coords(lat: float, lon: float, name: str = ""):
    """Fetch current weather by latitude/longitude"""
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "imperial"}

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": data.get("message", "Failed to fetch weather data")}

    city_name = name if name else data.get("name", "Unknown")

    return {
        "city": city_name,
        "country": data.get("sys", {}).get("country", ""),
        "lat": lat,
        "lon": lon,
        "temperature": data["main"]["temp"],
        "feels_like": data["main"].get("feels_like"),
        "humidity": data["main"]["humidity"],
        "pressure": data["main"].get("pressure"),
        "visibility": data.get("visibility"),
        "weather": data["weather"][0]["description"],
        "weather_id": data["weather"][0]["id"],
        "weather_icon": data["weather"][0]["icon"],
        "wind_speed": data["wind"]["speed"],
        "dt": data["dt"],
        "timezone_offset": data.get("timezone", 0),
        "sunrise": data.get("sys", {}).get("sunrise"),
        "sunset": data.get("sys", {}).get("sunset")
    }


# FORECAST BY COORDINATES
@app.get("/api/forecast/coords")
def get_forecast_by_coords(lat: float, lon: float):
    """Fetch 5-day / 3-hour forecast by latitude/longitude"""
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "imperial"}

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": data.get("message", "Failed to fetch forecast data")}

    forecast_list = []
    for entry in data["list"]:
        forecast_list.append({
            "dt": entry["dt"],
            "time": entry["dt_txt"],
            "temperature": entry["main"]["temp"],
            "feels_like": entry["main"].get("feels_like"),
            "humidity": entry["main"]["humidity"],
            "pressure": entry["main"].get("pressure"),
            "weather": entry["weather"][0]["description"],
            "weather_id": entry["weather"][0]["id"],
            "weather_icon": entry["weather"][0]["icon"],
            "wind_speed": entry["wind"]["speed"]
        })

    return {
        "city": data.get("city", {}).get("name", ""),
        "country": data.get("city", {}).get("country", ""),
        "forecast": forecast_list
    }


# Helper: fetch live weather for chat
def get_current_weather_for_chat(zone: str) -> Optional[dict]:
    try:
        if zone not in ZONE_TO_CITY:
            return None

        city_info = ZONE_TO_CITY[zone]
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": city_info["lat"],
            "lon": city_info["lon"],
            "appid": API_KEY,
            "units": "imperial"
        }

        response = requests.get(url, params=params)
        data = response.json()

        if response.status_code != 200:
            return None

        tz = pytz.timezone(zone)
        local_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

        return {
            "city": city_info["city"],
            "timezone": zone,
            "local_time": local_time,
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"]
        }
    except Exception:
        return None


# CHAT ENDPOINT — using Hugging Face Inference API
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """AI-powered chat endpoint using Hugging Face"""
    if not hf_async_client:
        raise HTTPException(status_code=500, detail="AI Chat is not configured. Set HF_API_KEY.")

    try:
        weather_data = get_current_weather_for_chat(request.timezone)

        # Build contextual prompt
        system_msg = "You are SkyPulse AI, a friendly weather assistant. Respond conversationally and briefly."
        user_msg = f'The user asked: "{request.message}"\nCurrent weather context: {weather_data}'

        response = await hf_async_client.chat.completions.create(
            model=HF_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=500
        )

        answer = response.choices[0].message.content

        if not answer or not answer.strip():
            answer = "Sorry, I couldn't generate a response."

        return ChatResponse(response=answer, timestamp=datetime.now().isoformat())

    except Exception as e:
        error_msg = str(e)
        if "403" in error_msg or "permission" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="HF token lacks 'Inference Providers' permission. "
                       "Create a new token at https://huggingface.co/settings/tokens "
                       "with 'Make calls to Inference Providers' enabled."
            )
        raise HTTPException(status_code=500, detail=f"AI Chat error: {error_msg}")


# Health check endpoint
@app.get("/api/chat/health")
def chat_health_check():
    """Health check for Hugging Face AI"""
    if not hf_sync_client:
        return {"status": "unhealthy", "ai_connected": False, "reason": "HF_API_KEY not set"}
    try:
        response = hf_sync_client.chat.completions.create(
            model=HF_MODEL,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=5
        )
        if response.choices:
            return {"status": "healthy", "ai_connected": True}
        return {"status": "unhealthy", "ai_connected": False, "reason": "No response from model"}
    except Exception as e:
        return {"status": "unhealthy", "ai_connected": False, "reason": str(e)}


# Auto-open browser (for local dev only)
def open_browser():
    webbrowser.open("http://127.0.0.1:9000")


if __name__ == "__main__":
    import uvicorn
    threading.Timer(1.0, open_browser).start()
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=False)
