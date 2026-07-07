# Governance Glossary  *(closes audit L3)*

Owner: **G1**. Disambiguates terms that were previously overloaded.

| Term | Precise meaning |
|---|---|
| **Definition of Done (DoD)** | The **project-level** acceptance checklist in `requirements/REQUIREMENTS.md §13` (10 boxes). Audited by **R3** on a clean checkout at GATE 4. |
| **FEATURE-COMPLETE** | The **per-feature/per-change** completion gate defined in `agents/MASTER-ORCHESTRATOR.md` (the numbered conditions incl. contract/R1). This is *"the definition of done for a single change,"* NOT the project §13 DoD. |
| **Author / Reviewer / Verifier / Approver** | The four-role change-control chain (`governance/OWNERSHIP.md`); four distinct agents; Approver = MO only. |
| **Acceptance Criteria** | Owned by the **Author** — what "done" means for a change. |
| **Verification Criteria** | Owned by the **Verifier** — the independent evidence that must pass. |
| **Approval Criteria** | Owned by the **MO** — all sign-offs + green gates + no open Review Resolution. |
| **TCR** | Technology Change Request — the only path to alter the frozen TDR. |
| **Review Resolution** | The BLOCKED-state record MO opens when Reviewer and Verifier disagree. |

Rule: use **"Definition of Done / §13"** only for the project checklist; use **"FEATURE-COMPLETE"** for per-change completion. Docs must not conflate them (self-validation V11).
