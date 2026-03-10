# SkyPulse

**A full-stack weather intelligence platform with AI chat, journey planning, health insights, activity optimization, and interactive maps — built with React 19 + FastAPI.**

SkyPulse goes far beyond a simple weather dashboard. Search any city worldwide and get real-time conditions, 5-day forecasts, comfort scoring, microclimate analysis, weather anomaly detection, health correlations, activity recommendations, logistics optimization, and an AI chat assistant — all wrapped in a polished UI with light and OLED dark modes.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Features in Detail](#features-in-detail)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Weather
- **City Search** — Autocomplete-powered search with geocoding (Nominatim + OpenRouteService fallback)
- **Current Conditions** — Temperature, feels-like, humidity, wind speed/direction, pressure, visibility, dew point
- **5-Day Forecast** — Three viewing modes: scrollable cards, interactive Chart.js graphs, and daily summaries
- **Interactive Map** — Leaflet/OpenStreetMap with toggleable overlay layers (clouds, precipitation, temperature, wind, pressure)
- **Sunrise/Sunset Bar** — Visual progress arc showing the sun's position in its daily cycle
- **Live City Clock** — Real-time ticking clock showing the searched city's local time
- **Pressure Trend** — Rising, falling, or steady barometric pressure indicator
- **Weather Particles** — GPU-accelerated ambient animations (rain, snow, sun orbs, stars, mist) matching conditions
- **Favorites** — Save frequently checked cities for one-click access
- **Unit Toggle** — Switch between Fahrenheit and Celsius

### Intelligence & Analysis
- **Comfort Score** — AI-rated 0-100 outdoor comfort gauge combining temperature, humidity, wind, and visibility with clothing recommendations
- **Weather Anomaly Detection** — Compares current conditions against historical averages and flags unusual patterns
- **Microclimate Analysis** — Elevation, urban heat island, water proximity, and terrain corrections for hyper-local accuracy
- **Air Quality Index** — Real-time AQI data with pollutant breakdown
- **UV Index** — Current UV level with exposure recommendations

### Journey Weather Corridor
- **Route Weather Planning** — Enter origin, destination, and departure time to see weather conditions along your entire driving route
- **Interactive Route Map** — Color-coded route segments by weather severity with night driving detection
- **Waypoint Timeline** — Detailed weather at each waypoint with estimated arrival times
- **Journey Comparison** — Side-by-side metric comparison across all waypoints
- **Sparkline Visualizations** — Mini charts for temperature, wind, and humidity along the route
- **Elevation Data** — Elevation profiles along the route
- **Journey Summary** — Overall route conditions with storm/snow/rain alerts

### Activity Optimizer
- **Activity Recommendations** — AI-powered suggestions for outdoor activities based on current weather
- **Activity Types** — Curated list of activities with weather suitability scoring
- **Smart Scheduling** — Best time-of-day recommendations

### Health Journal
- **Pressure-Weather Correlation** — Tracks barometric pressure trends and their health impacts
- **Symptom Tracking** — Log weather-related symptoms (migraines, joint pain, allergies)
- **Health Alerts** — Proactive warnings based on incoming weather changes

### Logistics Optimizer
- **Delivery Planning** — Weather-aware logistics optimization
- **Route Risk Assessment** — Identifies weather hazards along delivery routes
- **AI Briefings** — Natural language logistics summaries

### AI Chat Assistant
- **Context-Aware Chat** — Powered by Meta's Llama 3.3 70B via Hugging Face Inference API
- **Weather Context Injection** — AI receives current conditions for location-aware responses
- **Journey Context** — Ask questions about planned routes with full journey data context
- **Natural Language Queries** — "Should I bring an umbrella?", "Is it safe to drive tonight?"

### UI/UX
- **OLED Dark Mode** — True black (#000000) background with electric cyan accents (8.3:1 contrast ratio)
- **Light Mode** — Warm navy-blue theme with amber accents
- **Glassmorphism Design** — Frosted glass cards with backdrop blur
- **Framer Motion Animations** — Smooth page transitions, staggered card reveals, and micro-interactions
- **Responsive Design** — Fully responsive from mobile to desktop
- **Welcome Screen** — Quick-access city tiles and feature highlights on first load
- **Toast Notifications** — Non-blocking success/error/info notifications
- **Info Tooltips** — Contextual help throughout the interface
- **Reduced Motion Support** — Respects `prefers-reduced-motion` system setting
- **Accessibility** — Skip-to-content link, ARIA labels, keyboard navigation

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | [React 19](https://react.dev) + [TypeScript](https://typescriptlang.org) | Component-based UI with full type safety |
| **Build Tool** | [Vite 7](https://vitejs.dev) | Lightning-fast HMR and optimized production builds |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | Declarative animations and page transitions |
| **Charts** | [Chart.js](https://www.chartjs.org) + [react-chartjs-2](https://react-chartjs-2.js.org) | Interactive forecast line/bar charts |
| **Maps** | [Leaflet](https://leafletjs.com) + [React Leaflet](https://react-leaflet.js.org) + [OpenStreetMap](https://openstreetmap.org) | Interactive maps with weather tile overlays |
| **Backend** | [Python](https://python.org) + [FastAPI](https://fastapi.tiangolo.com) | High-performance async API server |
| **Weather Data** | [OpenWeatherMap API](https://openweathermap.org/api) | Current weather, forecasts, air quality, UV, map tiles |
| **Geocoding** | [Nominatim](https://nominatim.org) + [OpenRouteService](https://openrouteservice.org) | Address/city search with fallback geocoding |
| **AI** | [Hugging Face Inference API](https://huggingface.co/inference-api) (Llama 3.3 70B) | Context-aware weather chat assistant |
| **Rate Limiting** | [SlowAPI](https://github.com/laurentS/slowapi) | Endpoint-level rate limiting |
| **Caching** | [cachetools](https://github.com/tkem/cachetools) | TTL-based server-side response caching |
| **Icons** | [Font Awesome 6](https://fontawesome.com) | Weather, UI, and utility iconography |
| **Styling** | CSS Modules + Custom Properties | Scoped component styles with theme variables |
| **Deployment** | [Docker](https://docker.com) + [GitHub Actions](https://github.com/features/actions) + [AWS EC2](https://aws.amazon.com/ec2/) | Multi-stage Docker build with automated CI/CD |

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│   React Frontend    │         │    FastAPI Backend    │         │   External APIs      │
│   (Vite Dev / Dist) │         │      (main.py)       │         │                     │
│                     │         │                      │         │                     │
│  SearchBar          │  HTTP   │  /api/weather/coords │  REST   │  OpenWeatherMap     │
│  WeatherHero        │ ──────> │  /api/forecast/coords│ ──────> │  - Weather API      │
│  ComfortScore       │         │  /api/airquality     │         │  - Forecast API     │
│  WeatherDetails     │ <────── │  /api/uv             │ <────── │  - Air Quality API  │
│  ForecastSection    │  JSON   │  /api/anomaly        │  JSON   │  - UV Index API     │
│  WeatherMap         │         │  /api/microclimate   │         │  - Map Tiles API    │
│  JourneySection     │         │  /api/journey        │         │                     │
│  ActivityOptimizer  │         │  /api/activity/*     │         │  Nominatim          │
│  HealthJournal      │         │  /api/health/*       │         │  - Geocoding        │
│  LogisticsOptimizer │         │  /api/logistics/*    │         │                     │
│  ChatPanel          │         │  /api/chat           │         │  OpenRouteService   │
│                     │         │  /api/map-tile/*     │         │  - Routing/Geocode  │
│                     │         │  /api/geocode        │         │                     │
│                     │         │                      │         │  Hugging Face       │
│                     │         │                      │         │  - Llama 3.3 70B    │
└─────────────────────┘         └──────────────────────┘         └─────────────────────┘
```

**Data flow:**
1. User searches a city → frontend calls `/api/geocode` → backend queries Nominatim (falls back to ORS)
2. User selects a result → frontend calls `/api/weather/coords`, `/api/forecast/coords`, `/api/airquality`, `/api/uv`, `/api/anomaly`, `/api/microclimate` in parallel
3. Backend proxies all requests to OpenWeatherMap, caches responses, and returns enriched data
4. Frontend renders all components with Framer Motion transitions
5. Map tile overlays are proxied through `/api/map-tile/{layer}/{z}/{x}/{y}` to keep the API key server-side
6. AI chat sends messages to `/api/chat` → backend injects weather context → Hugging Face returns AI response

---

## Project Structure

```
SkyPulse/
├── main.py                                    # FastAPI backend — all API endpoints, AI chat, security
├── requirements.txt                           # Python dependencies
├── requirements-production.txt                # Production Python dependencies (pinned)
├── Dockerfile                                 # Multi-stage build (Node + Python)
├── docker-compose.yml                         # Docker Compose configuration
├── .env.example                               # Template for environment variables
├── .gitignore                                 # Git ignore rules
│
├── frontend/                                  # React 19 + TypeScript frontend
│   ├── package.json                           # Node dependencies and scripts
│   ├── tsconfig.json                          # TypeScript configuration
│   ├── vite.config.ts                         # Vite build configuration
│   ├── index.html                             # HTML entry point
│   │
│   └── src/
│       ├── App.tsx                            # Root component — view routing and layout
│       ├── main.tsx                           # React entry point
│       │
│       ├── api/                               # API client modules
│       │   ├── client.ts                      # Base HTTP client with error handling
│       │   ├── weather.ts                     # Weather, forecast, air quality, UV endpoints
│       │   ├── activity.ts                    # Activity optimizer endpoints
│       │   ├── anomaly.ts                     # Weather anomaly detection endpoints
│       │   ├── health.ts                      # Health correlation endpoints
│       │   ├── logistics.ts                   # Logistics optimizer endpoints
│       │   └── microclimate.ts                # Microclimate analysis endpoints
│       │
│       ├── components/
│       │   ├── activity/                      # Activity optimizer UI
│       │   │   └── ActivityOptimizer.tsx
│       │   ├── anomaly/                       # Weather anomaly badges
│       │   │   └── AnomalyBadge.tsx
│       │   ├── chat/                          # AI chat panel and toggle
│       │   │   ├── ChatPanel.tsx
│       │   │   └── ChatToggle.tsx
│       │   ├── effects/                       # Visual effects
│       │   │   └── WeatherParticles.tsx       # Ambient weather particle animations
│       │   ├── favorites/                     # Saved cities bar
│       │   │   └── FavoritesBar.tsx
│       │   ├── forecast/                      # Forecast views
│       │   │   ├── ForecastSection.tsx        # Tab container (cards/chart/daily)
│       │   │   ├── ForecastCards.tsx          # Scrollable forecast cards
│       │   │   ├── ForecastChart.tsx          # Chart.js interactive graphs
│       │   │   └── DailyForecast.tsx          # Daily summary view
│       │   ├── health/                        # Health journal UI
│       │   │   └── HealthJournal.tsx
│       │   ├── journey/                       # Journey corridor components
│       │   │   ├── JourneySection.tsx         # Main journey container
│       │   │   ├── JourneyCityInput.tsx       # Origin/destination inputs
│       │   │   ├── JourneyMap.tsx             # Route map with Leaflet
│       │   │   ├── JourneyTimeline.tsx        # Waypoint timeline
│       │   │   ├── JourneyComparison.tsx      # Side-by-side comparison
│       │   │   ├── JourneyDetailCard.tsx      # Waypoint detail cards
│       │   │   ├── JourneySparkline.tsx       # Mini sparkline charts
│       │   │   ├── JourneyFAB.tsx             # Floating action button
│       │   │   └── JourneySummary.tsx         # Route summary
│       │   ├── layout/                        # App shell
│       │   │   ├── AppHeader.tsx              # Navigation header with view tabs
│       │   │   ├── AppFooter.tsx              # Footer
│       │   │   ├── ThemeToggle.tsx            # Dark/light mode toggle
│       │   │   └── SkyPulseLogo.tsx           # Animated logo
│       │   ├── logistics/                     # Logistics optimizer UI
│       │   │   └── LogisticsOptimizer.tsx
│       │   ├── map/                           # Weather map
│       │   │   └── WeatherMap.tsx             # Leaflet map with overlay layers
│       │   ├── microclimate/                  # Microclimate analysis cards
│       │   │   └── MicroclimateCard.tsx
│       │   ├── search/                        # City search
│       │   │   └── SearchBar.tsx              # Autocomplete search with recent history
│       │   ├── ui/                            # Shared UI components
│       │   │   ├── Toast.tsx                  # Toast notification system
│       │   │   └── InfoTooltip.tsx            # Info tooltip component
│       │   └── weather/                       # Core weather display
│       │       ├── WeatherHero.tsx            # Hero card with icon, temp, conditions
│       │       ├── WeatherDetails.tsx         # Detail grid (humidity, wind, pressure, etc.)
│       │       ├── ComfortScore.tsx           # SVG comfort gauge with clothing tips
│       │       └── WelcomeScreen.tsx          # Landing screen with quick city tiles
│       │
│       ├── context/
│       │   ├── WeatherContext.tsx             # Global weather state (React Context)
│       │   └── ThemeContext.tsx               # Theme state (dark/light)
│       │
│       ├── hooks/
│       │   └── useReducedMotion.ts           # Respects prefers-reduced-motion
│       │
│       ├── types/                             # TypeScript type definitions
│       │   ├── weather.ts                     # Weather, forecast, air quality types
│       │   ├── activity.ts                    # Activity types
│       │   ├── anomaly.ts                     # Anomaly types
│       │   ├── health.ts                      # Health types
│       │   ├── logistics.ts                   # Logistics types
│       │   └── microclimate.ts                # Microclimate types
│       │
│       ├── utils/                             # Utility functions
│       │   ├── forecastAggregator.ts          # Aggregates 3-hour data into daily summaries
│       │   ├── weatherIcons.ts                # Maps weather codes to Font Awesome icons
│       │   ├── tempUtils.ts                   # Temperature conversion (F/C)
│       │   └── healthCorrelation.ts           # Health-weather correlation logic
│       │
│       └── styles/                            # CSS Modules
│           ├── variables.css                  # CSS custom properties (themes, colors, spacing)
│           ├── animations.css                 # Keyframe animations
│           ├── aurora.css                     # Aurora background effects
│           └── components/                    # Per-component CSS modules
│               ├── weather-hero.module.css
│               ├── details.module.css
│               ├── comfort.module.css
│               ├── forecast.module.css
│               ├── map.module.css
│               ├── search.module.css
│               ├── header.module.css
│               ├── footer.module.css
│               ├── favorites.module.css
│               ├── chat.module.css
│               ├── particles.module.css
│               ├── journey.module.css
│               ├── activity.module.css
│               ├── health.module.css
│               ├── logistics.module.css
│               ├── anomaly.module.css
│               ├── microclimate.module.css
│               ├── welcome.module.css
│               ├── toast.module.css
│               └── tooltip.module.css
│
└── .github/
    └── workflows/
        └── docker-build.yml                  # CI/CD: build → push → deploy
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/)
- **Python 3.9+** — [Download here](https://python.org/downloads/)
- **OpenWeatherMap API Key** — [Sign up free](https://openweathermap.org/appid)
- **Hugging Face API Key** — [Create a token](https://huggingface.co/settings/tokens) with "Make calls to Inference Providers" permission
- **OpenRouteService API Key** (optional) — [Sign up free](https://openrouteservice.org/dev/#/signup) for journey routing

### 1. Clone the Repository

```bash
git clone https://github.com/rakesh580/Weather_App.git
cd Weather_App
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
OPENWEATHER_API_KEY=your_openweathermap_key
HF_API_KEY=your_huggingface_key
ORS_API_KEY=your_openrouteservice_key
```

### 3. Install & Start the Backend

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
python main.py
```

The backend starts on **http://localhost:9000**.

### 4. Install & Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173** with hot module replacement.

### 5. Open the App

Navigate to **http://localhost:5173** in your browser. The Vite dev server proxies API requests to the FastAPI backend automatically.

---

## API Reference

### Weather Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/geocode?q=London&limit=5` | Search cities by name with autocomplete |
| `GET` | `/api/weather/coords?lat=40.71&lon=-74.00&name=New+York` | Current weather by coordinates |
| `GET` | `/api/forecast/coords?lat=40.71&lon=-74.00` | 5-day / 3-hour forecast |
| `GET` | `/api/airquality?lat=40.71&lon=-74.00` | Air quality index and pollutants |
| `GET` | `/api/uv?lat=40.71&lon=-74.00` | Current UV index |
| `GET` | `/api/anomaly?lat=40.71&lon=-74.00` | Weather anomaly detection (vs. historical) |
| `GET` | `/api/microclimate?lat=40.71&lon=-74.00` | Microclimate corrections (elevation, urban heat, etc.) |
| `GET` | `/api/map-tile/{layer}/{z}/{x}/{y}` | Proxied OpenWeatherMap tile layers |

### Journey Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/journey` | Plan a journey with weather along the route |

**Journey request body:**
```json
{
  "origin_lat": 40.71, "origin_lon": -74.00, "origin_name": "New York",
  "dest_lat": 34.05, "dest_lon": -118.24, "dest_name": "Los Angeles",
  "departure_time": "2025-06-15T08:00:00",
  "avg_speed_mph": 65
}
```

### Activity & Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/activity/types` | List available activity types |
| `GET` | `/api/activity/optimize?lat=...&lon=...` | Get activity recommendations |
| `GET` | `/api/health/pressure-trend?lat=...&lon=...` | Barometric pressure trend and health alerts |

### Logistics Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/logistics/optimize` | Weather-aware logistics optimization |

### AI Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message to the AI assistant |
| `GET` | `/api/chat/health` | Check AI service connectivity |

**Chat request body:**
```json
{
  "message": "Should I bring an umbrella today?",
  "timezone": "America/New_York",
  "journey_context": null
}
```

### Legacy Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/weather?zone=America/New_York` | Weather by US timezone |
| `GET` | `/api/forecast?zone=America/New_York` | Forecast by US timezone |
| `GET` | `/api/search?q=London` | Search cities (legacy) |

---

## Features in Detail

### Comfort Score (0-100)

The comfort score combines four weighted factors into a single number:

| Factor | Weight | Ideal Range | Scoring |
|--------|--------|-------------|---------|
| Temperature | 40% | 68-77°F (20-25°C) | 100 at ideal, drops as temp deviates |
| Humidity | 25% | 30-50% | 100 at ideal, penalizes extremes |
| Wind Speed | 20% | Under 5 mph | 100 if calm, drops with stronger wind |
| Visibility | 15% | Over 10 km | 100 if clear, drops in fog/haze |

**Ranges:** 80-100 Excellent | 60-79 Good | 40-59 Fair | 20-39 Poor | 0-19 Harsh

**Clothing recommendations** are generated based on conditions:

| Condition | Recommendation |
|-----------|---------------|
| Temp < 40°F | Heavy Coat |
| Temp 40-55°F | Jacket |
| Temp 55-68°F | Light Layer |
| Temp > 68°F | T-Shirt |
| Rain / high humidity | Umbrella |
| Clear + warm | Sunglasses |
| Wind > 15 mph | Windbreaker |
| Temp > 85°F | Stay Hydrated |
| Snow | Warm Hat |

### Weather Particles

Ambient background animations match the current weather:

| Weather | Effect |
|---------|--------|
| Rain | Falling rain streaks |
| Drizzle | Light rain drops |
| Snow | Floating, rotating snowflakes |
| Thunderstorm | Fast rain with flash effect |
| Clear (day) | Floating golden sun orbs |
| Clear (night) | Twinkling stars |
| Clouds | Drifting cloud wisps |
| Mist/Fog | Horizontal mist bands |

All particles use CSS `will-change: transform` for GPU acceleration and `pointer-events: none` to never block interaction.

### Dark Mode

Premium OLED dark mode designed for readability and battery savings:

- **Pure black** (#000000) background — saves battery on OLED/AMOLED screens
- **Electric cyan** (#00d4ff) accent — AAA contrast ratio (8.3:1 against black)
- **Opaque cards** (#111111) — no transparency tricks, clear readability
- **Cyan glow** on hover — subtle interactive feedback

### Security

The backend implements several security measures:

- **API key proxying** — OpenWeatherMap and map tile API keys are never exposed to the client
- **Rate limiting** — SlowAPI-based per-IP rate limits on all endpoints
- **Input validation** — Pydantic models with field validators on all request bodies
- **Security headers** — CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **CORS** — Configurable allowed origins (locked down in production)
- **Optional API key auth** — Set `SKYPULSE_API_KEY` to require `X-API-Key` header on cost-incurring endpoints
- **HMAC comparison** — Timing-safe API key comparison
- **Non-root Docker user** — Production container runs as unprivileged `app` user

---

## Docker Deployment

### Run Locally with Docker

```bash
docker build -t skypulse .
docker run -d -p 9000:80 \
  -e OPENWEATHER_API_KEY=your_key \
  -e HF_API_KEY=your_key \
  -e ORS_API_KEY=your_key \
  skypulse
```

Then open **http://localhost:9000**.

The Dockerfile uses a **multi-stage build**:
1. **Stage 1 (Node):** Builds the React frontend with `npm run build`
2. **Stage 2 (Python builder):** Installs Python dependencies
3. **Stage 3 (Runtime):** Copies built assets and dependencies into a slim Python image running as non-root

---

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that automatically:

1. **Builds** a multi-stage Docker image on every push to `main`
2. **Pushes** the image to Docker Hub
3. **Deploys** to an AWS EC2 instance via SSH

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `EC2_HOST` | Public IP or hostname of EC2 instance |
| `EC2_USER` | SSH username (e.g., `ubuntu`) |
| `EC2_SSH_KEY` | Private SSH key for EC2 |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `HF_API_KEY` | Hugging Face API key |
| `ORS_API_KEY` | OpenRouteService API key |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENWEATHER_API_KEY` | Yes | API key from [OpenWeatherMap](https://openweathermap.org/appid) (free tier: 1,000 calls/day) |
| `HF_API_KEY` | Yes (for AI chat) | Hugging Face token from [HF Settings](https://huggingface.co/settings/tokens) with "Inference Providers" permission |
| `ORS_API_KEY` | Optional | [OpenRouteService](https://openrouteservice.org) key for journey routing and fallback geocoding |
| `SKYPULSE_API_KEY` | Optional | Set to require `X-API-Key` header on cost-incurring endpoints |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS origins (defaults to localhost) |

> Without `HF_API_KEY`, everything works except the AI chat. Without `ORS_API_KEY`, journey planning and fallback geocoding are unavailable.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to fetch weather" | Check `OPENWEATHER_API_KEY` in `.env` |
| AI chat says "not configured" | Set `HF_API_KEY` in `.env` |
| AI chat permission error | Create a new HF token with **"Make calls to Inference Providers"** enabled |
| Map marker icon is missing/broken | Fixed in latest version — Leaflet marker icons are properly bundled for Vite |
| Map tile overlays not loading | Verify `OPENWEATHER_API_KEY` is valid; tiles are proxied through the backend |
| Journey planner returns error | Ensure `ORS_API_KEY` is set in `.env` |
| Port 9000 already in use | Kill existing process: `lsof -ti:9000 \| xargs kill` |
| Port 5173 already in use | Vite auto-selects next available port, or kill: `lsof -ti:5173 \| xargs kill` |
| Frontend can't reach backend | Ensure backend is running on port 9000; check Vite proxy config in `vite.config.ts` |
| Docker build fails | Ensure Docker is installed and running; try `docker build --no-cache -t skypulse .` |
| TypeScript errors after pulling | Run `cd frontend && npm install` to update dependencies |

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
