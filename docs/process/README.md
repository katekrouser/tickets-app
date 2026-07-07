# Process

Runtime coordination artifacts produced while the fleet works (mostly empty until the build starts).

| Subfolder | Owner | Contents |
|---|---|---|
| [`handoffs/`](handoffs/) | each build agent | `<AGENT>.md` — what it produced, exposed interfaces, decisions, TODOs, verified acceptance criteria |
| [`orchestration/`](orchestration/) | Master Orchestrator | phase status reports, `findings-log.md`, `contract-changes.md`, integration notes |

These are the "working memory" of the run; the durable record lives in [`../governance/`](../governance/) (logs) and
[`../quality/evidence/`](../quality/evidence/INDEX.md) (proof).
