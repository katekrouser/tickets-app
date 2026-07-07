# Test Strategy

> Owner: A14. How quality is engineered and gated for the Hackathon Ticket Tracker. Tooling is constrained to
> the frozen TDR (Vitest + Supertest BE, Playwright E2E; Testing Library for components pending a TCR — see tech-audit F4/F5).

## 1. Objectives
- Verify **every** REQUIREMENTS clause (see `rtm.md`) with automated + manual coverage.
- Protect the high-risk invariants with fast, deterministic unit tests.
- Gate completion on coverage thresholds, the RTM/requirement audit, and the QA Technology Audit.

## 2. Test pyramid
| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Unit | Vitest | Pure services/utilities/business logic; Prisma mocked | Every push (fast, no infra) |
| Integration/API/DB/Auth/Email | Vitest + Supertest | Real Fastify app + real Postgres via Prisma; full request/response, status codes, email flow | CI/Docker (DB-gated; self-skip without `DATABASE_URL`) |
| Component | Vitest + Testing Library | DS primitives + feature components (board card, forms, comments) | CI once a DOM env is added (DOM-gated, self-skip) |
| E2E | Playwright | Full user journeys through the SPA + backend + Postgres + Mailhog | CI/Docker against the running stack |
| Performance | Vitest (pure) + Playwright (render) | Board pipeline + render at ≥100 tickets | Pure part every push; render part in CI |
| Security (automated) | Vitest + Supertest | Negative-authz, JWT tamper, injection/XSS payloads, enum validation | CI/Docker |

## 3. Invariant focus (highest risk → strongest tests)
1. **modified_at advances only on a real change; a comment never bumps it** — `tickets-service` unit (RUN✓) + `tickets.int`/`comments.int`.
2. **Epic must belong to the ticket's team** (create + team-change) — `tickets-service` unit (RUN✓) + `tickets.int`.
3. **Enum validation server-side** — Ajv schemas; `tickets.int` + `authz-security.int`.
4. **Password policy + Argon2id, never plaintext** — `password` unit (RUN✓).
5. **Token 24h expiry + single-use + resend invalidation** — `tokens` unit (RUN✓) + `auth.int`.
6. **Auth boundary** (public routes only; JWT tamper/expiry) — `auth-token` unit (RUN✓) + `authz-security.int`.

## 4. Environments & data
- **Local/CI unit:** no infra; Prisma/JWT mocked or in-process.
- **CI/Docker:** `docker compose up --build` provides Postgres (migrated, empty) + Mailhog. Tests create their
  own data via API/UI and reset between suites (`harness.reset`). No seed data (§9).
- **No production data**; disposable ephemeral DB per CI run.

## 5. Entry / exit criteria
- **Entry:** code merged for the module under test; migrations apply cleanly; `@app/shared` built.
- **Exit (QA gate = PASS):** all thresholds in `coverage-report.md` met; RTM has no unmapped requirement and the
  requirement audit passes; **tech-audit = PASS** (0 Critical/High runtime vulns, stack == TDR); smoke + critical-path green.

## 6. Roles
- A14 authors/owns all suites + gate. Defects route to owning agents (A4/A5 backend+auth, A6 teams, A7 tickets,
  A8 comments, A15 epics, A9 FE foundation, A11 ticket UI, A12 board, A13 data hooks, A2 infra/CI, A3 schema, A1 contract/TDR).

## 7. Risks to the strategy
- Component + E2E + integration are **authored but not executed** in the sandbox (no Docker/browser). They are
  gated to self-skip and MUST be run green in CI/Docker before the gate flips. See `risk-matrix.md` R-Q1.
