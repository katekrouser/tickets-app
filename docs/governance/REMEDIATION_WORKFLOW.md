# Executable Remediation Workflow

> Owner: **A1**. Dispatched & gated by the **Master Orchestrator**. Each item carries all required fields; where a
> field is uniform it is defaulted here. Owners resolve per [OWNERSHIP.md](OWNERSHIP.md); regression/verification map
> to check IDs in [SELF_VALIDATION.md](SELF_VALIDATION.md).
> **Live status:** execution status for these items is tracked in
> [`../process/orchestration/phase-status.md`](../process/orchestration/phase-status.md) (the first backlog is recorded DONE there).

**Field defaults (unless overridden per item):**
- **Required Evidence:** the produced/edited artifact + the SELF_VALIDATION check(s) passing, linked in the Evidence INDEX.
- **Acceptance / Verification / Regression:** the mapped SELF_VALIDATION check(s) return PASS in CI and at the gate.
- **Chain (all four distinct — SELF_VALIDATION V13):** Author implements + self-checks → Reviewer approves quality → Verifier confirms evidence → **Approver (MO)** ratifies & closes. MO is Approver only, never Author/Reviewer/Verifier.
- **Files:** per [OWNERSHIP.md](OWNERSHIP.md) (detail in the audit backlog). **Exit Criteria:** Author done → Reviewer ✔ → Verifier ✔ → MO records PASS & closes.

| ID | Title | Prio | Author | Reviewer | Verifier | Approver | Deps | Gate | Checks |
|---|---|---|---|---|---|---|---|---|---|
| R-RULE | Encode MO Rule; restrict MO to runtime state | Critical | A1 | R0 | A2 | MO | — | 0 | V3,V1,V13 |
| C1 | Create Epics backend agent **A15** (`modules/epics/**`) | Critical | A1 | R0 | A14 | MO | R-RULE | 1 | V2,V5,V8 |
| C2 | ADR carve-out (`architecture/**` except `decisions/`) | Critical | A1 | R0 | A2 | MO | R-RULE | 0 | V1,V4 |
| Md5 | CI self-validation harness (V1–V13) | High | A2 | R5 | A14 | MO | R-RULE,C1,C2 | 3 | V1–V13 |
| H1 | Add perf/component/security test suites | High | A14 | R2+R5 | R3 | MO | C1 | 3 | V8 |
| H2 | Add Code Review reviewer **R5** | High | A1 | R0 | A2 | MO | R-RULE | 3 | V9 |
| H3 | Explicit Requirement Audit stage | High | A14 | R3 | A2 | MO | — | 3 | V8 |
| H4 | Failure-Recovery playbook | High | A1 | R0 | A2 | MO | R-RULE | 4 | V12 |
| Md1 | Resolve dual-orchestrator authority (A0 vs MASTER) | Med | A1 | R0 | A2 | MO | R-RULE | 0 | V3,V11 |
| Md2 | Assign navigation READMEs → G1 | Med | G1 | R0 | A2 | MO | R-RULE | 1 | V1,V2 |
| Md3 | RTM: add DoD + review-agent columns | Med | A14 | R3 | A2 | MO | H3 | 3 | V8 |
| Md4 | R1 (contract) as explicit feature-complete condition | Med | A1 | R0 | A2 | MO | R-RULE | 3 | V7,V11 |
| L1 | Fix stale "8 conditions" line | Low | G1 | R0 | A2 | MO | Md4 | 3 | V11 |
| L2 | Label stack-compatibility-report as runtime output | Low | A1 | R0 | A2 | MO | — | 0 | V11 |
| L3 | Disambiguate "Definition of Done" (glossary) | Low | G1 | R0 | A2 | MO | Md4 | 3 | V11 |

*(Verifier column corrected: MO is never a Verifier; doc/governance changes are verified by A2 via the harness, code by A14, A14-authored testing by R3 — always distinct from Author, Reviewer, and Approver.)*

**Dispatch order (MO):** R-RULE → C2 → **Md5** (harness online early) → C1 → H2 → H1,H3,H4 → Md1,Md2,Md3,Md4 → L1,L2,L3.
Independent items may run in parallel where owners and gates differ; MO serializes edits to any single file (esp. MASTER-ORCHESTRATOR.md → A1's queue).
