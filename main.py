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

# Initialize Hugging Face clients
hf_client = InferenceClient(api_key=HF_API_KEY) if HF_API_KEY else None
hf_async_client = AsyncInferenceClient(api_key=HF_API_KEY) if HF_API_KEY else None

# Hugging Face model for chat
HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"

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
app = FastAPI(title="US Weather API with AI Chat", version="6.0")

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
        prompt = f"""You are a friendly AI Weather Assistant.
The user asked: "{request.message}"
Current weather context: {weather_data}
Respond conversationally and briefly."""

        response = await hf_async_client.chat.completions.create(
            model=HF_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500
        )

        answer = response.choices[0].message.content

        if not answer or not answer.strip():
            answer = "Sorry, I couldn't generate a response."

        return ChatResponse(response=answer, timestamp=datetime.now().isoformat())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Chat error: {str(e)}")


# Health check endpoint
@app.get("/api/chat/health")
def chat_health_check():
    """Health check for Hugging Face AI"""
    if not hf_client:
        return {"status": "unhealthy", "ai_connected": False, "reason": "HF_API_KEY not set"}
    try:
        response = hf_client.chat.completions.create(
            model=HF_MODEL,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=5
        )
        if response.choices:
            return {"status": "healthy", "ai_connected": True}
    except Exception:
        pass
    return {"status": "unhealthy", "ai_connected": False}


# Auto-open browser (for local dev only)
def open_browser():
    webbrowser.open("http://127.0.0.1:9000")


if __name__ == "__main__":
    import uvicorn
    threading.Timer(1.0, open_browser).start()
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=False)
