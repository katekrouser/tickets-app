# Coverage Report

> Owner: A14. Defines and enforces coverage thresholds across unit / integration / E2E / critical-business-flow.
> BLOCKS completion (QA gate = FAIL) if any threshold is missed or any critical scenario is uncovered.
>
> **Instrumented line coverage note:** `@vitest/coverage-v8` is NOT installed and is NOT in the frozen TDR, so
> a numeric `--coverage` line percentage was not produced here (adding it requires a TCR, flagged to A9/A4).
> Coverage below is therefore reported as **function/requirement mapping** (every business function and every
> REQUIREMENTS clause is bound to at least one test — see `rtm.md`), which is the enforceable gate for this project.

## 1. Thresholds (gate)
| Dimension | Threshold | Result |
|---|---|---|
| Unit — business-logic functions with a test | 100% of critical invariants; ≥90% of service/util functions | **MET** (see §2) |
| Integration — endpoints with a test | 100% of API operations + all status classes (400/401/403/404/409) | **MET (authored)** — executes in CI |
| E2E — critical path | 100% of the §13 DoD flow | **MET (authored)** — executes in CI |
| Critical business flow | 100% of §13 DoD boxes bound to a test | **MET** (§4) |
| Requirement coverage | 0 unmapped REQUIREMENTS clauses | **MET** (`rtm.md`) |

## 2. Unit coverage (RUN✓ — no infra)
Backend `backend/tests/unit/**` — **7 files / 38 tests, all green**:
- `password.ts` → hash/verify/salt/no-plaintext — covered.
- `tokens.ts` → issue (256-bit, +24h), invalidateUnusedTokens — covered.
- `tickets/service.ts` → createTicket, updateTicket (no-op + real + orphan-epic), listTickets, deleteTicket — **all branches of the modified_at + epic-team invariants covered**.
- `core/config.ts` → all required/optional/validation branches — covered.
- `core/errors.ts` → all five DomainError subclasses + toBody — covered.
- `core/auth.ts` → issueToken/verifyToken happy + expired + malformed — covered.
- `mail/verification-email.ts` → content invariants — covered.

Frontend `frontend/tests/**` + `src/**/filters.test.ts` — **22 tests green**:
- `auth/validation.ts`, `board/labels.ts`, `board/filters.ts`, `auth/errors.ts` — covered.
- performance pipeline (filter+bucket) — covered.

**Not unit-covered (by design, covered elsewhere):** Fastify route wiring, Prisma queries, React components/hooks →
integration / component / E2E.

## 3. Integration + security coverage (authored, CI/Docker)
All 20 API operations + auth/email flows exercised across `auth/teams/epics/tickets/comments/authz-security.int`.
Status-code classes asserted: 200/201/202/204/302/400/401/403/404/409. Security: no-token, malformed/tampered/garbage
JWT, SQLi, stored-XSS, enum validation, no hash leak.

## 4. Critical-business-flow coverage (§13 Definition of Done)
| DoD box | Covered by |
|---|---|
| box1 signup→email→verify→login | `auth.int` + `critical-path` E2E |
| box2 teams & epics via UI, persisted | `teams.int`/`epics.int` + E2E |
| box3 ticket create/view/edit/delete | `tickets.int` + E2E |
| box4 comments w/ author+timestamp | `comments.int` + E2E |
| box5 board correct state columns | `filters`/`labels` unit + E2E |
| box6 drag updates server + survives refresh | `board-dnd` E2E + `tickets.int` |
| box7 `docker compose up --build` | infra (A2); manual MC-45 |
| box8 no hard-coded secret | gitleaks CI (A2); R2 review |
| box9 fresh DB schema-only | `harness.reset` empty-check; E2E fresh DB |
| box10 QA creates data via UI/API only | entire integration + E2E design |
**All 10 DoD boxes bound to a test.**

## 5. Gate decision (coverage dimension)
Coverage thresholds are **MET at the mapping level**, with the standing condition that the CI/DOM-gated suites
must execute green in CI/Docker (currently authored, not run here). Combined with `tech-audit.md`, the overall
**QA gate = FAIL** until: (a) tech-audit blockers F1–F5 clear, and (b) integration/E2E/component run green in CI.
Uncovered scenarios: **none at the requirement level.** Missing capability: instrumented line-% tooling + DOM env
(owner A9/A4 via TCR) and CI execution of the DB/stack suites (owner A2 wiring).
