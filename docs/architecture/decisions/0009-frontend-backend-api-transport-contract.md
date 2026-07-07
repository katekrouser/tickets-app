# ADR-0009: Frontend ↔ Backend API Transport Contract

- **Status:** Accepted (FROZEN) · **Date:** YYYY-MM-DD
- **Owner:** A1 (Architect — authors the contract) · **Enforced by:** A2 (nginx, compose, Dockerfiles), A9 (`@/lib/api` baseUrl, Vite proxy) · **Consumers:** A2, A9, A5 (verification link)
- **Related:** ADR-0004 (`PUBLIC_ROUTES`), ADR-0006 (`@app/shared` client types), ADR-0007 (env vars), ADR-0008 (`@/lib/api`), TDR (nginx-SPA, openapi-fetch, Prism, ports)
- **Resolves:** Dependency-audit blocker for A2 and A9 (FE↔BE base-path / reverse-proxy contract)

## Frozen statements (normative — every one is single-valued)
1. **Browser URL.** The browser loads the app from a single origin: the nginx-served frontend origin — production `http://<host>:FRONTEND_PORT`, local `http://localhost:8080`. App and API share this one origin (same-origin).
2. **SPA hosting strategy.** nginx (the `frontend` container) serves the compiled Vite build from `frontend/dist` as static files at `/`. Unknown non-`/api` paths fall back to `/index.html` for client-side routing.
3. **API base path.** The frontend ALWAYS calls `/api`. Every business/auth endpoint is under `/api/*`.
4. **openapi-fetch baseUrl.** `@/lib/api` sets `baseUrl: '/api'` — a relative path, identical in development and production. No absolute origin is ever configured.
5. **nginx reverse-proxy behavior.** nginx ALWAYS proxies `/api/*` to `http://backend:BACKEND_PORT` with the path preserved (no strip, no rewrite). All other paths are served as SPA static assets.
6. **Backend exposed routes.** The backend serves ONLY `/api/*` (business + auth) plus `/health` and `/ready`. It listens on `BACKEND_PORT` (3000). `/health` and `/ready` are used by the Docker healthcheck (container-to-container), never by the browser.
7. **Backend serving frontend assets.** The backend NEVER serves SPA/static assets. Static hosting is exclusively nginx's responsibility.
8. **CORS in production.** Production does NOT use CORS, because browser requests are same-origin (browser → nginx origin → proxied to backend). No CORS middleware, headers, and allow-list exist in the backend.
9. **Development proxy behavior.** Development keeps the same `/api` base path. The Vite dev server proxies `/api` to the backend, so `@/lib/api`'s `baseUrl: '/api'` is unchanged between dev and prod. CORS is not used in development either (the Vite proxy makes requests same-origin to the dev server).
10. **Vite proxy configuration target.** The Vite dev-server proxies `/api` to exactly `http://localhost:3000`. The contract-first mock (`npm run mock`, Prism) listens on port `3000` so this single target serves both the mock and the real backend during development.
11. **Docker networking assumptions.** On the Compose network the services are named `postgres`, `backend`, `frontend`. nginx reaches the backend at `http://backend:3000` (service-name DNS). The backend reaches Postgres at `postgres:5432` via `DATABASE_URL`. Only the `frontend` container publishes a host port (`FRONTEND_PORT`); the backend port is NOT published to the host in production, so the browser can never address the backend directly.
12. **Email verification link base URL.** The verification link is exactly `${APP_BASE_URL}/api/auth/verify-email?token=<token>`, where `APP_BASE_URL` equals the nginx frontend origin. The request is proxied to the backend; on success the backend responds `302` to `${APP_BASE_URL}/login`.
13. **Environment variables involved.** `APP_BASE_URL`, `BACKEND_PORT`, `FRONTEND_PORT`, `DATABASE_URL` (all defined in ADR-0007). The nginx upstream (`backend:3000`) is a Compose-internal name, not an environment variable.
14. **Ownership.** A1 owns this contract (architecture). A2 owns its realization in `docker/nginx.conf`, `docker-compose.yml`, and the Dockerfiles. A9 owns its realization in `frontend/vite.config.ts` and `@/lib/api`. A5 owns building the verification link from `APP_BASE_URL`.
15. **Lifecycle.** Frozen in Phase 0. A2 and A9 implement against it in Phase 0. Changing any statement requires a superseding ADR (MO-ratified, G1-logged). There is no separate handoff.
16. **Import / file locations.**
    - `@/lib/api` — sets `baseUrl: '/api'` (A9).
    - `frontend/vite.config.ts` — `server.proxy['/api'].target = 'http://localhost:3000'` (A9).
    - `docker/nginx.conf` — `location /api/ { proxy_pass http://backend:3000; }` + SPA `try_files … /index.html` (A2).
    - `docker-compose.yml` — services `postgres`/`backend`/`frontend`; only `frontend` publishes `FRONTEND_PORT` (A2).

## Forbidden usages
- Configuring an absolute API origin in the frontend client.
- Serving SPA assets from the backend.
- Adding CORS handling in production.
- Publishing the backend port to the host in the production Compose file.
- Pointing the Vite proxy at any target other than `http://localhost:3000`.
- The browser calling any backend path other than under `/api`.

## Compatibility rules
Every statement above is frozen. Any change (base path, proxy target, hosting split, CORS posture, published ports) requires a superseding ADR (MO-ratified, G1-logged). Additions must not contradict statements 1–16.
