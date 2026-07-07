# Ownership Registry (single source of truth)

> **Canonical.** Every other doc's ownership table must agree with this file; the self-validation harness
> ([SELF_VALIDATION.md](SELF_VALIDATION.md)) treats divergence as an error. Owner of this file: **A1** (System &
> Process Architect). The Master Orchestrator **reviews/approves** changes here but never edits it (see the MO Rule).

## Rules (machine-checkable)
1. Every path prefix below has **exactly one implementation owner**. No prefix may be owned by two agents.
2. **Review agents (R0–R5) and G1 never own production code** — only their report/record paths.
3. **MO may NEVER author or modify project documentation.** MO writes ONLY runtime status, execution logs, phase
   status, orchestration state, and temporary coordination artifacts — the state/log files in
   `docs/process/orchestration/**` (e.g. `findings-log.md`, `phase-status.md`, `contract-changes.md`), **excluding**
   that folder's `README.md` (documentation → G1). All permanent documentation is authored by its implementation
   owner; MO only reviews/approves/rejects/records for everything else.
4. Every production/document change has one **Implementation Owner**, one **Review Owner**, one **Verification Owner** (defaults in §Review/Verify).
5. `docs/requirements/REQUIREMENTS.md` is **immutable in normal operation** — scope changes require human approval, then are authored by A1; never changed unilaterally by an agent.
6. **README precedence (single rule for ALL README/index files; overrides any general wording in the tables below):**
   (a) a README inside a directory whose `**` is owned by an implementation agent belongs to that agent
   (e.g. `docs/quality/qa/README.md` → A14); (b) every other navigation/index README — area dirs
   (`docs/`, `requirements/`, `planning/`, `technology/`, `quality/`, `process/`, `agents/`) and agent subfolders
   (`agents/build|review|governance/`) — is owned by **G1**. Agent-charter globs cover charter files only and
   **exclude `README.md`**. (Resolves audit M-4 and REG-1.)
7. **Single normative source:** this file is the ONLY normative ownership map. Ownership shown in `agents/README.md`, `planning/DEVELOPMENT_PLAN.md`, and `agents/MASTER-ORCHESTRATOR.md` are non-normative excerpts that MUST match this file; the harness cross-checks them (audit H-1).

## Production code — implementation owners
| Path | Owner |
|---|---|
| `contracts/**`, `packages/shared/**` | A1 |
| `docker-compose.yml`, `docker/**`, `*/Dockerfile`, `.env.example`, `.gitignore`, root `README.md`, `.github/**`, **root workspace config** (root `package.json`, `pnpm-workspace.yaml`/workspaces, `tsconfig.base.json`) | A2 *(root workspace closes audit B2)* |
| `backend/prisma/**`, `backend/src/db/**` | A3 |
| `backend/package.json`, `backend/tsconfig.json`, `backend/src/{app.ts,server.ts,core,plugins}/**` | A4 |
| `backend/src/modules/auth/**`, `backend/src/mail/**` | A5 |
| `backend/src/modules/teams/**` | A6 |
| `backend/src/modules/epics/**` | **A15** *(new — closes audit C1)* |
| `backend/src/modules/tickets/**` | A7 |
| `backend/src/modules/comments/**` | A8 |
| `frontend/{package.json,tsconfig.json,vite.config.ts,index.html}`, `frontend/src/main.tsx`, `frontend/src/{app,lib,components}/**` | A9 |
| `frontend/src/features/auth/**` | A10 |
| `frontend/src/features/{teams,epics}/**` | A11 |
| `frontend/src/features/board/**` | A12 |
| `frontend/src/features/{tickets,comments}/**` | A13 |
| `backend/tests/**`, `frontend/tests/**`, `e2e/**` | A14 |

## Documents — owners
| Path | Owner |
|---|---|
| `docs/requirements/REQUIREMENTS.md` | immutable in normal operation — scope changes: human-approved, authored by A1 |
| `docs/architecture/**` **except** `decisions/**` | A1 *(carve-out closes audit C2)* |
| `docs/architecture/decisions/**` (ADRs) | G1 |
| `docs/technology/TDR.md` | A1 |
| `docs/technology/technology-changes.md`, `docs/technology/TECHNOLOGY_GOVERNANCE.md` | G1 |
| `docs/planning/DEVELOPMENT_PLAN.md`, `docs/planning/RISK_REGISTER.md` | A1 |
| `docs/agents/MASTER-ORCHESTRATOR.md` + orchestration-design docs (`OWNERSHIP.md`, `SELF_VALIDATION.md`, `FAILURE_RECOVERY.md`, `REMEDIATION_WORKFLOW.md`, `docs/GOVERNANCE_MATRIX.md`) | A1 |
| `docs/agents/build/*`, `docs/agents/review/*`, `docs/agents/governance/*` (agent **charters** — charter files only; `README.md` excluded, see Rule 6) | A1 — design authority authors ALL charters incl. its own; separation for A1-authored artifacts is provided by R0 review + MO approval (no self-approval) |
| navigation/index `README.md` per **Rule 6** (area dirs + agent subfolders; excludes READMEs inside an agent-owned `**` dir), `CHANGELOG.md`, `docs/governance/{decision-log,bug-log,known-issues,tech-debt-register,release-notes,lessons-learned}.md`, glossary | G1 |
| `docs/governance/{RELEASE_CHECKLIST,DEPLOYMENT_CHECKLIST}.md` | A2 |
| `docs/quality/qa/**` | A14 |
| `docs/quality/reviews/R0-*` R0 · `R1-*` R1 · `R2-*` R2 · `R3-*` R3 · `R4-*` R4 · `R5-*` R5 | each reviewer (read-only) |
| `docs/quality/evidence/INDEX.md` | G1 |
| `docs/process/handoffs/<AGENT>.md` | the named build agent |
| `docs/process/orchestration/*.md` **state/log files** (findings-log, phase-status, contract-changes) | **MO (runtime state only — no documentation)** |
| `docs/process/orchestration/README.md` (documentation) | G1 |

## Four-role change-control chain (separation of duties)
Every change flows **Author → Reviewer → Verifier → Approver**. These MUST be four **distinct** actors on that
change — no agent may hold two roles on the same change (no self-review, no self-verification, no self-approval).

| Role | Who | Does |
|---|---|---|
| **Author** | the path's Implementation Owner (tables above) | makes the change + a self-check before handing off |
| **Reviewer** | applicable review agent — architecture→R0, contract→R1, security→R2, DoD→R3, adversarial→R4, correctness→R5 (governance/orchestration-doc structure→R0; **infrastructure/DevOps** — docker, compose, CI, workspace root — **→R0**; **persistence/migrations →R0**) — exactly one per change | judges correctness/quality; ≠ Author |
| **Verifier** | code→**A14** (tests/RTM/coverage); testing changes authored by A14→**R3**; doc/governance changes→**A2** (runs the SELF_VALIDATION harness), **except when A2 is the Author** (harness/checklists)→**A14** | independently confirms acceptance evidence; ≠ Author, ≠ Reviewer |
| **Approver** | **Master Orchestrator (only)** | ratifies that Author+Reviewer+Verifier signed off, then closes; records status. Never Author/Reviewer/Verifier. |

**Collision rule:** if a default assignment would put one agent in two roles, reassign the junior role:
**A14-authored code/tests → Verifier R3** (A14 is the default code-verifier); **A14-authored docs → Verifier A2**
(default doc-verifier, ≠ author — e.g. TEST_STRATEGY); **A2-authored (harness/checklists) → Verifier A14**. The Approver is always MO and
is never reassigned. Enforced by SELF_VALIDATION check **V13**, which validates role distinctness against these
defaults for **every agent** (not only the GOVERNANCE_MATRIX rows).

### Criteria ownership
| Criteria | Owned by | Meaning |
|---|---|---|
| **Acceptance Criteria** | **Author** | what "done" means for the change; declared by the Author, satisfied before hand-off |
| **Review Criteria** | Reviewer | the quality/correctness bar the Reviewer applies |
| **Verification Criteria** | **Verifier** | the independent evidence (tests/harness) that must pass |
| **Approval Criteria** | **Master Orchestrator** | that Author + Reviewer + Verifier all signed off, gates green, no open Review Resolution |

### Disagreement protocol (Reviewer ↔ Verifier)
If the **Reviewer and Verifier disagree** (one passes, one fails; or their criteria conflict):
1. **Status = BLOCKED.** No approval is permitted while BLOCKED (SELF_VALIDATION **V14**).
2. The **Master Orchestrator opens a Review Resolution** — a runtime coordination record in
   `docs/process/orchestration/review-resolutions.md` (MO-writable state; not documentation).
3. The **issue is reassigned** to the Author (or an alternate per the collision rule) to reconcile.
4. **No approval until consensus:** the change stays BLOCKED until Reviewer **and** Verifier both PASS. Only then may
   MO (Approver) apply the Approval Criteria and close. MO never overrides a reviewer or verifier to force approval.
