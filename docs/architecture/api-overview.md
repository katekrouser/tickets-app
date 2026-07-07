# API Overview

- **Owner:** Architect (A1) · **Last updated:** YYYY-MM-DD · **Source of truth:** `contracts/openapi.yaml`

## Conventions
- Base path `/api` (same-origin; nginx proxies `/api/*` → `backend:3000`, no CORS — see ADR-0009 Transport Contract). JSON everywhere. Auth: `Authorization: Bearer <jwt>` (never in URL).
- Timestamps ISO-8601 UTC. IDs UUID or DB-numeric. Validation is server-side from the OpenAPI schemas.
- Error body = shared error schema `{ code, message, details? }`.

## Status codes
| Code | Meaning |
|---|---|
| 200/201 | success |
| 400 | validation / invalid enum / cross-team epic |
| 401 | missing/invalid auth |
| 403 | forbidden (unverified accessing business endpoint) |
| 404 | record not found |
| 409 | delete conflict (team with tickets/epics; epic referenced by tickets) |

## Endpoint surface (keep in sync with the spec)
| Area | Endpoints (indicative) | Auth |
|---|---|---|
| Auth | POST /auth/signup, /auth/login, /auth/logout, GET /auth/verify-email, POST /auth/resend-verification | public (logout requires auth) |
| Teams | GET/POST /teams, PATCH/DELETE /teams/{id} | required |
| Epics | GET/POST /epics, PATCH/DELETE /epics/{id}, GET /teams/{id}/epics | required |
| Tickets | GET /tickets (team,type,epic,q filters), POST /tickets, GET/PATCH/DELETE /tickets/{id} | required |
| Comments | GET/POST /tickets/{id}/comments | required |
| Ops | GET /health, /ready | public |

> This is a human overview; `contracts/openapi.yaml` is authoritative. R1 verifies BE + FE conform to the spec.
