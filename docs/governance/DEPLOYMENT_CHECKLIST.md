# Deployment Checklist (local / Docker Compose)

> Owner: **A2**. Verified by **R3**. **Scope note:** production deployment, HA, and production-grade mail are
> **explicitly out of scope** (REQUIREMENTS §12). This checklist therefore covers only the in-scope target: a clean
> `docker compose up --build` that QA can run on a fresh Windows/macOS/Linux laptop.

- [ ] `docker compose up --build` from the repo root brings all three tiers healthy (postgres, backend, frontend).
- [ ] Only Docker Compose is required — no host-installed frontend/backend/database runtime.
- [ ] Backend waits for a healthy DB (healthcheck + depends_on) before migrating.
- [ ] Migrations run automatically on boot; fresh DB ends with schema + migration metadata only, no app data.
- [ ] Data persists across `docker compose restart` (named volume).
- [ ] All config via env (`.env.example` documents every key incl. SMTP `relay1.dataart.com`); no secret committed.
- [ ] Optional Mailhog service available for local email capture.
- [ ] README documents prerequisites, configuration, and exact startup commands.
- [ ] Verified on a clean checkout on at least one non-development OS (CI matrix or manual).
- [ ] **API transport (ADR-0009) holds:** browser is same-origin to nginx; nginx proxies `/api/*` → `backend:3000`; backend serves no SPA assets and its port is not published to the host; no CORS in production; the email verification link uses `${APP_BASE_URL}/api/auth/verify-email`.

> If production deployment is ever brought into scope, that requires a REQUIREMENTS change (human + MO approval)
> and a new ADR — it is not covered here.
