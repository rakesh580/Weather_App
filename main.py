from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
from datetime import datetime
import pytz
import threading, webbrowser
import asyncio
from typing import Optional

# Import AI services
from ai_services import WeatherRAGSystem

# ✅ OpenWeatherMap API key
API_KEY = "f2b2aea1751f9100a4550af87233e111"

# ✅ US Zones with representative cities
ZONE_TO_CITY = {
    "America/New_York": {"lat": 40.7128, "lon": -74.0060, "city": "New York"},
    "America/Chicago": {"lat": 41.8781, "lon": -87.6298, "city": "Chicago"},
    "America/Denver": {"lat": 39.7392, "lon": -104.9903, "city": "Denver"},
    "America/Los_Angeles": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles"},
    "America/Phoenix": {"lat": 33.4484, "lon": -112.0740, "city": "Phoenix"},
    "America/Anchorage": {"lat": 61.2181, "lon": -149.9003, "city": "Anchorage"},
    "Pacific/Honolulu": {"lat": 21.3069, "lon": -157.8583, "city": "Honolulu"},
}

# ✅ Create app
app = FastAPI(title="US Weather API with AI Chat", version="4.0")

# ✅ Initialize AI RAG system
rag_system = WeatherRAGSystem()

# ✅ Pydantic models for API
class ChatRequest(BaseModel):
    message: str
    timezone: Optional[str] = "America/New_York"

class ChatResponse(BaseModel):
    response: str
    timestamp: str

# ✅ Serve static frontend
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_frontend():
    """Serve frontend UI"""
    return FileResponse("static/index.html")


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

    tz = pytz.timezone(zone)
    forecast_list = []

    for entry in data["list"][:10]:  # Limit to next 10 entries (~30 hrs)
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


def get_current_weather_for_chat(zone: str) -> Optional[dict]:
    """Helper function to get weather data for AI chat"""
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
    except:
        return None


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """AI-powered chat endpoint for weather questions"""
    try:
        # Get current weather data for context
        weather_data = get_current_weather_for_chat(request.timezone)
        
        # Generate AI response
        ai_response = await rag_system.answer_question(
            query=request.message,
            weather_data=weather_data
        )
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


@app.get("/api/chat/health")
def chat_health_check():
    """Check if AI services are working"""
    return {
        "status": "operational",
        "services": {
            "claude_ai": bool(rag_system.claude_ai.client),
            "pinecone": bool(rag_system.pinecone_manager.index),
            "embeddings": True
        }
    }


# ✅ Auto-open browser
def open_browser():
    webbrowser.open("http://127.0.0.1:9000")

threading.Timer(1.0, open_browser).start()