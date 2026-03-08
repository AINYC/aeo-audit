# Self-Hosting Guide

## Phase 1 Status

Phase 1 ships a placeholder local stack so the API, worker, web app, and Postgres services can boot together. It is intended for architecture review and integration planning, not production use.

## Prerequisites

- Docker Desktop or Docker Engine with Compose
- Node.js 20+
- pnpm 9

## Local Boot

```bash
cp .env.example .env
pnpm install
pnpm run docker:up
```

Services:

- Web: `http://localhost:4173`
- API: `http://localhost:3000`
- Postgres: `localhost:5432`

## Environment Variables

Copy `.env.example` and adjust:

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `API_PORT`
- `WEB_PORT`
- `BOOTSTRAP_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MAX_CONCURRENCY`
- `GEMINI_MAX_REQUESTS_PER_MINUTE`
- `GEMINI_MAX_REQUESTS_PER_DAY`

## First-Run Expectations

- Postgres becomes healthy first
- API exposes `/health`
- Worker emits heartbeat logs
- Web renders the platform skeleton page

## Helpful Commands

```bash
pnpm run docker:up
pnpm run docker:down
pnpm run docker:logs
pnpm run docker:reset
```

## Production Guidance

Production deployment is not part of Phase 1. When the platform becomes operational:

- run behind a reverse proxy
- keep bootstrap/admin secrets out of source control
- use managed Postgres or a persistent Docker volume
- pin image versions before public deployment
