# ─── Python FastAPI Backend ───────────────────────────────────────────────────
FROM python:3.12-slim

# System deps: dumb-init for signal handling (OCR now via Ollama vision model)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["/docker-entrypoint.sh"]
