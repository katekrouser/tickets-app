# Failure Recovery Playbook

> Owner: **A1** (process design). Executed by the **Master Orchestrator** at runtime. Closes audit finding M7.
> The MO coordinates recovery and records it in `docs/process/orchestration/findings-log.md`; it never fixes code itself.

| Failure mode | Detection | Recovery | Owner of the fix |
|---|---|---|---|
| **Failed / crashed agent** | Agent returns null / dies after retries | Re-spawn the same agent from its last handoff; if it fails twice, escalate to human | same agent (re-run) |
| **Rejected review** (R0–R5) | Reviewer reports a High/Critical finding | Route finding → owning agent → fix → re-run that review; gate stays blocked until clean | owning implementation agent |
| **Failed tests** (A14) | CI red / coverage below threshold | Block completion; route to the owner of the failing module; A14 re-verifies | module owner + A14 |
| **Failed merge** | Merge conflict on integration branch | Serialize merges in dependency order; manifest conflicts arbitrated by A4/A9 only; rebase and retry | integration: MO coordinates, file owner resolves |
| **Architecture violation** (R0) | R0 flags drift / boundary breach / TDR-ADR mismatch | Route to owning agent; revert the boundary-crossing edit; re-run R0 | owning agent (+ A1 if design change) |
| **Technology violation** | Dependency Gate / A14 tech-audit finds unlisted dep | Block merge → require an approved **TCR** or removal; G1 logs the TCR | requesting agent → A1 (ADR/TDR) |
| **Failed Docker build** | `docker compose up --build` fails at GATE 0/2 | Block the gate; route to A2 (compose/Dockerfiles) or A3 (migrations) per the error | A2 (or A3 for migration failures) |
| **Reviewer ↔ Verifier disagreement** | Reviewer and Verifier reach opposite verdicts | Status = BLOCKED; MO opens a **Review Resolution** (`process/orchestration/review-resolutions.md`); reassign to Author to reconcile; no approval until both PASS (V14) | Author reconciles; MO adjudicates process, never overrides a verdict |
| **Bad/failed DB migration (ROLLBACK)** | Migration errors, or a merged migration corrupts schema | Applied migrations are **immutable** — never edit them: add a **forward corrective migration**; in dev/QA (no production data, §12) reset via `prisma migrate reset` to reproduce the clean schema; re-verify empty-DB init | A3 (migrations) |
| **Approved change breaks integration later (change ROLLBACK)** | A gate-passed change causes a later regression on the integration branch | MO opens a rollback: **revert the offending merge commit** (A0 relays; owning agent re-fixes on a branch), re-run the affected gates (V1/V5/V6/V13 + tests), then re-merge. Record in `process/orchestration/findings-log.md` | owning agent re-fixes; MO coordinates the revert |
| **Critical single-owner agent unavailable** (esp. **A1** on the Phase-0 contract/TDR — audit B5) | An agent on the critical path stalls/fails and blocks dependents | MO **reassigns the deliverable to a designated backup author** under MO direction (same reassignment path as "failed/crashed agent"), preserving R0 review + MO approval. **A1 is a SPOF only during Phase 0**: once the contract & TDR are FROZEN at GATE 0 they are immutable, so Phase-1 BE/FE parallel work no longer depends on A1 availability | MO reassigns to backup author |

**Escalation to human:** same acceptance criterion fails after 2 fix cycles · a change would break the frozen
contract or TDR · a §13 DoD box is unsatisfiable within scope. The MO presents blocker + options + recommendation.
