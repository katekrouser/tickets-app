# Orchestration Artifacts (runtime output)

> Empty until the run starts. Written **only** by the Master Orchestrator (its sole writable area).

| File | Purpose |
|---|---|
| `phase-status.md` | Per-phase gate status reports (the reporting format from the MO prompt) |
| `findings-log.md` | Every review/QA finding → owning agent → status (Open/Fixed/Closed) |
| `contract-changes.md` | Versioned log of any change to the frozen OpenAPI contract |

Instructions are in [`../../agents/MASTER-ORCHESTRATOR.md`](../../agents/MASTER-ORCHESTRATOR.md). Technology changes
are logged separately by G1 in [`../../technology/technology-changes.md`](../../technology/technology-changes.md).
