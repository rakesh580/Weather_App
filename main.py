"""Backwards-compatible entrypoint: `uvicorn main:app` still works. The app lives in app/main.py."""

from app.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from app.config import get_settings

    s = get_settings()
    uvicorn.run("app.main:app", host=s.host, port=s.port)
