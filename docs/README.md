# Project Documentation — Start Here

Kanban Ticket Tracker, built by an AI multi-agent fleet. This index maps every area to its folder so you can find
the right instruction set fast. Each area folder groups related documents.

## Map
| Area | Folder | What's inside |
|---|---|---|
| 📋 Requirements | [`requirements/`](requirements/REQUIREMENTS.md) | Canonical scope + §13 Definition of Done |
| 🗺️ Planning | [`planning/`](planning/DEVELOPMENT_PLAN.md) | Development plan (agents, phases, graphs) · [Risk Register](planning/RISK_REGISTER.md) |
| 🏛️ Architecture | [`architecture/`](architecture/README.md) | 8 design docs (system, deployment, data-flow, auth-flow, DB, API…) · [ADRs](architecture/decisions/README.md) |
| 🧱 Technology | [`technology/`](technology/TECHNOLOGY_GOVERNANCE.md) | [TDR](technology/TDR.md) (frozen stack) · [Governance](technology/TECHNOLOGY_GOVERNANCE.md) · [Change log](technology/technology-changes.md) |
| ✅ Quality | [`quality/`](quality/README.md) | QA test artifacts · R0–R5 review reports · evidence repository |
| 📚 Governance | [`governance/`](governance/) | Decision log · bug log · tech-debt · known issues · lessons learned · release notes |
| ⚙️ Process | [`process/`](process/README.md) | Agent handoffs · orchestration artifacts (runtime) |
| 🤖 Agents | [`agents/`](agents/README.md) | The fleet: [Master Orchestrator](agents/MASTER-ORCHESTRATOR.md), build/ · review/ · governance/ prompts |
| 🧾 Governance Matrix | [`GOVERNANCE_MATRIX.md`](GOVERNANCE_MATRIX.md) | Per-artifact Author/Reviewer/Verifier/Approver chain |
| 📖 Glossary | [`governance/GLOSSARY.md`](governance/GLOSSARY.md) | Disambiguated governance terms (DoD vs FEATURE-COMPLETE, roles, TCR) |
| 📓 Changelog | [`/CHANGELOG.md`](../CHANGELOG.md) | Keep-a-Changelog history (repo root) |

## Reading order for a newcomer
1. **What** we're building → [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
2. **How** it's built (the agent org, phases, gates) → [`planning/DEVELOPMENT_PLAN.md`](planning/DEVELOPMENT_PLAN.md)
3. **The design** → [`architecture/README.md`](architecture/README.md)
4. **The stack & its rules** → [`technology/TDR.md`](technology/TDR.md) + [`technology/TECHNOLOGY_GOVERNANCE.md`](technology/TECHNOLOGY_GOVERNANCE.md)
5. **Who does what** → [`agents/README.md`](agents/README.md) and the [Master Orchestrator](agents/MASTER-ORCHESTRATOR.md)
6. **How quality is proven** → [`quality/README.md`](quality/README.md)

## Ownership principle
Every folder/file has exactly one owning agent (see the ownership map in [`agents/README.md`](agents/README.md)) so
no two agents ever edit the same file. Governance/review agents are read-only with respect to application code.
