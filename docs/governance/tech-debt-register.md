# Technical Debt Register

Deliberate or discovered shortcuts and structural weaknesses to be addressed later. Feeds prioritization.
Sourced from R0 architecture findings, code review, and agent handoffs. Maintained by G1.

| ID | Title | Category | Location (file/module) | Origin | Interest (cost of not fixing) | Effort | Priority | Owning agent | ADR | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| TD-001 | <one line> | Design/Test/Perf/Security/Docs | `backend/src/...` | R0 / self / review | <what it slows or risks> | S/M/L | P1/P2/P3 | A7 | — | Open |

## Conventions
- **Category:** Design · Test-gap · Performance · Security · Tooling · Docs.
- **Interest:** the ongoing cost/risk of leaving it (why it matters).
- **Priority:** P1 (address before release) · P2 (next) · P3 (opportunistic).
- P1 debt must be resolved or explicitly accepted (with ADR + Known Issue) before Definition of Done.
