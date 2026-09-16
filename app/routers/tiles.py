from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response

from app.http import UpstreamError
from app.services import owm

router = APIRouter(prefix="/api", tags=["map"])
ALLOWED_LAYERS = {"clouds_new", "precipitation_new", "temp_new", "wind_new", "pressure_new"}


@router.get("/map-tile/{layer}/{z}/{x}/{y}")
async def map_tile(layer: str, z: int, x: int, y: int) -> Response:
    """Proxy OpenWeatherMap tile layers so the API key never reaches the browser."""
    if layer not in ALLOWED_LAYERS:
        raise HTTPException(status_code=400, detail="Invalid layer")
    if not 0 <= z <= 18:
        raise HTTPException(status_code=400, detail="Invalid zoom level")
    max_coord = (1 << z) - 1
    if not (0 <= x <= max_coord and 0 <= y <= max_coord):
        raise HTTPException(status_code=400, detail="Invalid tile coordinates")
    try:
        content = await owm.tile(layer, z, x, y)
    except UpstreamError as exc:
        raise HTTPException(status_code=502, detail="Tile fetch failed") from exc
    return Response(content=content, media_type="image/png", headers={"Cache-Control": "public, max-age=600"})
