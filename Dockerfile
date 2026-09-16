# syntax=docker/dockerfile:1.7
# ---------- Stage 1: build the React app ----------
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: install Python deps ----------
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements-production.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements-production.txt

# ---------- Stage 3: runtime ----------
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app
WORKDIR /app
COPY --from=builder /install /usr/local
COPY --chown=app:app app/ ./app/
COPY --chown=app:app main.py ./
COPY --from=frontend-builder --chown=app:app /app/frontend/dist ./frontend/dist
USER app

ENV HOST=0.0.0.0 \
    PORT=80 \
    LOG_JSON=true \
    PYTHONUNBUFFERED=1
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:80/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
