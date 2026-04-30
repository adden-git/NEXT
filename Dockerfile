# Kimi Next — Docker image
# Build: docker build -t kimi-next .
# Run:  docker run -p 5500:5500 -v kimi-data:/root/.kimi kimi-next

FROM node:24-slim AS frontend

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ssh \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src/ ./src/
COPY --from=frontend /app/web/dist/ ./src/kimi_cli/web/static/

RUN uv venv .venv && \
    uv pip install -e .

ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONUNBUFFERED=1
ENV KIMI_WEB_HOST=0.0.0.0
ENV KIMI_WEB_PORT=5500

EXPOSE 5500

VOLUME ["/root/.kimi"]

CMD ["python", "-m", "kimi_cli.web"]
