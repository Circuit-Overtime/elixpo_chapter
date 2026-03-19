FROM python:3.11-slim AS builder

ARG BUILDKIT_INLINE_CACHE=1
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

RUN pip install playwright && \
    playwright install chromium && \
    playwright install-deps

# Clean up to reduce layer size
RUN find /usr/local/lib/python3.11/site-packages -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/app/.venv/bin:$PATH \
    PYTHONPATH=/app \
    REDIS_PORT=9530

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    ffmpeg \
    netcat-traditional \
    redis-server \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Install Playwright system dependencies (shared libs needed by Chromium)
RUN playwright install-deps chromium

COPY lixsearch /app/lixsearch
COPY tester /app/tester
COPY entrypoint.sh /app/entrypoint.sh
COPY public /app/public
COPY version.cfg requirements.txt openapi.yaml /app/

RUN chmod +x /app/entrypoint.sh && \
    mkdir -p /app/logs /app/models \
             /app/data/cache/images /app/data/cache/content /app/data/cache/conversation \
             /app/data/conversations /app/data/embeddings \
             /app/tmp/cache

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
    CMD curl -f http://localhost:${WORKER_PORT:-9002}/api/health || exit 1

EXPOSE 9002 9510

ENTRYPOINT ["/app/entrypoint.sh"]
