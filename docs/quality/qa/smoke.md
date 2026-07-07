# Smoke Suite (fast critical checks)

> Owner: A14. The minimum set that must pass before any deeper testing/merge. Fast, deterministic, high-signal.
> Tag: `@smoke`. Target runtime: < 30s (unit portion runs with no infra).

## Automated smoke (run first)
| Check | Suite | Infra | Status |
|---|---|---|---|
| Backend unit business logic | `backend/tests/unit/**` (38 tests) | none | RUN✓ |
| Frontend unit + pure perf | `frontend/tests/{unit,performance}/**` + `filters.test.ts` (22 tests) | none | RUN✓ |
| App boots + `/health` 200 | `authz-security.int` public-routes | Postgres | CI |
| Login issues a working token | `auth.int` login-success | Postgres | CI |
| Create team → create ticket → appears on board list | `teams.int` + `tickets.int` | Postgres | CI |
| Drag persists state | `board-dnd` E2E (persist) | full stack | CI |

## Manual smoke (5-minute confidence pass)
1. `docker compose up --build` → SPA loads at :8080, no console errors.
2. Sign up → verification email visible in Mailhog.
3. Verify → redirected to login → log in → board loads.
4. Create a team; create a ticket in it; card appears in "New".
5. Drag the card to "In Progress"; reload → still there.
6. Log out → back to /login.

**Smoke pass criteria:** all automated smoke green + the 6 manual steps succeed. A smoke failure blocks the
regression run and the merge.
