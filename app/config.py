"""Application settings, loaded once from the environment / .env file."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Third-party API keys
    openweather_api_key: str = Field(default="", alias="OPENWEATHER_API_KEY")
    hf_api_key: str = Field(default="", alias="HF_API_KEY")
    ors_api_key: str = Field(default="", alias="ORS_API_KEY")

    # Optional shared secret that protects cost-incurring endpoints (chat, briefing)
    app_api_key: str = Field(default="", alias="SKYPULSE_API_KEY")

    # AI — any OpenAI-compatible chat endpoint; see app/services/ai.py
    ai_provider: str = Field(default="auto", alias="AI_PROVIDER")  # auto|groq|openrouter|huggingface|custom
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    ai_base_url: str = Field(default="", alias="AI_BASE_URL")
    ai_api_key: str = Field(default="", alias="AI_API_KEY")
    ai_model: str = Field(default="", alias="AI_MODEL")  # empty → provider default
    ai_timeout_seconds: float = Field(default=30.0, alias="AI_TIMEOUT_SECONDS")

    # HTTP / CORS
    allowed_origins: str = Field(
        default="http://localhost:5173,http://localhost:9000,http://127.0.0.1:9000",
        alias="ALLOWED_ORIGINS",
    )
    http_timeout_seconds: float = Field(default=8.0, alias="HTTP_TIMEOUT_SECONDS")
    user_agent: str = Field(default="SkyPulse/2.0 (+https://github.com/rakesh580/Weather_App)", alias="USER_AGENT")

    # Caching (seconds)
    weather_cache_ttl: int = Field(default=300, alias="WEATHER_CACHE_TTL")
    forecast_cache_ttl: int = Field(default=900, alias="FORECAST_CACHE_TTL")
    hourly_cache_ttl: int = Field(default=900, alias="HOURLY_CACHE_TTL")
    alerts_cache_ttl: int = Field(default=300, alias="ALERTS_CACHE_TTL")
    geocode_cache_ttl: int = Field(default=86400, alias="GEOCODE_CACHE_TTL")

    # Runtime
    host: str = Field(default="127.0.0.1", alias="HOST")
    port: int = Field(default=9000, alias="PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_json: bool = Field(default=False, alias="LOG_JSON")
    open_browser: bool = Field(default=False, alias="OPEN_BROWSER")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
