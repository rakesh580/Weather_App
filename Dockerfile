# ✅ Stage 1: Builder (optional if you want future caching)
FROM --platform=linux/amd64 python:3.10-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y build-essential curl git && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt


# ✅ Stage 2: Runtime (small, secure image)
FROM --platform=linux/amd64 python:3.10-slim

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy installed dependencies from builder
COPY --from=builder /usr/local /usr/local

# Set working directory
WORKDIR /app

# Copy app source code
COPY --chown=app:app . .

# Switch to non-root user
USER app

# Add user-local bin to PATH
ENV PATH="/home/app/.local/bin:$PATH"

# ✅ Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:80/api/chat/health || exit 1

# ✅ Expose EC2 HTTP port
EXPOSE 80

# ✅ Start FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]