# Self-Validation Harness

> Makes the orchestration self-checking. Owner: **A1**. Run by the **Master Orchestrator** before opening/closing
> every phase gate, and by CI (implemented under audit item **Md5**, owner **A2**). Any FAIL blocks the gate.
> Source of truth for ownership checks: [OWNERSHIP.md](OWNERSHIP.md).

## Automated checks (each returns PASS/FAIL + evidence)
| ID | Check | Rule | Blocks |
|---|---|---|---|
| V1 | Ownership uniqueness | No path prefix in OWNERSHIP.md is owned by >1 agent | any gate |
| V2 | Ownership coverage | Every `backend/src/modules/*`, `frontend/src/features/*`, and top-level doc area maps to an owner | GATE 1 |
| V3 | MO scope | MO's `git diff --name-only` touches ONLY runtime state/log files under `docs/process/orchestration/**` (findings-log, phase-status, contract-changes); MO authored/modified **no** permanent documentation (incl. no README) | any gate |
| V4 | Reviewer purity | R0–R5 & G1 touch only their report/record paths (`git diff --name-only`) | GATE 3 |
| V5 | Boundary compliance | Each agent's `git diff --name-only` ⊆ its owned paths | GATE 1 |
| V6 | Manifest guard | Only A4/A9 changed a manifest; every dependency ∈ frozen TDR | GATE 1, GATE 3 |
| V7 | Contract conformance | BE + FE match `contracts/openapi.yaml` (R1 report clean) | GATE 3 |
| V8 | RTM completeness | Every REQUIREMENTS clause → impl owner + auto test + manual test + review agent + DoD box | GATE 3, GATE 4 |
| V9 | Review completeness | R0,R1,R2,R3,R4,R5 reports exist with zero unaddressed High/Critical | GATE 3/4 |
| V10 | Evidence completeness | `docs/quality/evidence/INDEX.md` confirms every required artifact exists | GATE 4 |
| V11 | Doc consistency | Feature-complete list identical across MASTER/README/DEVELOPMENT_PLAN; no broken links; no stale counts | any gate |
| V12 | Governance presence | TDR, Technology Governance, Failure Recovery, ADRs, DoD, Risk Register, Release + Deployment checklists all exist | GATE 4 |
| V13 | Role distinctness (4-eyes, fail-fast) | Explicit pairwise inequality on every change (see "Gate role-distinctness validation"); Approver is MO and holds no other role. Any equality ⇒ immediate gate rejection | ALL gates (evaluated first) |
| V14 | Consensus before approval | No change is Approved/closed while Status = BLOCKED or a Review Resolution is open; Reviewer AND Verifier must both report PASS before the Approver acts | GATE 3, GATE 4 |

## Implementation status (harness reality — no over-claiming)
`scripts/validate_governance.py` **implements now:** V1 (exact-duplicate **and** prefix-overlap detection, honouring
documented `except` carve-outs), V3 (MO-scope), V11 (FEATURE-COMPLETE count identical across MASTER/README/
DEVELOPMENT_PLAN **plus** local-link resolution), and V13 over all GOVERNANCE_MATRIX rows (6 pairwise inequalities +
Approver==MO + A/R/V≠MO). **Deferred until backend/frontend exist** (need code/tests): V2, V5–V10, V12, V14.
**Also implemented (audit C-1/H-1):** V13b — role-default self-assign check (asserts no owner is its own default
Verifier, for every agent, per OWNERSHIP's collision rule); V-own-sync — the module-ownership excerpts in
`agents/README.md`, `planning/DEVELOPMENT_PLAN.md`, and `agents/MASTER-ORCHESTRATOR.md` must match the canonical
`OWNERSHIP.md`; V-gate2 — GATE 2 must be present in the gate wiring.
**Runtime duty:** per-change V13/V14 beyond the matrix (i.e. for each individual change during Phases 1–4) is
enforced by the MO at each gate; the harness covers the static/registry surface. A green harness therefore attests
the *governance* invariants above — not the (not-yet-existing) code invariants.

## Gate role-distinctness validation (V13 — fail-fast, evaluated FIRST at every gate)
For each change, resolve {Author, Reviewer, Verifier, Approver} from OWNERSHIP.md and assert ALL of:
- Author  ≠ Reviewer
- Reviewer ≠ Verifier
- Verifier ≠ Approver
- Author  ≠ Approver
- Author  ≠ Verifier    *(completes 4-eyes — catches e.g. A14-authored + A14-verified)*
- Reviewer ≠ Approver
**If ANY equality holds, REJECT the gate immediately** — do not evaluate further checks, do not approve; set
Status = BLOCKED, record the colliding pair in `docs/process/orchestration/findings-log.md`, and reassign per the
collision rule. Approver (MO) always holds exactly one role and never any other.

## Gate wiring
- **GATE 0:** V13(first) V1 V2 V3 V11 (+ contract & TDR frozen).
- **GATE 1:** V13(first) V2 V5 V6 (+ per-agent acceptance).
- **GATE 2:** V13(first) V1 V5 V6 (merge/boundary/manifest — the integration gate, audit H-2).
- **GATE 3:** V13(first) V4 V6 V7 V8 V9 V11 V14.
- **GATE 4:** V13(first) V8 V9 V10 V12 V14 (+ §13 DoD).

## Orchestrator obligation
The MO runs this harness at each gate; on any FAIL it (1) blocks the gate, (2) records the failing check in
`docs/process/orchestration/findings-log.md`, (3) reroutes to the owning agent, (4) re-runs after the fix. The MO
never edits the artifacts under review — it only records status and coordinates.
