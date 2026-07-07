# tickets-app

A Kanban-style Hackathon Ticket Tracker: three-tier SPA + HTTP API + PostgreSQL.
Everything runs in containers — the only host prerequisite is Docker.

## Prerequisites

- **Docker** with the **Docker Compose v2** plugin (`docker compose ...`).
- Nothing else. No host-installed Node, npm, or PostgreSQL is required to run
  the app. (Node 20 / npm 10 are only needed for local, non-Docker development.)

Runs on a clean Windows / macOS / Linux checkout.

## Configuration

All configuration comes from environment variables (contract: `docs/architecture/decisions/0007-environment-variable-contract.md`).

```bash
cp .env.example .env
```

`.env` is gitignored — never commit it. The defaults in `.env.example` work
out of the box for local development. For a real deployment, set at minimum a
strong `JWT_SECRET` and real SMTP credentials (`SMTP_HOST/PORT/USER/PASS/FROM`).

**`JWT_SECRET` (security):** there is no committed default. If it is left unset
(or is shorter than 32 chars / equals the old `dev-only-change-me` placeholder),
the backend entrypoint mints a strong **ephemeral** secret at boot so
`docker compose up` still works zero-config — but tokens then reset on every
restart. **Production MUST set a stable, high-entropy `JWT_SECRET` (>=32 chars).**

| Variable | Purpose |
|---|---|
| `NODE_ENV` | runtime mode (`development` / `production`) |
| `DATABASE_URL` | Postgres DSN (host is the `postgres` compose service) |
| `BACKEND_PORT` | Fastify listen port (container-internal, not published) |
| `FRONTEND_PORT` | host port the nginx SPA is published on |
| `APP_BASE_URL` | base URL for email-verification links (= the app origin) |
| `JWT_SECRET` | HMAC secret for bearer tokens (never commit; unset ⇒ ephemeral dev secret auto-generated at boot; set a stable >=32-char value in production) |
| `JWT_TTL_HOURS` | bearer-token lifetime in hours |
| `SMTP_HOST/PORT/USER/PASS/FROM` | outbound email (verification) settings |

## Startup

From the repo root, on a clean checkout:

```bash
cp .env.example .env
docker compose up --build
```

Then open **http://localhost:8080** (the `FRONTEND_PORT`).

- Only the **frontend** (nginx) publishes a host port. The backend is reachable
  only inside the Compose network; the browser talks to it via nginx at `/api`.
- To also capture verification emails locally, start with the dev profile
  (Mailhog UI at http://localhost:8025):

  ```bash
  docker compose --profile dev up --build
  ```

### How migrations run on boot

Startup ordering is enforced by healthchecks:

1. `postgres` starts and becomes healthy (`pg_isready`).
2. `backend` waits for `postgres` to be **healthy**, then its entrypoint
   (`docker/backend-entrypoint.sh`) runs **`npm run migrate`** to apply the
   schema, and only then starts the server (`npm run start`).
3. `frontend` (nginx) waits for the backend to be **healthy**, then serves the
   SPA and proxies `/api/*` to `backend:3000`.

Data persists in the named volume `postgres-data` across
`docker compose restart` / `down` + `up`. A fresh database contains only schema
and migration metadata — no seed data.

## Architecture

- **frontend** — nginx serves the compiled Vite SPA and reverse-proxies
  `/api/*` → `http://backend:3000` (path preserved, SPA fallback to
  `index.html`). Same-origin, no CORS. See ADR-0009.
- **backend** — Fastify API on port 3000, serving only `/api/*`, `/health`,
  `/ready`.
- **postgres** — PostgreSQL 16 with a named volume.

This repo is an **npm-workspaces monorepo**: root `package.json`
(`workspaces: ["backend", "frontend", "packages/*"]`) links `backend`,
`frontend`, and the shared `@app/shared` package.
