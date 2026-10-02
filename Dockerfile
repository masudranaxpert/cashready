# CashReady API — production image
# Artifact JSONs are committed in artifacts/serve/, so the container needs
# no ML stack: python + fastapi + uvicorn only (small & fast cold start).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ARTIFACTS_DIR=/app/artifacts/serve

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# serving layer + committed artifacts only (data/, cashready/ ML code not needed)
COPY api/ api/
COPY artifacts/serve/ artifacts/serve/

# non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/health')" || exit 1

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
