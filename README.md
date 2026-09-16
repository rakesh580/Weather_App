# SkyPulse

**Weather intelligence, full-stack.** Live conditions, a 48-hour hourly strip, 5-day forecasts,
severe-weather alerts, 30-year climate context, route weather for road trips, activity and
logistics planning, and a streaming AI assistant — React 19 + TypeScript on the front,
async FastAPI on the back, one container to deploy.

[![CI](https://github.com/rakesh580/Weather_App/actions/workflows/ci.yml/badge.svg?branch=v2)](https://github.com/rakesh580/Weather_App/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)

> **v2 branch.** `main` is the stable v1 line; this branch is the v2 rewrite. See
> [`docs/V2_ROADMAP.md`](docs/V2_ROADMAP.md) for what changed and what's next, and
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system design.

---

## Features

**Core weather**
- City / address search with keyboard navigation and recent searches; "use my location"; shareable URLs (`/?lat=…&lon=…&name=…`)
- Current conditions with live city clock, sunrise/sunset arc, high/low, feels-like, humidity, wind (direction + gusts), pressure tendency, visibility, UV, air quality
- **48-hour hourly strip** — temperature curve + precipitation-probability bars, day/night shading, rendered in the city's own timezone (Open-Meteo)
- 5-day forecast as cards, chart (temp / wind / humidity / rain %), or daily summary with temperature range bars
- **Severe weather alerts** banner (US National Weather Service) with expandable instructions
- Interactive map with OpenWeatherMap overlay layers (clouds, rain, temperature, wind, pressure) proxied server-side
- Weather-adaptive palettes, light and dark themes, ambient particle effects (respects reduced motion)

**Intelligence**
- **AI daily briefing** and **streaming AI chat** that knows the city you're looking at and your planned route (Groq / OpenRouter / Hugging Face / any OpenAI-compatible endpoint)
- Comfort score (0–100) with clothing suggestions
- Climate anomaly: today vs. the 30-year average for this date, percentile, records, decade trend
- Microclimate estimate: elevation lapse rate, urban heat island, water proximity, slope aspect
- Journey Weather Corridor: time-shifted forecasts along a driving route, night-driving detection, departure-time comparison
- Activity optimizer: scores every 3-hour window for running, cycling, photography, BBQ, stargazing…
- Logistics optimizer: best visit order for up to 8 stops to minimise weather exposure
- Health journal: symptom log with pressure-trend correlation (stored locally in the browser)

**Platform**
- Installable **PWA** with offline app shell and runtime caching of API responses and map tiles
- Strict same-origin CSP, self-hosted fonts and icons, rate limiting, optional API-key gate for AI endpoints
- Request IDs, structured JSON logs, `/api/health` with provider status and cache stats, OpenAPI docs at `/api/docs`
- 36 backend tests (pytest + respx) · 33 frontend tests (Vitest + Testing Library) · ruff, tsc, eslint · GitHub Actions CI · Docker

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19, TypeScript 5.9, Vite 7, CSS Modules | strict types, fast builds, scoped styles |
| Server state | TanStack Query 5 | caching, cancellation, stale-while-revalidate, no fetch races |
| Motion / charts / maps | Framer Motion, Chart.js, Leaflet | all lazy-loaded chunks |
| API | FastAPI, Pydantic v2, httpx (async), slowapi, cachetools | one shared async client, single-flight TTL caches |
| Data | OpenWeatherMap 2.5 · Open-Meteo (hourly, climatology, elevation) · NWS alerts · Nominatim / OpenRouteService · Overpass | free tiers, keyless where possible |
| AI | OpenAI-compatible chat completions (Groq recommended) with SSE streaming | provider-agnostic, swappable by env var |
| Quality | pytest, respx, ruff · Vitest, Testing Library, ESLint (React Compiler rules) · GitHub Actions | |
| Delivery | multi-stage Dockerfile (Node 22 → Python 3.12 slim), Render blueprint, EC2 deploy workflow | |

---

## Quick start

```bash
git clone https://github.com/rakesh580/Weather_App.git && cd Weather_App
cp .env.example .env            # add OPENWEATHER_API_KEY (and GROQ_API_KEY for AI)

# backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 9000

# frontend (second terminal)
cd frontend && npm ci && npm run dev     # http://localhost:5173 (proxies /api → :9000)
```

Production build served by FastAPI:

```bash
cd frontend && npm run build && cd ..
uvicorn app.main:app --host 0.0.0.0 --port 9000      # http://localhost:9000
```

Or just `docker build -t skypulse . && docker run -p 80:80 --env-file .env skypulse`.

---

## Project structure

```
app/                      FastAPI application
├── main.py               app factory, lifespan (httpx client), middleware, SPA fallback
├── config.py             pydantic-settings (env / .env)
├── cache.py              AsyncTTLCache with single-flight get_or_fetch
├── http.py               shared AsyncClient + UpstreamError → HTTP mapping
├── security.py           CSP / security headers, X-API-Key guard
├── logging.py            request-id middleware, JSON logs
├── routers/              weather · tiles · anomaly · microclimate · activity · health · logistics · journey · chat · system
├── services/             owm · open_meteo · nws · ors · overpass · ai · geo · scoring
└── schemas/              request models
tests/                    pytest suite (respx-mocked upstreams)
frontend/src/
├── api/                  typed fetch client (AbortSignal, SSE, error mapping) + per-domain modules
├── context/              ThemeProvider, WeatherProvider (location + TanStack queries), Toast
├── components/           weather · hourly · alerts · briefing · forecast · map · journey · activity · health · logistics · chat · ui
├── hooks/  store/  utils/  time (city-timezone helpers) · units · urlState · wmoCodes · favorites store
├── styles/               design tokens (variables.css), weather palettes, CSS modules
└── test/                 Vitest setup
docs/                     ARCHITECTURE.md · V2_ROADMAP.md · adr/
scripts/screenshot.mjs    Playwright script that renders every view with mocked data
```

---

## API

Interactive docs: `/api/docs` (Swagger) · `/api/redoc` · `/api/openapi.json`

| Endpoint | Description |
|---|---|
| `GET /api/health` | liveness, version, configured providers, cache stats |
| `GET /api/search?q=` · `GET /api/geocode?q=` | city search (OWM) · address geocoding (Nominatim → ORS) |
| `GET /api/weather/coords?lat&lon[&name]` | current conditions |
| `GET /api/forecast/coords?lat&lon` | 5-day / 3-hour forecast (+ city UTC offset) |
| `GET /api/hourly?lat&lon[&hours=48]` | hourly forecast with precipitation probability, UV, gusts, day/night (Open-Meteo) |
| `GET /api/alerts?lat&lon` | active NWS alerts, sorted by severity (US) |
| `GET /api/airquality` · `GET /api/uv` | air quality index · UV index (measured, else solar estimate) |
| `GET /api/anomaly?lat&lon` | today vs. 30-year climatology |
| `GET /api/microclimate?lat&lon` | local temperature corrections |
| `GET /api/activity/types` · `GET /api/activity/optimize?lat&lon&activity` | activity window scoring |
| `GET /api/health/pressure-trend?lat&lon` | 48-hour pressure deltas |
| `POST /api/journey` | route weather corridor |
| `POST /api/logistics/optimize` | multi-stop ordering |
| `POST /api/chat` · `POST /api/chat/stream` | AI chat (JSON · Server-Sent Events) |
| `GET /api/briefing?lat&lon[&name]` | AI daily briefing (cached 30 min) |
| `GET /api/map-tile/{layer}/{z}/{x}/{y}` | OWM tile proxy |

Errors are JSON `{"detail": "…"}` with meaningful status codes (`422` validation, `429` rate limit,
`502/503/504` upstream). Every response carries `X-Request-ID`.

---

## Configuration

All settings are environment variables (see [`.env.example`](.env.example)). The important ones:

| Variable | Default | Notes |
|---|---|---|
| `OPENWEATHER_API_KEY` | — | required |
| `AI_PROVIDER` | `auto` | `groq` · `openrouter` · `huggingface` · `custom`; `auto` picks the first configured key |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `HF_API_KEY` | — | any one enables chat + briefing |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | — | custom OpenAI-compatible endpoint (e.g. Ollama) |
| `ORS_API_KEY` | — | real driving routes; without it journeys use straight-line estimates |
| `SKYPULSE_API_KEY` | — | if set, AI endpoints require `X-API-Key` (frontend: `VITE_SKYPULSE_API_KEY`) |
| `ALLOWED_ORIGINS` | localhost | comma-separated CORS origins |
| `LOG_JSON` | `false` | JSON logs for production |

---

## Testing & quality

```bash
# backend
ruff check app tests main.py && ruff format --check app tests main.py
pytest                              # 36 tests, no network needed

# frontend
cd frontend
npm run typecheck && npm run lint
npm test -- --run                   # 33 tests
npm run build                       # bundle report

# visual check (optional; needs Playwright)
node scripts/screenshot.mjs         # renders every view with mocked data into ./screenshots
```

CI (`.github/workflows/ci.yml`) runs all of the above plus a Docker image build on every push.

---

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) — Docker, Render (`render.yaml`), and the EC2 workflow.

---

## Roadmap

The research-backed list of next steps (animated radar, ensemble confidence bands, minute
nowcasts, EU alerts, city comparison, push notifications, Lighthouse/axe CI gates, OpenAPI-generated
client, OpenTelemetry, Redis for multi-replica) lives in [`docs/V2_ROADMAP.md`](docs/V2_ROADMAP.md).

---

## License

MIT
