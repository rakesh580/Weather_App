# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python builder
FROM python:3.10-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y build-essential curl git && rm -rf /var/lib/apt/lists/*

# Copy the correct requirements file
COPY requirements-production.txt /app/requirements-production.txt
WORKDIR /app

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-production.txt


# Stage 3: Runtime
FROM python:3.10-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy installed python packages from builder
COPY --from=builder /usr/local /usr/local

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=app:app . .

# Copy built frontend from frontend-builder
COPY --from=frontend-builder --chown=app:app /app/frontend/dist /app/frontend/dist

# Switch to non-root user
USER app

# Expose FastAPI port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]