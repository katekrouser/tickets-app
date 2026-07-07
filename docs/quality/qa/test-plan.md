# Test Plan

> Owner: A14. Concrete inventory of suites, how to run them, and pass criteria. Companion to `test-strategy.md`.

## 1. Suite inventory

### Backend — `backend/tests/` (config: `backend/tests/vitest.config.ts`)
| File | Type | Status | Covers |
|---|---|---|---|
| `unit/errors.test.ts` | unit | RUN✓ | DomainError statuses + wire shape (ADR-0003) |
| `unit/config.test.ts` | unit | RUN✓ | Env fail-fast, JWT TTL default (ADR-0007/0004) |
| `unit/password.test.ts` | unit | RUN✓ | Argon2id hash/verify, salting, no plaintext (§3) |
| `unit/verification-email.test.ts` | unit | RUN✓ | Verify email content: URL, 24h/one-time, no bearer (§3) |
| `unit/tokens.test.ts` | unit | RUN✓ | 256-bit token, +24h expiry, resend invalidation (§3) |
| `unit/tickets-service.test.ts` | unit | RUN✓ | modified_at invariant, epic-team rule, createdBy, list filters (§6/§8) |
| `unit/auth-token.test.ts` | unit | RUN✓ | JWT issue/verify, expired→TOKEN_EXPIRED, malformed→TOKEN_INVALID (ADR-0004) |
| `integration/auth.int.test.ts` | integration | CI (DB) | signup/login/verify/resend/expiry/enumeration (§3) |
| `integration/teams.int.test.ts` | integration | CI (DB) | Team CRUD, name rules, 409 dependents (§4) |
| `integration/epics.int.test.ts` | integration | CI (DB) | Epic CRUD, team immutability, 409 referenced (§5) |
| `integration/tickets.int.test.ts` | integration | CI (DB) | Ticket CRUD, modified_at, epic mismatch, cascade, board query (§6/§8) |
| `integration/comments.int.test.ts` | integration | CI (DB) | Comment add/order/empty, no modified_at bump (§7) |
| `integration/authz-security.int.test.ts` | security | CI (DB) | no-token/malformed/tampered/garbage JWT, public routes, SQLi/XSS, enum, no hash leak (§9/§11) |

### Frontend — `frontend/tests/` (+ existing `src/features/board/filters.test.ts`)
| File | Type | Status | Covers |
|---|---|---|---|
| `unit/validation.test.ts` | unit | RUN✓ | email/password client validation mirrors contract (§3) |
| `unit/labels.test.ts` | unit | RUN✓ | 5-column order + human labels (§6/§8) |
| `unit/api-errors.test.ts` | unit | RUN✓ | error-envelope normalization |
| `performance/board-pipeline.perf.test.ts` | perf | RUN✓ | filter+bucket ≥200 tickets under budget; column order (§8/Risk#11) |
| `component/design-system.test.tsx` | component | DOM | Button/Input/Field/Modal/Toast/Loading/Empty/Error (ADR-0008) |
| `component/ticket-card.test.tsx` | component | DOM | card title/type; stored-XSS rendered inert (§8/§11) |

### E2E — `e2e/` (config: `e2e/playwright.config.ts`)
| File | Status | Covers |
|---|---|---|
| `tests/critical-path.spec.ts` | CI (stack) | signup→verify(Mailhog)→login→team→epic→ticket→comment→drag→logout (§13) |
| `tests/board-dnd.spec.ts` | CI (stack) | drag persists + survives refresh + rollback on failure (§6.7/§8.3) |

## 2. How to run
```bash
# Unit (runs green with no infra):
npm test --workspace backend      # after A4 sets: "test": "vitest run --config tests/vitest.config.ts"
npm test --workspace frontend

# Integration + security (needs migrated Postgres):
DATABASE_URL=postgresql://… npm test --workspace backend   # DB-gated suites activate

# E2E (needs the running stack):
docker compose up --build -d
E2E_BASE_URL=http://localhost:8080 MAILHOG_URL=http://localhost:8025 \
  npx playwright test --config e2e/playwright.config.ts

# Component (after A9 adds a DOM env via TCR): unskip when test.environment=jsdom/happy-dom.
```

## 3. Pass criteria
- Unit + pure-perf: 100% green on every push (currently **38 BE + 22 FE = 60 green**).
- Integration/security/E2E: 100% green in CI/Docker.
- Coverage + gate: see `coverage-report.md`.

## 4. Known execution gaps (this environment)
No Docker/Postgres/browser → integration, security, E2E, component suites are **authored, not executed here**.
They self-skip so the runnable set stays green, and MUST run green in CI before the QA gate flips. See tech-audit
for the CI wiring flagged to A2 and the DOM-env TCR flagged to A9.
