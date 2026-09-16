"""SkyPulse API — FastAPI application factory."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app import __version__
from app.config import get_settings
from app.http import UpstreamError, create_client, set_client, upstream_http_error
from app.logging import RequestContextMiddleware, configure_logging
from app.rate_limit import limiter
from app.routers import activity, anomaly, chat, health, journey, logistics, microclimate, system, tiles, weather
from app.security import SecurityHeadersMiddleware

logger = logging.getLogger("skypulse")
ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)
    client = create_client(settings.http_timeout_seconds, settings.user_agent)
    set_client(client)
    logger.info(
        "SkyPulse %s starting (openweather=%s, ors=%s, ai=%s)",
        __version__,
        bool(settings.openweather_api_key),
        bool(settings.ors_api_key),
        settings.ai_provider,
    )
    try:
        yield
    finally:
        await client.aclose()
        set_client(None)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SkyPulse Weather API",
        version=__version__,
        description="Weather intelligence API: current conditions, forecasts, alerts, route weather, and AI briefings.",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )
    app.state.limiter = limiter

    # Middleware (outermost first)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-API-Key", "X-Request-ID"],
    )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."},
            headers={"Retry-After": "60"},
        )

    @app.exception_handler(UpstreamError)
    async def upstream_handler(request: Request, exc: UpstreamError):
        http_exc = upstream_http_error(exc)
        return JSONResponse(status_code=http_exc.status_code, content={"detail": http_exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    for r in (system, weather, tiles, anomaly, microclimate, activity, health, logistics, journey, chat):
        app.include_router(r.router)

    mount_frontend(app)
    return app


def mount_frontend(app: FastAPI) -> None:
    """Serve the built React app (frontend/dist) with an SPA fallback. No-op if it isn't built."""
    if not FRONTEND_DIST.is_dir():
        logger.warning("frontend/dist not found — API only. Run `npm run build` in frontend/ to serve the UI.")

        @app.get("/", include_in_schema=False)
        def api_only_root():
            return {"name": "SkyPulse API", "version": __version__, "docs": "/api/docs"}

        return

    assets = FRONTEND_DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")
    index = FRONTEND_DIST / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        candidate = _safe_dist_file(full_path)
        if candidate is not None:
            cache = "public, max-age=31536000, immutable" if full_path.startswith("assets/") else "no-cache"
            return FileResponse(candidate, headers={"Cache-Control": cache})
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


def _safe_dist_file(full_path: str) -> str | None:
    """Resolve a URL path to a file inside frontend/dist, rejecting traversal and unsafe segments."""
    if not full_path or "\\" in full_path or "\0" in full_path:
        return None
    segments = full_path.split("/")
    if any(seg in ("", ".", "..") or seg.startswith("~") for seg in segments):
        return None
    dist = os.path.realpath(str(FRONTEND_DIST))
    target = os.path.normpath(os.path.join(dist, *segments))
    if not target.startswith(dist + os.sep):
        return None
    if not os.path.isfile(target):
        return None
    return target


app = create_app()


if __name__ == "__main__":
    import uvicorn

    s = get_settings()
    if s.open_browser:
        import threading
        import webbrowser

        threading.Timer(1.0, lambda: webbrowser.open(f"http://{s.host}:{s.port}")).start()
    uvicorn.run("app.main:app", host=s.host, port=s.port, reload=bool(os.getenv("RELOAD")))
