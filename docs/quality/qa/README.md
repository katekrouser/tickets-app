# QA Artifacts (runtime output)

> **This folder is populated at runtime**, during Phase 3 (Enterprise Quality). It is empty until the QA agent runs.
> The **instructions** that produce everything here live in the QA agent prompt:
> **[`../../agents/build/A14-tests.md`](../../agents/build/A14-tests.md)**.

**Owner:** A14 — QA / Quality Engineering. **Automated test *code*** lives in the repo (`backend/tests/**`,
`frontend/tests/**`, `e2e/**`), not here; this folder holds the QA *documents*.

## Expected files (A14 produces these)
| File | Purpose |
|---|---|
| `test-strategy.md` | Overall approach: levels, scope, tooling, environments |
| `test-plan.md` | What gets tested, by whom, when; entry/exit criteria |
| `risk-matrix.md` | Test-risk prioritization |
| `smoke.md` | Fast critical-path checks |
| `regression.md` | Full regression suite |
| `critical-path.md` | Critical business-flow tests (signup→verify→login→ticket→board) |
| `manual-checklist.md` | Every requirement → test case, steps, expected result, Pass/Fail, evidence |
| `rtm.md` | Requirement Traceability Matrix (requirement → implementation + auto test + manual test + review result) |
| `coverage-report.md` | Unit/integration/E2E/critical-flow coverage + thresholds verdict |
| `tech-audit.md` | Technology audit vs the frozen TDR (unauthorized/duplicate/unused/deprecated/vulnerable; stack consistency) |

Gate: the QA gate passes only when coverage + RTM + the technology audit all pass (see A14's prompt and
[`../../agents/MASTER-ORCHESTRATOR.md`](../../agents/MASTER-ORCHESTRATOR.md) GATE 3).
