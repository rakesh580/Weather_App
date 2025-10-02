# Use an official Python image - single platform for faster builds
FROM --platform=linux/amd64 python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including build tools for ML packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Copy requirements and install Python packages (CPU-only PyTorch for speed)
COPY --chown=app:app requirements.txt .
RUN pip install --user --no-cache-dir fastapi uvicorn requests pytz anthropic pinecone sentence-transformers numpy python-dotenv && \
    pip install --user --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch

# Copy project files
COPY --chown=app:app . .

# Add user's pip bin to PATH
ENV PATH="/home/app/.local/bin:$PATH"

# Expose port 9000
EXPOSE 9000

# Health check for the application
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/api/chat/health || exit 1

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]