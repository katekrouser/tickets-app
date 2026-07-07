# Governance Matrix

Per-artifact view of the four-role change-control chain (**Author → Reviewer → Verifier → Approver**). This matrix
must agree with the canonical [governance/OWNERSHIP.md](governance/OWNERSHIP.md); the self-validation harness
([governance/SELF_VALIDATION.md](governance/SELF_VALIDATION.md), checks V1/V11/V13) treats divergence as an error.
Owner of this file: **A1**.

**Legend** — *Author* owns Acceptance Criteria · *Reviewer* judges quality · *Verifier* owns Verification Criteria
(independent) · *Approver* (MO) owns Approval Criteria and only ratifies once Reviewer **and** Verifier PASS
(no approval while BLOCKED, V14). *Source of Truth* = this artifact is authoritative for its domain.

| Artifact         | Author | Reviewer | Verifier | Approver | Source of Truth |
| ---------------- | ------ | -------- | -------- | -------- | --------------- |
| REQUIREMENTS.md  | A1     | R0       | A2       | MO       | Yes             |
| TDR.md           | A1     | R0       | A2       | MO       | Yes             |
| TEST_STRATEGY.md | A14    | R3       | A2       | MO       | Yes             |
| OWNERSHIP.md     | A1     | R0       | A2       | MO       | Yes             |

## Notes (consistency with the registry)
- **Scope (audit M-1):** this matrix covers the key source-of-truth artifacts only. All other agents and artifacts —
  including **A15** (epics backend) and **R5** (code review) — follow the four-role **defaults** in the canonical
  [OWNERSHIP.md](governance/OWNERSHIP.md); this matrix is a non-normative excerpt and OWNERSHIP.md governs on any conflict.
- **REQUIREMENTS.md** is the scope source and is **immutable in normal operation**: changes require explicit human
  approval; when approved, **A1** authors the edit (hence Author = A1) under MO ratification. It is never modified by
  an agent unilaterally.
- **TDR.md** freezes after Phase 0; post-freeze changes follow the Technology Change Request workflow (approved TCR →
  superseding ADR → new TDR version) before A1 edits it.
- **TEST_STRATEGY.md** = `quality/qa/test-strategy.md` (A14's QA artifact). Verifier = A2 per the collision rule:
  an A14-authored **doc** → A2 (default doc-verifier, ≠ author); only A14-authored **code/tests** → R3.
- **Every row** already satisfies role distinctness: Author ≠ Reviewer ≠ Verifier ≠ Approver, and MO is Approver-only.
- Extend this table as artifacts are added; each new row must resolve against OWNERSHIP.md.
