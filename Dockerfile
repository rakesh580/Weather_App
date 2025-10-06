# Multi-stage build for smaller, faster images
FROM python:3.9-slim as builder

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies in builder stage
COPY requirements-production.txt .
RUN pip install --user --no-cache-dir -r requirements-production.txt

# Production stage
FROM python:3.9-slim

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy only the installed packages from builder
COPY --from=builder /root/.local /home/app/.local

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set up the application
WORKDIR /app
COPY --chown=app:app . .

# Switch to non-root user
USER app

# Add local packages to PATH
ENV PATH="/home/app/.local/bin:$PATH"

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:9000/api/chat/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
