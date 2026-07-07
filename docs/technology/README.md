# Technology

The approved technology stack and the rules that keep it frozen.

| File | Owner | Contents |
|---|---|---|
| [TDR.md](TDR.md) | A1 (Architect) | **Technology Decision Record** — the authoritative, frozen-on-approval stack registry (layer → tech → pinned version → rationale → owning agent) |
| [TECHNOLOGY_GOVERNANCE.md](TECHNOLOGY_GOVERNANCE.md) | G1 | Human-readable governance summary; links to the authoritative gates in the Master Orchestrator |
| [technology-changes.md](technology-changes.md) | G1 | Running log of every Technology Change Request (TCR): submitted → approved/rejected |

Rule in one line: after Phase 0 the [TDR](TDR.md) is **frozen** — nothing added/removed/swapped/major-bumped without
an approved TCR (see [TECHNOLOGY_GOVERNANCE.md](TECHNOLOGY_GOVERNANCE.md)). Enforced by the Master Orchestrator's
Dependency Gate, A14's technology audit, and the R0/R2/R4 reviews. Design-time rationale + risk review lives in
`architecture/stack-compatibility-report.md` (runtime output produced by A1 before TDR freeze); stack decisions are
recorded as [ADRs](../architecture/decisions/README.md).
