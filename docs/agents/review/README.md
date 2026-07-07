# Review Agents (read-only — verify, never write application code)

Quality gate agents. Each reads the integrated codebase and writes a report to
[`../../quality/reviews/`](../../quality/reviews/); findings route to the owning build agent via the Master
Orchestrator. None edits application code.

| Prompt | Agent | Verifies | Report |
|---|---|---|---|
| R0-architecture-review | Architecture | Clean Architecture, SOLID, cycles, layering, drift, TDR/ADR conformance | `R0-architecture.md` |
| R1-contract-conformance | Contract | BE + FE match `contracts/openapi.yaml` exactly | `R1-contract-drift.md` |
| R2-security-review | Security | Hashing, secrets, tokens, authZ, supply-chain/TDR security | `R2-security.md` |
| R3-dod-audit | Definition of Done | §13 checklist on a clean checkout | `R3-dod-audit.md` |
| R4-redteam-review | Red Team | Adversarial: auth/JWT/injection/XSS/races/DnD/runtime-tech exploits | `R4-redteam.md` (+ `R4-repro/`) |
| R5-code-review | Code Review | Correctness/logic bugs, edge cases, maintainability | `R5-code-review.md` |

Phase 3 gate: zero unaddressed High/Critical across R0/R2/R4, zero drift from R1; R3 runs at Phase 4 sign-off.
