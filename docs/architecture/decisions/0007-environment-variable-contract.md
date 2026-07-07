# ADR-0007: Environment Variable Contract

- **Status:** Accepted · **Date:** YYYY-MM-DD
- **Owner:** A2 (authors `.env.example`) · **Producer:** A2 · **Consumers:** A4 (config loader), A3 (`DATABASE_URL`/Prisma), A5 (SMTP + JWT), A9/nginx (frontend), docker-compose
- **Related:** ADR-0004 (JWT), TDR (SMTP, ports), REQUIREMENTS §3
- **Resolves:** Interface Readiness Audit **I-7** (env-var names not enumerated)

## The complete, frozen variable set (exact names)
| Name | Purpose | Prod value / format | Dev (compose) value | Read by |
|---|---|---|---|---|
| `NODE_ENV` | runtime mode | `production` | `development` | A4 |
| `DATABASE_URL` | Postgres DSN | `postgresql://user:pass@postgres:5432/tickets` | same | A3 (Prisma), A4 |
| `BACKEND_PORT` | Fastify listen port | `3000` | `3000` | A4, compose |
| `FRONTEND_PORT` | nginx listen port | `80` | `8080` | A2/nginx, compose |
| `APP_BASE_URL` | base URL for email verification links | `https://<host>` | `http://localhost:8080` | A5 |
| `JWT_SECRET` | HMAC secret for `@fastify/jwt` | non-empty secret (never committed) | dev secret | A4, A5 |
| `JWT_TTL_HOURS` | bearer token lifetime (ADR-0004 default 24) | `24` | `24` | A4 |
| `SMTP_HOST` | SMTP server | `relay1.dataart.com` | `mailhog` | A5 |
| `SMTP_PORT` | SMTP port | `587` | `1025` | A5 |
| `SMTP_USER` | SMTP username | set (never committed) | empty | A5 |
| `SMTP_PASS` | SMTP password | set (never committed) | empty | A5 |
| `SMTP_FROM` | verification sender address | `no-reply@<domain>` | `no-reply@localhost` | A5 |

## Rules
- `.env.example` (owned by A2) lists **every** name above with placeholder values; the real `.env` is gitignored.
- Consumers read **only** these names via A4's config loader (fail-fast if a required one is missing). No agent invents a new env name at runtime.
- No secret value is ever committed (secrets: `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`).

## Lifecycle
A2 authors `.env.example` in Phase 0; A4's config loader validates presence at boot; compose injects dev values.

## Forbidden usages
- Reading an environment variable whose name is not in this table.
- Hard-coding any of these values in source (all come from env).
- Adding a variable without updating this ADR **and** `.env.example` (additive) — a rename requires a superseding ADR.

## Compatibility rules
The name set is frozen; additions are additive (ADR + `.env.example` update, MO-ratified, G1-logged); renames/removals require a superseding ADR.
