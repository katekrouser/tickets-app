# Review Reports (runtime output)

> **This folder is populated at runtime**, during Phase 3 (and Phase 4 for DoD). It is empty until the review
> agents run. Each report's **instructions** live in that agent's prompt under
> [`../../agents/review/`](../../agents/review/). Reviewers are read-only — they write reports here, never app code.

## Expected files (one per reviewer)
| File | Produced by | Instructions | Verifies |
|---|---|---|---|
| `R0-architecture.md` | R0 | [R0-architecture-review.md](../../agents/review/R0-architecture-review.md) | Clean Architecture, SOLID, cycles, layering, drift, TDR/ADR conformance |
| `R1-contract-drift.md` | R1 | [R1-contract-conformance.md](../../agents/review/R1-contract-conformance.md) | BE + FE match `contracts/openapi.yaml` exactly |
| `R2-security.md` | R2 | [R2-security-review.md](../../agents/review/R2-security-review.md) | Hashing, secrets, tokens, authZ, supply-chain/TDR security |
| `R3-dod-audit.md` | R3 | [R3-dod-audit.md](../../agents/review/R3-dod-audit.md) | §13 Definition-of-Done checklist on a clean checkout |
| `R4-redteam.md` (+ `R4-repro/`) | R4 | [R4-redteam-review.md](../../agents/review/R4-redteam-review.md) | Adversarial: auth/JWT/injection/XSS/races/DnD/runtime-tech exploits |
| `R5-code-review.md` | R5 | [R5-code-review.md](../../agents/review/R5-code-review.md) | Correctness/logic bugs, edge cases, maintainability |

Gate 3 requires zero unaddressed High/Critical across R0/R2/R4 and zero drift from R1; findings route to the owning
implementation agent (see [`../../agents/MASTER-ORCHESTRATOR.md`](../../agents/MASTER-ORCHESTRATOR.md)).
