# Architecture Decision Records (ADR)

Immutable, numbered records of significant architectural decisions. Maintained by the **Project Historian (G1)**;
technical content is authored with the **Architect (A1)** and relevant implementation agent.

## Rules
- One decision per file: `NNNN-short-title.md` (zero-padded, monotonically increasing).
- ADRs are **append-only**. To change a decision, write a NEW ADR that supersedes the old one and set the old
  one's status to `Superseded by ADR-XXXX`. Never rewrite history.
- **An ADR is REQUIRED whenever an architecture-affecting change is made** (new dependency, layer/boundary change,
  data model change, auth mechanism, deployment topology, contract-breaking change). This is a Definition-of-Done gate.
- Link the ADR from the CHANGELOG entry and the Decision Log.

## Index
| ADR | Title | Status | Date | Supersedes | Superseded by |
|---|---|---|---|---|---|
| [0001](0001-example-stack-selection.md) | Stack selection | Accepted | YYYY-MM-DD | — | ADR-0010 (dependency pins only) |
| [0002](0002-database-client-contract.md) | Database Client Contract (`export const prisma`) | Accepted | YYYY-MM-DD | — | — |
| [0003](0003-domain-error-contract.md) | Domain Error Contract | Accepted | YYYY-MM-DD | — | — |
| [0004](0004-authentication-helper-contract.md) | Authentication Helper Contract | Accepted | YYYY-MM-DD | — | — |
| [0005](0005-backend-module-registration-contract.md) | Backend Module Registration Contract | Accepted | YYYY-MM-DD | — | — |
| [0006](0006-app-shared-package-contract.md) | `@app/shared` Package Contract (+ JSON-Schema export API) | Accepted | YYYY-MM-DD | — | — |
| [0007](0007-environment-variable-contract.md) | Environment Variable Contract | Accepted | YYYY-MM-DD | — | — |
| [0008](0008-frontend-foundation-contract.md) | Frontend Foundation & Route-Constants Contract | Accepted | YYYY-MM-DD | — | — |
| [0009](0009-frontend-backend-api-transport-contract.md) | Frontend ↔ Backend API Transport Contract | Accepted (FROZEN) | YYYY-MM-DD | — | — |
| [0010](0010-phase3-dependency-remediation-stack-reconciliation.md) | Phase-3 dependency remediation & stack reconciliation (TDR v2) | Accepted | 2026-07-07 | ADR-0001 (dependency pins only) | — |

Statuses: Proposed · Accepted · Deprecated · Superseded.
