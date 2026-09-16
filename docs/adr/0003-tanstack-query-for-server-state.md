# ADR 0003: TanStack Query owns server state in the SPA

**Status:** accepted · **Date:** 2026-09-16

## Context
v1 fetched in `useEffect` and stored results in `useState`, which produced race conditions when a
user searched twice quickly, duplicate requests from sibling components, lint violations under
the React Compiler rules, and no cancellation or caching.

## Decision
Only the selected location is React state. Every remote resource is a `useQuery` keyed by that
location. `AbortSignal` is threaded into the API client; `keepPreviousData` keeps the old city on
screen while the next loads.

## Consequences
* Switching back to a recently viewed city is instant (cache) and refreshes in the background.
* Components became declarative and testable with a `QueryClientProvider` wrapper.
* A future offline mode can persist the query cache.
