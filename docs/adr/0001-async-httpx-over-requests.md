# ADR 0001: Async httpx client instead of synchronous requests

**Status:** accepted · **Date:** 2026-09-16

## Context
v1 used the blocking `requests` library inside FastAPI handlers, and the async chat endpoint
called a blocking weather fetch, stalling the event loop. Each request opened a new TCP/TLS
connection to OpenWeatherMap.

## Decision
One `httpx.AsyncClient` is created in the lifespan and shared. All provider calls are `await`ed,
run concurrently with `asyncio.gather` where independent (journey waypoints, microclimate lookups),
and use per-call timeouts.

## Consequences
* Journey planning for N waypoints now takes ~1 round trip instead of N sequential ones.
* Tests use `respx` to mock the transport, no network needed.
* Everything that touches I/O must stay async; CPU-bound work (TSP brute force ≤ 8 stops) is
  small enough to run inline.
