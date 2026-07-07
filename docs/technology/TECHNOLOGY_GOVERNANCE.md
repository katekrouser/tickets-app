# Technology Governance

> **Human-readable summary.** The AUTHORITATIVE, enforced rules live in
> [`../agents/MASTER-ORCHESTRATOR.md`](../agents/MASTER-ORCHESTRATOR.md) (sections *TECHNOLOGY GOVERNANCE*,
> *STACK CHANGE CONTROL*, *DEPENDENCY GATE*). This page links them together for people; it does not restate or
> override them. If this page and the orchestrator ever disagree, the orchestrator wins.

## The rule in one line
The technology stack is frozen in the **[Technology Decision Record (TDR)](TDR.md)** after Phase 0. Nothing may be
added, removed, swapped, or major-version-bumped without an approved **Technology Change Request (TCR)**.

## Prohibited without an approved TCR
install new dependencies · replace libraries · introduce new frameworks · change architecture · replace build
tooling · replace the testing framework · replace the ORM · replace authentication · replace state management ·
replace UI libraries. (The **Master Orchestrator is the only approver**; no agent self-approves.)

## Who enforces it (defense in depth)
| Layer | Agent | Check | Where |
|---|---|---|---|
| Author / freeze | A1 | Writes + freezes the TDR; stack-compatibility review | [TDR.md](TDR.md), `architecture/stack-compatibility-report.md` (runtime) |
| Preventive | A2–A14 | "Use only approved tech, else file a TCR" (in each prompt) | `../agents/build/*` |
| Merge gate | Master Orchestrator | Diff manifests vs TDR → block unlisted deps → TCR | MASTER-ORCHESTRATOR *DEPENDENCY GATE* |
| Phase gates | Master Orchestrator | GATE 1 (verify package.json vs TDR) · GATE 3 (Technology Audit) | MASTER *PHASE MODEL* |
| Static audit | A14 (QA) | No unauthorized/duplicate/unused/deprecated/vulnerable; stack matches TDR | [../quality/qa/tech-audit.md] |
| Architecture | R0 | Approved framework/ORM/auth/state/build + ADR backing | [../quality/reviews/R0-*] |
| Security | R2 | Supply-chain: unvetted deps, CVEs, lockfile integrity, crypto/auth libs | [../quality/reviews/R2-*] |
| Runtime | R4 | Exploit vulnerable/unapproved tech reachable in the running app | [../quality/reviews/R4-*] |
| Record | G1 | Logs every TCR (submitted → approved/rejected) | [technology-changes.md](technology-changes.md) |

## How to change the stack (the only legal path)
1. Requesting agent submits a **TCR** to the Master Orchestrator (justification + impact).
2. MO **approves or rejects**. Implementation stays blocked until decided.
3. On approval → A1 writes a **superseding ADR** + bumps the **TDR version**; **G1** logs it in
   [technology-changes.md](technology-changes.md) + the Decision Log + CHANGELOG; A4/A9 update the manifest.
4. Only then may the change be implemented.
