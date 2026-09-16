# SkyPulse v2 — what changed, and where it can go next

This document is the "what can we do with this app" answer, grounded in a September 2026 review of
the free weather-data and LLM landscape and in what hiring managers look for in a full-stack
portfolio project. Section 1 is what the v2 branch already ships. Sections 2–4 are proposals,
ranked by impact-per-effort, with sources.

---

## 1. Shipped in v2 (this branch)

### Backend (FastAPI)
| Area | v1 | v2 |
|---|---|---|
| Structure | one 1,800-line `main.py` | `app/` package: `config` · `routers/` · `services/` · `schemas/` · `cache` · `http` · `security` · `logging` |
| I/O | blocking `requests` inside handlers (chat blocked the event loop) | one shared `httpx.AsyncClient`, `asyncio.gather` for fan-out |
| Caching | 3 ad-hoc caches | single-flight TTL cache per provider (current 5 min, forecast 15 min, geocode 24 h, climatology 24 h, elevation 7 d) |
| Errors | `200 {"error": …}` bodies → `NaN°F` in the UI | typed `UpstreamError` → 502/503/504 with provider-specific `detail` |
| AI | `huggingface_hub` free tier (no longer serves chat) | provider-agnostic OpenAI-compatible client: **Groq**, OpenRouter, HF router, or custom (Ollama) · SSE streaming |
| New endpoints | — | `/api/hourly` (Open-Meteo 48 h), `/api/alerts` (NWS), `/api/briefing` (AI), `/api/chat/stream` (SSE), `/api/health` |
| Bugs fixed | naive server-local timestamps in journey/logistics; chat only knew 7 US cities; chat 422 whenever a journey existed; SPA routes and favicon 404; unhandled exceptions → 500 traces | all timestamps timezone-aware; chat receives the searched city's live conditions; SPA fallback + favicon; global exception handler; request IDs |
| Quality | no tests | 36 pytest tests (respx-mocked upstreams), ruff lint + format, CI |
| Hygiene | leaked OpenWeather key in `DEPLOYMENT.md`, committed `.cache.sqlite`, 2,000+ lines of dead Pinecone/RAG code, deploy workflow mapped the wrong port and passed `OLLAMA_URL` | removed / fixed |

### Frontend (React 19 + Vite)
| Area | v1 | v2 |
|---|---|---|
| Server state | `useEffect` + `setState` (races on rapid search, 23 lint errors) | TanStack Query with `AbortSignal`, keyed by location; 0 lint errors |
| Bundle | one 754 kB chunk, icons from a third-party CDN (render-blocking) | 260 kB app chunk + vendor splits, lazy feature views, self-hosted Font Awesome + Inter, strict same-origin CSP |
| Dark mode | broken whenever a city was loaded (light palette + light text) | fixed (palette + theme on the same element), pre-paint theme script (no flash) |
| Time | forecast times shown in the *viewer's* zone | all times in the *city's* zone via API UTC offsets |
| New UI | — | 48-hour hourly strip with temperature curve + precipitation bars · NWS alerts banner · AI daily briefing · streaming chat with city context and suggestions · shareable URLs · PWA (installable, offline shell, API/tiles runtime cache) · `/` keyboard shortcut · error boundaries |
| A11y | unlabeled icon buttons, `div` tabs, silent toasts, ~2.6:1 muted text | labelled controls, ARIA tabs/combobox/listbox, live regions, 4.5:1+ muted text, `prefers-reduced-motion` honoured by Framer Motion |
| Tests | none | 33 Vitest tests (utils, store, API client incl. SSE, HourlyForecast, SearchBar) |

---

## 2. Next features (highest impact first)

### 2.1 Animated radar loop (US) — *~1 day*
Iowa Environmental Mesonet publishes free NEXRAD mosaic tiles with a 5-minute archive
(`https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913-m{MM}m/{z}/{x}/{y}.png`),
no key. Add a `RadarLayer` to `WeatherMap` with a 60-minute scrubber (12 frames) and play/pause.
RainViewer degraded its free tier on 1 Jan 2026 (no nowcast, zoom ≤ 7), so IEM is the better choice.
Sources: <https://mesonet.agron.iastate.edu/ogc/>, <https://www.rainviewer.com/api/transition-faq.html>

### 2.2 Forecast confidence from ensembles — *~1 day, backend + UI*
Open-Meteo's Ensemble API (GFS 31 members, ICON-EPS, ECMWF ENS) is free and keyless. Compute the
member spread per hour and render a confidence band under the hourly temperature curve
("high confidence" vs "models disagree"). Almost no consumer app does this; it is a memorable
demo of probabilistic thinking. Source: <https://open-meteo.com/en/docs/ensemble-api>

### 2.3 Minute-scale precipitation nowcast — *½ day*
`minutely_15` from Open-Meteo (native for North America via HRRR and Central Europe via ICON-D2).
Show a "rain starts in ~25 min" chip next to the current conditions. Source: <https://open-meteo.com/en/docs>

### 2.4 Alerts outside the US — *½ day*
MeteoAlarm's REST API covers 50+ European countries (CC-BY). Add `services/meteoalarm.py` behind
the same `/api/alerts` contract and pick the source by bounding box. Source: <https://api.meteoalarm.org/>

### 2.5 Compare cities — *1 day*
A "Compare" view with 2–4 cities side by side (temp, feels-like, rain %, wind, AQI, sunrise) and a
per-metric winner. Reuses all existing queries; pure UI work.

### 2.6 Push notifications (PWA) — *1–2 days*
Service worker already exists. Add a `/api/subscriptions` endpoint (VAPID, `pywebpush`) and a
scheduled job that pushes NWS alerts and a morning briefing. Needs a persistent store (SQLite/Postgres).

### 2.7 Widgets & share cards — *½ day*
Generate an Open Graph image for `/?lat=…&lon=…` server-side (Pillow) so shared links unfurl with
the current temperature and icon on Slack/LinkedIn.

---

## 3. Engineering signals that impress reviewers

These are the things that make a reviewer say "this person has shipped production software".
They are ordered by how visible they are from the GitHub landing page.

1. **Green CI badges + coverage** — `ci.yml` now runs ruff/pytest and tsc/eslint/vitest/build on every
   push. Add `codecov` (or `pytest --cov` + `vitest --coverage` artifacts) and the badges to the README.
2. **Lighthouse CI budget** — `treosh/lighthouse-ci-action` with `budget.json` (performance ≥ 90,
   a11y ≥ 95, total JS ≤ 350 kB). Fails the PR when the budget regresses. Note Lighthouse 12 removed the
   PWA category, so verify installability manually.
3. **Accessibility gate** — `@axe-core/playwright` smoke test on the weather view and the journey form.
4. **Typed API contract** — FastAPI already serves `/api/openapi.json`. Generate the TS client with
   `openapi-typescript` in a `npm run api:types` script and replace the hand-written `types/*.ts`.
   Reviewers love a contract that cannot drift.
5. **Observability** — `opentelemetry-instrumentation-fastapi` + Prometheus `/metrics`, with a
   `docker-compose.observability.yml` (Grafana + Tempo + Loki). The request-id middleware is already
   in place, so traces correlate with logs immediately.
6. **Redis for multi-replica** — swap `AsyncTTLCache` and the slowapi storage for Redis behind the same
   interface (documented in `docs/ARCHITECTURE.md`). Then a `docker-compose.yml` with 2 API replicas
   behind Caddy is a convincing "horizontally scalable" story.
7. **Feature flags** — OpenFeature + `flagd` for the AI features (kill switch when a provider's free
   tier is exhausted). Small, but shows operational maturity.
8. **Playwright E2E** — 3 flows: search → hourly strip renders; dark-mode toggle persists; journey plan
   with a mocked `/api/journey`. Run in CI with the mocked backend (`respx` on the server side or
   Playwright route mocks like `scripts/screenshot.mjs`).
9. **uv + lockfile** — `uv lock` for reproducible Python installs; keep `requirements*.txt` as exports.
10. **ADRs** — three are in `docs/adr/`. Keep adding one per significant decision.

---

## 4. Design / UX direction

The v2 design keeps the warm "nature" palette but tightens hierarchy: alerts → hero → AI briefing →
hourly → comfort → details → forecast → map. Next steps that would move it from "nice" to "wow":

* **Glanceable hero**: high/low from the daily model are in; add "feels like" reason ("humid",
  "wind chill") and a one-line "next: rain at 3 PM" summary derived from the hourly data.
* **Temperature-keyed backgrounds**: gradients that shift by temperature as well as condition
  (Mercury Weather does this well).
* **Chart polish**: replace the Chart.js line with the same SVG curve used in the hourly strip for
  visual consistency, add a precipitation bar series and a "now" marker.
* **Motion budget**: the perpetual body-gradient animation and ~30 `backdrop-filter` layers were the
  biggest mobile jank source; both were reduced. Consider `content-visibility: auto` on off-screen
  sections.
* **Journey**: draw the real route geometry (ORS polyline) coloured by segment severity, and show the
  night-driving overlay as a legend item.
* **Empty states with data**: the welcome screen could show live temps for the popular-city tiles
  (one cached `/api/weather/coords` per tile).

---

## 5. Free-tier reality check (Sept 2026)

| Need | Use | Limits |
|---|---|---|
| Current + 5-day | OpenWeatherMap 2.5 (existing) | 60 calls/min, 1M/month, free |
| Hourly 16 d, minutely_15, ensembles, AQ, 80-yr archive | Open-Meteo | ~10k calls/day, no key, CC-BY |
| US alerts | api.weather.gov | free, descriptive `User-Agent` required |
| EU alerts | MeteoAlarm | free, CC-BY |
| US radar tiles | IEM NEXRAD | free |
| LLM | Groq `llama-3.3-70b-versatile` | ~30 RPM / 1,000 RPD free; OpenAI-compatible |
| Routing | OpenRouteService | 2,000 req/day free |

Hugging Face's serverless chat tier is gone in practice ($0.10/month credit), which is why the AI layer
is now provider-agnostic.
