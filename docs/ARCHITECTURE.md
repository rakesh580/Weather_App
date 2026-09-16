# SkyPulse architecture

```
┌──────────────────────────────┐        ┌──────────────────────────────────┐        ┌─────────────────────────┐
│  React 19 SPA (Vite, PWA)    │        │  FastAPI (app/)                  │        │  Upstream providers      │
│                              │  JSON  │                                  │ httpx  │                         │
│  TanStack Query cache ───────┼───────▶│  routers/   thin HTTP handlers   │───────▶│ OpenWeatherMap 2.5      │
│  WeatherContext (location)   │  SSE   │  services/  provider clients +   │        │ Open-Meteo (keyless)    │
│  code-split feature views    │◀───────│             single-flight TTL    │◀───────│ NWS api.weather.gov     │
│  service worker (workbox)    │        │             caches               │        │ Nominatim / ORS         │
│                              │        │  schemas/   pydantic v2 models   │        │ Overpass (OSM)          │
│                              │        │  cache.py · http.py · config.py  │        │ Groq / OpenRouter / HF  │
└──────────────────────────────┘        └──────────────────────────────────┘        └─────────────────────────┘
```

## Request path

1. The browser only ever talks to `/api/*` on the same origin. API keys never leave the server.
2. Every route handler is `async`. Upstream calls go through one shared `httpx.AsyncClient`
   (created in the FastAPI lifespan) with connection pooling and per-request timeouts.
3. `services/*` own the provider contracts. Each hot path (current, forecast, hourly, alerts,
   geocode, climatology, elevation, land use) sits behind an `AsyncTTLCache` with
   single-flight semantics: concurrent requests for the same key trigger one upstream call.
4. Upstream failures raise `UpstreamError`, which the app maps to `502/503/504` with a
   provider-specific message. The frontend surfaces `detail` in a toast instead of rendering `NaN`.
5. Responses carry `X-Request-ID` and `Server-Timing`; logs are JSON when `LOG_JSON=true`.

## Frontend data flow

* `WeatherProvider` holds one piece of client state: the selected **location**
  (`{lat, lon, name}`), mirrored to the URL (`/?lat=…&lon=…&name=…`) so any view is shareable.
* Everything else is **server state** owned by TanStack Query, keyed by the location:
  `['weather', key]`, `['forecast', key]`, `['hourly', key]`, `['alerts', key]`, `['anomaly', key]`…
  This removes the race conditions the v1 `useEffect` + `setState` code had, gives
  stale-while-revalidate refreshes, request cancellation via `AbortSignal`, and dedupes
  identical requests from sibling components.
* All times are rendered in the **city's** timezone using the UTC offset that the API returns
  (`utils/time.ts`), never the viewer's.
* Feature views (Journey, Activity, Health, Logistics, Map, Chart, Chat) are `React.lazy` chunks;
  vendor libraries are split by `manualChunks`. First paint ships ~83 kB gzip of app code.

## Time and units

* Backend: temperatures °F, wind mph, visibility m; all timestamps are unix seconds or
  timezone-aware ISO-8601 strings (`+00:00`). Never naive datetimes.
* Frontend: `unit` (F/C) is a display preference. `utils/units.ts` converts wind and
  visibility alongside temperature so a Celsius user sees km/h and km.

## Security

* Strict CSP (`default-src 'self'`; map tiles from CARTO/OSM only) — fonts and icons are self-hosted.
* Rate limits per IP on every cost-incurring endpoint (`slowapi`).
* Optional `SKYPULSE_API_KEY` gate on AI endpoints (`X-API-Key`, constant-time compare).
* Overpass queries are built from numeric coordinates only (no QL injection surface).
* Map-tile proxy validates layer/zoom/x/y before forwarding.

## Scaling notes

The in-process cache and limiter are per worker. To run more than one replica, swap
`AsyncTTLCache` for a Redis-backed implementation with the same `get_or_fetch` interface
and give `slowapi` a Redis storage URI. Nothing else needs to change.
