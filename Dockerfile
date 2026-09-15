# Web and API share an origin; PostgreSQL is supplied at runtime.
FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1 CI=1
COPY package.json package-lock.json ./
RUN npm ci
COPY App.tsx index.ts app.json tsconfig.json ./
COPY src ./src
COPY assets ./assets
RUN npm run web:build

FROM python:3.14-slim-bookworm AS api
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /bin/uv
WORKDIR /app/backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY backend/hatim ./hatim
COPY backend/migrations ./migrations
COPY --from=web /app/dist /app/dist
RUN useradd --uid 10001 --create-home hatim
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=6s --start-period=20s --retries=3 CMD ["/app/backend/.venv/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=5)"]
CMD ["/app/backend/.venv/bin/uvicorn", "hatim.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
