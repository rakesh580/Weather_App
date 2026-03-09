import os, math
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pytz, threading, webbrowser
from datetime import datetime, timedelta
from typing import Optional, List
import requests
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from huggingface_hub import InferenceClient, AsyncInferenceClient

# Load environment variables from .env
load_dotenv()

# API keys from environment
API_KEY = os.getenv("OPENWEATHER_API_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")
ORS_API_KEY = os.getenv("ORS_API_KEY")

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
    journey_context: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str

class JourneyRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    origin_name: Optional[str] = ""
    dest_lat: float
    dest_lon: float
    dest_name: Optional[str] = ""
    departure_time: str  # ISO 8601
    avg_speed_mph: Optional[float] = 60.0

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


# ===== JOURNEY WEATHER CORRIDOR =====

def haversine(lat1, lon1, lat2, lon2):
    """Distance in km between two lat/lon points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def sample_waypoints(coords, interval_km=128):
    """Sample waypoints along a route at regular distance intervals."""
    waypoints = [coords[0]]
    accumulated = 0.0
    for i in range(1, len(coords)):
        d = haversine(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
        accumulated += d
        if accumulated >= interval_km:
            waypoints.append(coords[i])
            accumulated = 0.0
    # Always include destination
    if waypoints[-1] != coords[-1]:
        waypoints.append(coords[-1])
    return waypoints


def interpolate_waypoints(lat1, lon1, lat2, lon2, interval_km=128):
    """Fallback: generate waypoints along a straight line (no routing API)."""
    total = haversine(lat1, lon1, lat2, lon2)
    n = max(2, int(total / interval_km) + 1)
    points = []
    for i in range(n + 1):
        frac = i / n
        lat = lat1 + (lat2 - lat1) * frac
        lon = lon1 + (lon2 - lon1) * frac
        points.append([lat, lon])
    return points


def classify_weather(weather_id):
    """Classify weather severity and assign color."""
    if weather_id >= 200 and weather_id < 300:
        return "storm", "#ef4444"
    elif weather_id >= 300 and weather_id < 600:
        return "rain", "#f59e0b"
    elif weather_id >= 600 and weather_id < 700:
        return "snow", "#f97316"
    elif weather_id >= 700 and weather_id < 800:
        return "fog", "#f97316"
    elif weather_id == 800:
        return "clear", "#22c55e"
    else:
        return "clouds", "#22c55e"


def find_closest_forecast(forecast_list, target_ts):
    """Find the forecast entry closest to a target Unix timestamp."""
    closest = min(forecast_list, key=lambda e: abs(e["dt"] - target_ts))
    gap = abs(closest["dt"] - target_ts)
    return closest, gap < 5400  # reliable if within 1.5 hours


def fetch_waypoint_forecast(lat, lon):
    """Fetch forecast for a single waypoint."""
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "imperial"}
    response = requests.get(url, params=params, timeout=10)
    if response.status_code == 200:
        return response.json().get("list", [])
    return []


def reverse_geocode(lat, lon):
    """Get city name from coordinates."""
    try:
        url = "http://api.openweathermap.org/geo/1.0/reverse"
        params = {"lat": lat, "lon": lon, "limit": 1, "appid": API_KEY}
        r = requests.get(url, params=params, timeout=5)
        if r.status_code == 200 and r.json():
            return r.json()[0].get("name", "Waypoint")
    except Exception:
        pass
    return "Waypoint"


@app.post("/api/journey")
def plan_journey(req: JourneyRequest):
    """Plan a journey and get weather forecasts along the route."""
    if not API_KEY:
        return {"error": "OpenWeatherMap API key not configured"}

    departure_dt = datetime.fromisoformat(req.departure_time)
    departure_ts = departure_dt.timestamp()

    # Step 1: Get route from OpenRouteService (or fallback to straight line)
    route_coords = []
    total_distance_m = 0
    total_duration_s = 0
    used_ors = False

    if ORS_API_KEY:
        try:
            ors_url = "https://api.openrouteservice.org/v2/directions/driving-car"
            ors_params = {
                "api_key": ORS_API_KEY,
                "start": f"{req.origin_lon},{req.origin_lat}",
                "end": f"{req.dest_lon},{req.dest_lat}"
            }
            ors_resp = requests.get(ors_url, params=ors_params, timeout=10)
            if ors_resp.status_code == 200:
                ors_data = ors_resp.json()
                feature = ors_data["features"][0]
                # ORS returns [lon, lat] — convert to [lat, lon]
                raw_coords = feature["geometry"]["coordinates"]
                route_coords = [[c[1], c[0]] for c in raw_coords]
                total_distance_m = feature["properties"]["summary"]["distance"]
                total_duration_s = feature["properties"]["summary"]["duration"]
                used_ors = True
        except Exception:
            pass

    # Fallback: straight-line interpolation
    if not route_coords:
        total_distance_m = haversine(req.origin_lat, req.origin_lon, req.dest_lat, req.dest_lon) * 1000
        total_duration_s = (total_distance_m / 1609.34) / req.avg_speed_mph * 3600
        route_coords = interpolate_waypoints(req.origin_lat, req.origin_lon, req.dest_lat, req.dest_lon)

    total_distance_miles = total_distance_m / 1609.34
    total_duration_hours = total_duration_s / 3600

    # Step 2: Sample waypoints
    if used_ors and len(route_coords) > 2:
        wp_coords = sample_waypoints(route_coords, interval_km=128)
    else:
        wp_coords = route_coords

    # Step 3: Calculate arrival time + fetch forecasts for each waypoint
    # Compute cumulative distances for timing
    total_route_dist = 0
    cum_distances = [0]
    for i in range(1, len(route_coords)):
        total_route_dist += haversine(route_coords[i - 1][0], route_coords[i - 1][1],
                                       route_coords[i][0], route_coords[i][1])
        cum_distances.append(total_route_dist)

    # Map each waypoint to cumulative distance along the route
    def waypoint_cum_dist(wp):
        # Find closest route point
        min_d = float('inf')
        best_cum = 0
        for j, rc in enumerate(route_coords):
            d = haversine(wp[0], wp[1], rc[0], rc[1])
            if d < min_d:
                min_d = d
                best_cum = cum_distances[j]
        return best_cum

    # Fetch forecasts in parallel
    with ThreadPoolExecutor(max_workers=8) as executor:
        forecast_futures = {i: executor.submit(fetch_waypoint_forecast, wp[0], wp[1])
                           for i, wp in enumerate(wp_coords)}
        wp_forecasts = {i: f.result() for i, f in forecast_futures.items()}

    # Reverse geocode waypoints (origin/dest use provided names, others get geocoded)
    waypoints = []
    for i, wp in enumerate(wp_coords):
        # Calculate arrival time
        wp_dist = waypoint_cum_dist(wp)
        if total_route_dist > 0:
            frac = wp_dist / total_route_dist
        else:
            frac = i / max(1, len(wp_coords) - 1)
        arrival_ts = departure_ts + frac * total_duration_s
        arrival_dt = datetime.fromtimestamp(arrival_ts)

        # Determine name
        if i == 0:
            name = req.origin_name or reverse_geocode(wp[0], wp[1])
        elif i == len(wp_coords) - 1:
            name = req.dest_name or reverse_geocode(wp[0], wp[1])
        else:
            name = reverse_geocode(wp[0], wp[1])

        # Match forecast
        fc_list = wp_forecasts.get(i, [])
        if fc_list:
            fc_entry, reliable = find_closest_forecast(fc_list, int(arrival_ts))
            weather = {
                "temperature": fc_entry["main"]["temp"],
                "humidity": fc_entry["main"]["humidity"],
                "wind_speed": fc_entry["wind"]["speed"],
                "description": fc_entry["weather"][0]["description"],
                "weather_id": fc_entry["weather"][0]["id"],
                "weather_icon": fc_entry["weather"][0].get("icon", "01d")
            }
            severity, color = classify_weather(fc_entry["weather"][0]["id"])
        else:
            weather = {"temperature": 0, "humidity": 0, "wind_speed": 0,
                       "description": "no data", "weather_id": 800, "weather_icon": "01d"}
            severity, color = "unknown", "#9ca3af"

        waypoints.append({
            "lat": wp[0],
            "lon": wp[1],
            "name": name,
            "distance_from_origin_miles": round(wp_dist * 0.621371, 1),
            "estimated_arrival": arrival_dt.isoformat(),
            "weather": weather,
            "severity": severity,
            "color": color
        })

    # Step 4: Build segments between consecutive waypoints
    segments = []
    for i in range(len(waypoints) - 1):
        wp_a = waypoints[i]
        wp_b = waypoints[i + 1]
        # Use worst severity between the two waypoints
        severity_rank = {"clear": 0, "clouds": 0, "unknown": 1, "fog": 2, "rain": 3, "snow": 4, "storm": 5}
        worst = wp_a if severity_rank.get(wp_a["severity"], 0) >= severity_rank.get(wp_b["severity"], 0) else wp_b
        # Get route coords between these two waypoints
        seg_coords = [[wp_a["lat"], wp_a["lon"]], [wp_b["lat"], wp_b["lon"]]]
        segments.append({
            "coords": seg_coords,
            "color": worst["color"],
            "severity": worst["severity"]
        })

    return {
        "route_coords": route_coords,
        "total_distance_miles": round(total_distance_miles, 1),
        "total_duration_hours": round(total_duration_hours, 1),
        "waypoints": waypoints,
        "segments": segments,
        "used_real_route": used_ors
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
        journey_info = ""
        if request.journey_context:
            journey_info = f"\nJourney weather corridor data: {request.journey_context}"
        user_msg = f'The user asked: "{request.message}"\nCurrent weather context: {weather_data}{journey_info}'

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
