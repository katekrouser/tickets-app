# Handoffs (runtime output)

> Empty until the build runs. Each build agent writes **`<AGENT>.md`** here on completion.

A handoff records, for the next agent and the Master Orchestrator: what was produced, the exposed interfaces
(endpoints / component APIs / route-registry entries), key decisions, open TODOs, and which acceptance criteria the
agent verified and how. Downstream agents read these instead of re-deriving (e.g. A10–A13 read `A9.md`).
Instructions to produce them are in each prompt under [`../../agents/`](../../agents/README.md).
