# Governance Agents (read-only re: application code — documentation only)

| Prompt | Agent | Role |
|---|---|---|
| G1-project-historian | Project Historian | Maintains project knowledge across the whole lifecycle: CHANGELOG, ADRs, Decision Log, Bug Log, Known Issues, Tech Debt Register, Release Notes, Lessons Learned, the Evidence INDEX, and the Technology Change (TCR) log |

G1 never edits application code; any code change it surfaces is routed to the owning build agent via the Master
Orchestrator. Its owned files live in [`../../governance/`](../../governance/), [`../../architecture/decisions/`](../../architecture/decisions/README.md),
[`../../technology/technology-changes.md`](../../technology/technology-changes.md), and [`../../quality/evidence/INDEX.md`](../../quality/evidence/INDEX.md).
