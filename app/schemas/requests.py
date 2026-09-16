"""Request bodies (pydantic v2)."""

from __future__ import annotations

import json
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

JOURNEY_CONTEXT_KEYS = {
    "waypoints",
    "total_distance_miles",
    "total_duration_hours",
    "segments",
    "origin",
    "destination",
    "summary",
    "from",
    "to",
    "distance_miles",
    "duration_hours",
}


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    timezone: str | None = Field(default=None, max_length=64)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    city: str | None = Field(default=None, max_length=120)
    journey_context: dict | None = None

    @field_validator("journey_context")
    @classmethod
    def limit_journey_context(cls, v: dict | None) -> dict | None:
        if v is None:
            return v
        if len(json.dumps(v)) > 10_000:
            raise ValueError("journey_context payload too large (max 10KB)")
        unexpected = set(v.keys()) - JOURNEY_CONTEXT_KEYS
        if unexpected:
            raise ValueError(f"Unexpected keys in journey_context: {sorted(unexpected)}")
        return v


class JourneyRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    origin_name: str | None = Field(default="", max_length=200)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    dest_name: str | None = Field(default="", max_length=200)
    departure_time: str
    avg_speed_mph: float | None = Field(default=60.0, gt=0, le=200)

    @field_validator("departure_time")
    @classmethod
    def validate_departure_time(cls, v: str) -> str:
        try:
            parse_iso(v)
        except (ValueError, TypeError) as exc:
            raise ValueError("departure_time must be a valid ISO 8601 datetime") from exc
        return v


class LogisticsStop(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    name: str = Field(default="Stop", max_length=200)
    duration_minutes: float = Field(default=30, ge=0, le=480)


class LogisticsRequest(BaseModel):
    stops: list[LogisticsStop] = Field(..., min_length=2, max_length=8)
    start_time: str

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, v: str) -> str:
        try:
            parse_iso(v)
        except (ValueError, TypeError) as exc:
            raise ValueError("start_time must be valid ISO 8601") from exc
        return v
