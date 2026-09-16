"""Shared async HTTP client and helpers for calling upstream weather providers."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import HTTPException

logger = logging.getLogger("skypulse.http")

_client: httpx.AsyncClient | None = None


class UpstreamError(Exception):
    """Raised when an upstream provider fails; mapped to HTTP 502 by the app."""

    def __init__(self, provider: str, detail: str = "", status: int | None = None) -> None:
        super().__init__(f"{provider}: {detail or status}")
        self.provider = provider
        self.detail = detail
        self.status = status


def create_client(timeout: float, user_agent: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout, connect=4.0),
        headers={"User-Agent": user_agent, "Accept": "application/json"},
        follow_redirects=True,
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
    )


def set_client(client: httpx.AsyncClient | None) -> None:
    global _client
    _client = client


def get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("HTTP client not initialised — app lifespan did not run")
    return _client


async def get_json(
    url: str,
    *,
    provider: str,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float | None = None,
) -> Any:
    """GET a JSON document, raising UpstreamError on transport or non-2xx errors."""
    try:
        resp = await get_client().get(url, params=params, headers=headers, timeout=timeout)
    except httpx.TimeoutException as exc:
        raise UpstreamError(provider, "timeout") from exc
    except httpx.HTTPError as exc:
        raise UpstreamError(provider, f"transport error: {exc.__class__.__name__}") from exc
    if resp.status_code >= 400:
        message = ""
        try:
            message = str(resp.json().get("message", ""))[:200]
        except Exception:
            message = resp.text[:200]
        raise UpstreamError(provider, message, status=resp.status_code)
    try:
        return resp.json()
    except ValueError as exc:
        raise UpstreamError(provider, "invalid JSON") from exc


async def post_form(url: str, *, provider: str, data: dict[str, Any], timeout: float | None = None) -> Any:
    try:
        resp = await get_client().post(url, data=data, timeout=timeout)
    except httpx.HTTPError as exc:
        raise UpstreamError(provider, f"transport error: {exc.__class__.__name__}") from exc
    if resp.status_code >= 400:
        raise UpstreamError(provider, resp.text[:200], status=resp.status_code)
    try:
        return resp.json()
    except ValueError as exc:
        raise UpstreamError(provider, "invalid JSON") from exc


def upstream_http_error(exc: UpstreamError) -> HTTPException:
    logger.warning("Upstream %s failed: %s (status=%s)", exc.provider, exc.detail, exc.status)
    if exc.status == 401:
        return HTTPException(status_code=502, detail=f"{exc.provider} rejected our API key")
    if exc.status == 429:
        return HTTPException(status_code=503, detail=f"{exc.provider} rate limit reached, try again shortly")
    if exc.detail == "timeout":
        return HTTPException(status_code=504, detail=f"{exc.provider} timed out")
    return HTTPException(status_code=502, detail=f"{exc.provider} is unavailable")
