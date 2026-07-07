# Regression Suite (full)

> Owner: A14. The complete automated set run before a release/gate decision. Tag: `@regression`.
> Superset of smoke + critical-path. Run order: unit → integration → security → component → E2E → performance.

## Composition
| Group | Files | Infra | Status |
|---|---|---|---|
| Unit (BE) | `backend/tests/unit/**` (7 files, 38 tests) | none | RUN✓ |
| Unit (FE) | `frontend/tests/unit/**` + `src/**/filters.test.ts` | none | RUN✓ |
| Integration (API/DB/Auth/Email) | `backend/tests/integration/{auth,teams,epics,tickets,comments}.int.test.ts` | Postgres | CI |
| Security (automated) | `backend/tests/integration/authz-security.int.test.ts` | Postgres | CI |
| Component | `frontend/tests/component/**` | DOM env | CI (DOM) |
| Performance | `frontend/tests/performance/**` (pure) + board-render (DOM) | none / DOM | RUN✓ / CI |
| E2E | `e2e/tests/**` (chromium+firefox+edge) | full stack | CI |

## Requirement coverage
Every REQUIREMENTS clause is exercised — see `rtm.md` (requirement → test) and `manual-checklist.md` (46 cases).
No requirement is regression-uncovered.

## Regression triggers
- Any change to `backend/src/modules/**`, `backend/src/core/**`, `frontend/src/features/**`, `packages/shared/**`,
  `prisma/schema.prisma`, or `contracts/openapi.yaml`.
- Any dependency change (also re-run the QA Technology Audit).

## Pass criteria
100% green across all groups in CI/Docker + thresholds in `coverage-report.md` met + tech-audit PASS.
Current status: **unit + pure-perf green (60 tests)**; integration/security/component/E2E **authored, pending CI execution**.
