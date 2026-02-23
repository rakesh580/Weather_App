# SkyPulse

**A real-time weather application with AI-powered chat, interactive maps, and smart clothing recommendations.**

SkyPulse lets you search any city worldwide and instantly see current conditions, a 5-day forecast, comfort scoring, and more — all in a beautiful interface with light and OLED dark modes.

---

## What Does This App Do?

SkyPulse is a weather dashboard that goes beyond showing temperature. Here's what you get:

- **Search Any City** — Type a city name and get instant weather results from anywhere in the world
- **Current Weather** — Temperature, feels-like, humidity, wind speed, pressure, and visibility
- **AI Chat Assistant** — Ask natural language questions like "Should I bring an umbrella?" and get smart answers
- **Comfort Score** — A 0-100 gauge that tells you how comfortable it is outside, combining temperature, humidity, wind, and visibility into one easy number
- **Clothing Advisor** — Smart suggestions like "Bring an Umbrella", "Wear a Jacket", or "Stay Hydrated" based on conditions
- **5-Day Forecast** — Three viewing modes: scrollable cards, interactive charts, and daily summaries
- **Interactive Map** — See the searched city on a live map powered by Leaflet/OpenStreetMap
- **Sunrise/Sunset Bar** — Visual progress bar showing where the sun is in its daily arc
- **Live City Clock** — Ticking clock showing the local time at the searched city
- **Pressure Trend** — Shows whether barometric pressure is Rising, Falling, or Steady
- **Weather Particles** — Ambient background animations (rain drops, snowflakes, sun orbs) matching current conditions
- **Favorites** — Save cities you check often for one-click access
- **Dark/Light Mode** — Toggle between a rich navy-blue light theme and a premium OLED-black dark theme

---

## Tech Stack

This section explains the technologies used and why each one was chosen.

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| **Backend** | [Python](https://python.org) + [FastAPI](https://fastapi.tiangolo.com) | Handles all server-side logic — fetching weather data, processing API calls, and serving the frontend. FastAPI is a modern Python web framework that's fast and easy to work with. |
| **Weather Data** | [OpenWeatherMap API](https://openweathermap.org/api) | Provides real-time weather data, 5-day forecasts, and city geocoding (converting city names to coordinates). Free tier supports up to 1,000 API calls per day. |
| **AI Chat** | [Hugging Face Inference API](https://huggingface.co/inference-api) | Powers the SkyPulse AI chat using Meta's Llama 3.3 70B model. The AI receives current weather context so it can give relevant, location-aware responses. |
| **Frontend** | HTML, CSS, JavaScript (vanilla) | No frontend framework needed — the UI is built with plain HTML/CSS/JS for simplicity and fast load times. |
| **Charts** | [Chart.js](https://www.chartjs.org) | Renders interactive line charts for temperature, wind speed, and humidity forecasts. |
| **Maps** | [Leaflet.js](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org) | Displays an interactive map that zooms to the searched city with a marker and popup. |
| **Icons** | [Font Awesome 6](https://fontawesome.com) | Provides all the weather, UI, and utility icons throughout the app. |
| **Styling** | [Bootstrap 5](https://getbootstrap.com) (grid only) + Custom CSS | Bootstrap provides the responsive grid. All visual styling (glassmorphism, OLED dark mode, animations) is custom CSS. |
| **Deployment** | [Docker](https://www.docker.com) + [GitHub Actions](https://github.com/features/actions) + [AWS EC2](https://aws.amazon.com/ec2/) | Automated CI/CD pipeline: push to `main` triggers a Docker build, pushes to Docker Hub, and deploys to an EC2 instance via SSH. |

---

## Project Structure

```
SkyPulse/
├── main.py                          # FastAPI backend (all API endpoints + AI chat)
├── requirements.txt                 # Python dependencies
├── requirements-production.txt      # Production Python dependencies
├── Dockerfile                       # Multi-stage Docker build
├── .env                             # API keys (not committed — see Setup)
├── .gitignore                       # Keeps secrets and build files out of git
├── static/
│   ├── index.html                   # Single-page frontend (all HTML)
│   ├── css/
│   │   └── style.css                # All styling (themes, animations, components)
│   └── js/
│       ├── app.js                   # Main application logic (weather, search, favorites, chat, etc.)
│       └── charts.js                # Chart.js configuration (multi-tab forecast charts)
└── .github/
    └── workflows/
        └── docker-build.yml         # CI/CD pipeline (build → push → deploy)
```

---

## How It Works (Architecture Overview)

Here's how data flows through the application:

```
User's Browser                     FastAPI Server                   External APIs
┌─────────────┐                   ┌──────────────┐                ┌─────────────────┐
│             │  1. Search city   │              │  2. Geocode    │                 │
│  index.html │ ───────────────>  │   main.py    │ ─────────────> │ OpenWeatherMap  │
│  app.js     │                   │              │                │   Geocoding API │
│  charts.js  │  4. Render UI     │  /api/search │  3. Results    │                 │
│  style.css  │ <───────────────  │  /api/weather│ <───────────── │   Weather API   │
│             │                   │  /api/forecast                │   Forecast API  │
│             │  5. Ask AI        │  /api/chat   │  6. LLM call   │                 │
│             │ ───────────────>  │              │ ─────────────> │  Hugging Face   │
│             │  8. Show answer   │              │  7. Response   │  Inference API  │
│             │ <───────────────  │              │ <───────────── │  (Llama 3.3)    │
└─────────────┘                   └──────────────┘                └─────────────────┘
```

**Step by step:**
1. You type a city name in the search bar
2. The frontend sends a request to the FastAPI backend
3. The backend calls OpenWeatherMap to get coordinates, current weather, and a 5-day forecast
4. The data is sent back to the browser, which renders the weather hero, details grid, forecast cards/charts, comfort score, map, sun bar, and particles
5. If you open the AI chat and ask a question, it's sent to the `/api/chat` endpoint
6. The backend forwards your question (along with current weather context) to Meta's Llama 3.3 model via Hugging Face
7. The AI generates a contextual response
8. The answer appears in the chat window

---

## Setup & Installation

### Prerequisites

- **Python 3.9+** — [Download here](https://www.python.org/downloads/)
- **OpenWeatherMap API Key** — [Sign up free](https://openweathermap.org/appid) (takes 2 minutes)
- **Hugging Face API Key** — [Create a token](https://huggingface.co/settings/tokens) with "Make calls to Inference Providers" permission enabled

### 1. Clone the Repository

```bash
git clone https://github.com/rakesh580/Weather_App.git
cd Weather_App
```

### 2. Create a Virtual Environment (recommended)

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `fastapi` — Web framework for the backend
- `uvicorn` — ASGI server to run FastAPI
- `requests` — HTTP client for calling weather APIs
- `pytz` — Timezone handling
- `python-dotenv` — Loads API keys from `.env` file
- `huggingface_hub` — Hugging Face client for AI chat
- `aiohttp` — Async HTTP (required by Hugging Face async client)

### 4. Set Up API Keys

Create a `.env` file in the project root:

```bash
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
HF_API_KEY=your_huggingface_api_key_here
```

> **Important:** The `.env` file is in `.gitignore` and will never be committed to GitHub. Your keys stay private.

### 5. Run the Application

```bash
python main.py
```

The app will start on **http://localhost:9000** and automatically open in your browser.

---

## Docker Deployment

### Run Locally with Docker

```bash
docker build -t skypulse .
docker run -d -p 9000:80 \
  -e OPENWEATHER_API_KEY=your_key \
  -e HF_API_KEY=your_key \
  skypulse
```

Then open **http://localhost:9000**.

### CI/CD Pipeline (Automated Deployment)

The project includes a GitHub Actions workflow that automatically:

1. **Builds** a Docker image on every push to `main`
2. **Pushes** the image to Docker Hub
3. **Deploys** to an AWS EC2 instance via SSH

To use this, add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub password or access token |
| `EC2_HOST` | Public IP or hostname of your EC2 instance |
| `EC2_USER` | SSH username (usually `ubuntu` or `ec2-user`) |
| `EC2_SSH_KEY` | Your private SSH key for the EC2 instance |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `HF_API_KEY` | Hugging Face API key |

---

## API Endpoints

SkyPulse exposes a RESTful API. You can use these endpoints directly if you want to integrate with other tools.

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| `GET` | `/api/search?q=London` | Search cities by name | Returns list of matching cities with coordinates |
| `GET` | `/api/weather/coords?lat=40.71&lon=-74.00` | Current weather by coordinates | Temperature, humidity, wind, pressure, sunrise/sunset |
| `GET` | `/api/forecast/coords?lat=40.71&lon=-74.00` | 5-day / 3-hour forecast | 40 forecast entries with temp, humidity, pressure, wind |
| `POST` | `/api/chat` | AI chat (send JSON body) | `{"message": "Will it rain today?", "timezone": "America/New_York"}` |
| `GET` | `/api/chat/health` | AI health check | Returns `{"status": "healthy", "ai_connected": true}` |
| `GET` | `/api/weather?zone=America/New_York` | Weather by US timezone | Quick lookup for major US cities |
| `GET` | `/api/forecast?zone=America/New_York` | Forecast by US timezone | 10-entry forecast for major US cities |

---

## Features in Detail

### Comfort Score (0-100)

The comfort score combines four factors into a single number:

| Factor | Weight | Ideal Range | How It's Scored |
|--------|--------|-------------|-----------------|
| Temperature | 40% | 68-77°F | 100 at ideal, drops as temp moves away |
| Humidity | 25% | 30-50% | 100 at ideal, penalizes extremes |
| Wind Speed | 20% | Under 5 mph | 100 if calm, drops with stronger wind |
| Visibility | 15% | Over 10 km | 100 if clear, drops in fog/haze |

**Score meanings:**
- **80-100 (Green)** — Excellent: Perfect weather to be outside
- **60-79 (Yellow)** — Good: Comfortable with minor considerations
- **40-59 (Orange)** — Fair: Noticeable discomfort, prepare accordingly
- **20-39 (Red)** — Poor: Unpleasant conditions
- **0-19 (Red)** — Harsh: Stay indoors if possible

### Clothing Advisor

Based on current conditions, SkyPulse suggests what to wear:

| Condition | Suggestion |
|-----------|------------|
| Temp below 40°F | Heavy Coat |
| Temp 40-55°F | Jacket |
| Temp 55-68°F | Light Layer |
| Temp above 68°F | T-Shirt |
| Rain or high humidity | Umbrella |
| Clear sky + warm | Sunglasses |
| Wind above 15 mph | Windbreaker |
| Temp above 85°F | Hydrate |
| Snow | Warm Hat |
| Low visibility | Low Visibility Warning |

### Dark Mode

SkyPulse features a premium OLED dark mode designed for readability and battery savings:

- **Pure black** (`#000000`) background — true OLED black saves battery on OLED/AMOLED screens
- **Electric cyan** (`#00d4ff`) accent color — AAA contrast (8.3:1 against black)
- **Opaque cards** (`#111111`) — clearly visible, no transparency tricks
- **Cyan glow** on hover — subtle interactive feedback

### Weather Particles

Background animations match the current weather:

| Weather | Particle Effect |
|---------|----------------|
| Rain | Falling rain streaks |
| Drizzle | Light rain drops |
| Snow | Floating, rotating snowflakes |
| Thunderstorm | Fast rain with flash effect |
| Clear (day) | Floating golden sun orbs |
| Clear (night) | Twinkling stars |
| Clouds | Drifting cloud wisps |
| Mist/Fog | Horizontal mist bands |

All particles use CSS animations with `will-change: transform` for GPU acceleration and `pointer-events: none` so they never block clicks.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENWEATHER_API_KEY` | Yes | Free API key from [OpenWeatherMap](https://openweathermap.org/appid) |
| `HF_API_KEY` | Yes (for AI chat) | Hugging Face token with "Inference Providers" permission from [HF Settings](https://huggingface.co/settings/tokens) |

> Without `HF_API_KEY`, everything works except the AI chat feature.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App shows "Failed to fetch weather" | Check that `OPENWEATHER_API_KEY` is set correctly in `.env` |
| AI chat says "AI Chat is not configured" | Set `HF_API_KEY` in `.env` |
| AI chat returns permission error | Create a new HF token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with **"Make calls to Inference Providers"** enabled |
| Port 9000 already in use | Another process is using port 9000. Stop it with `lsof -ti:9000 \| xargs kill -9` or change the port in `main.py` |
| Map tiles not loading | Check your internet connection. Leaflet loads tiles from OpenStreetMap CDN. |
| Docker build fails | Ensure Docker is installed and running. Try `docker build --no-cache -t skypulse .` |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is open source and available for personal and educational use.

---

**Built by [Rakesh Chintanippu](https://github.com/rakesh580)**
