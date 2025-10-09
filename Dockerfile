# ✅ Multi-stage build for smaller, faster, EC2-compatible image
FROM --platform=linux/amd64 python:3.10-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y build-essential curl git && rm -rf /var/lib/apt/lists/*

# Copy requirements file (for cache efficiency)
COPY requirements-production.txt .

# ✅ Install dependencies (torch, numpy, transformers, etc.)
RUN pip install --upgrade pip \
 && pip install --no-cache-dir \
    numpy==1.26.4 \
    torch==2.2.0 torchvision==0.17.0 torchaudio==2.2.0 \
    -f https://download.pytorch.org/whl/cpu/torch_stable.html \
 && pip install --no-cache-dir -r requirements-production.txt


FROM --platform=linux/amd64 python:3.10-slim

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/app/.local

# Install runtime tools
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

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

# ✅ Run app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]