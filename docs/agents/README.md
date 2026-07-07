# Agent Prompts (enterprise-QA roster)

A0 (subordinate coordination delegate) + A1–A15 build agents + **6 review agents (R0–R5)** + G1 (governance). One file per agent; each prompt is a
complete, copy-ready Claude Code task. Build agents spawn with the Agent tool using `isolation: "worktree"`;
review agents run read-only and write no application code. The **Master Orchestrator** (MASTER-ORCHESTRATOR.md)
drives the whole fleet.

## GLOBAL PREAMBLE — applies to EVERY build agent (A1–A14)
> Each prompt file already embeds this; it is restated here as the authoritative rule.
> **Technology governance:** the Technology Decision Record (`docs/technology/TDR.md`) is
> FROZEN on Master Orchestrator approval. All implementation agents MUST use ONLY the approved technologies at their
> pinned versions. **No agent may introduce a new dependency, framework, library, or service without approval.** To
> add or change one, STOP and submit a **Technology Change Request** to the Master Orchestrator (justification +
> impact); the MO approves or rejects, and implementation may not continue until it is approved (→ superseding ADR →
> new TDR version) or the technology is dropped. Only A4 (backend) and A9 (frontend) may edit manifests, and only to
> match the frozen TDR.

## Changelog
### v4 — Engineering Governance layer
- **Added G1 Project Historian** (read-only re: code): owns CHANGELOG, ADRs, Decision Log, Bug Log, Known Issues,
  Tech Debt Register, Release Notes, Lessons Learned, Evidence INDEX. Runs continuously across the lifecycle.
- **Architect (A1) extended** with a design-documentation deliverable — `docs/architecture/**` (8 docs: high-level
  solution, system architecture, deployment, component diagram, data flow, auth flow, DB overview, API overview).
  A1's code ownership is unchanged; no implementation agent (A2–A14) was modified.
- **A1's FINAL deliverable is the Technology Decision Record (TDR)** (`docs/technology/TDR.md`).
  It is FROZEN on Master Orchestrator approval (a GATE 0 check); after freeze no implementation agent may change the
  stack without MO approval → superseding ADR → new TDR version. See MASTER-ORCHESTRATOR.md "TECHNOLOGY / STACK CHANGE CONTROL".
- **Definition of Done expanded to 13 checks** (added: docs updated, ADRs updated on architecture change, CHANGELOG
  updated, Bug Log updated, Evidence repository complete). See MASTER-ORCHESTRATOR.md.
- Governance doc templates generated under `CHANGELOG.md`, `docs/architecture/decisions/`, `docs/governance/`, `docs/architecture/`, `docs/quality/evidence/`.
### v3 — enterprise QA layer
- **Split** the former merged R1 → **R0 Architecture Review** (Clean Architecture, SOLID, circular deps, layering,
  drift, folder/module boundaries, duplicated logic) + **R1 Contract-Conformance** (spec conformance only).
- **Upgraded A14** from Test agent → full **QA / Quality Engineering** agent (unit + integration + E2E + manual
  checklist + Requirement Traceability Matrix + strategy/plan/risk/smoke/regression/critical-path + coverage gate).
- **Added R4 Red Team** — adversarial agent that intentionally breaks the app and files reproducible bug reports.
- *(v3 note — superseded by v4/v5: feature completion now requires the full FEATURE-COMPLETE set incl. R1 contract & R5 code review — see MASTER-ORCHESTRATOR.md.)*
### v2 — split oversized FE agent (A12/A13), front-loaded manifests (A4/A9), route-registry, merged reviews.

## Spawn order
- **Phase 0:** A1 (first) ‖ A2 → **A4 (scaffold: `package.json`+deps) ‖ A9** → **A3** (schema + DB client) → **A4 (core: wires the DB client)**. This ordering breaks the A3↔A4 cycle (A4's manifest is needed by A3; A3's DB client is needed by A4's core).
- **Phase 1:** A5, A6, A15, A7, A8 ‖ A10, A11, A12, A13 (after A9 freeze) — up to **9 concurrent** in isolated worktrees against the frozen contract. Ordering is by contract only: A15 (epics) and A7 (tickets) run concurrently, but **A15 must merge before A7 integrates** (tickets reference epics).
- **Phase 3 (Quality — parallel):** A14 (QA) ‖ R0 (architecture) ‖ R1 (contract) ‖ R2 (security) ‖ R5 (code) ‖ R4 (red team)
- **Phase 4:** R3 (DoD audit)

Critical path → strongest model/effort on **A7** (tickets) and **A12** (board).

## Roster & exclusive file ownership
> **Non-normative excerpt** — canonical ownership source is [`../governance/OWNERSHIP.md`](../governance/OWNERSHIP.md); the harness **V-own-sync** check fails CI if this table's **module-ownership rows** diverge from it (the full map is canonical only in OWNERSHIP.md).
| Agent | Role | Owns (write scope) |
|---|---|---|
| MASTER | Master Orchestrator | orchestration artifacts only; no code |
| A0 | Subordinate coordination delegate | owns nothing; relays/reports under MASTER; never approves |
| A1 | Contract & Domain **+ Architect docs** | `contracts/**`, `packages/shared/**`, `docs/architecture/**` (except `decisions/` → G1), `docs/technology/TDR.md` |
| A2 | Platform/DevOps | `docker-compose.yml`, `docker/**`, `*/Dockerfile`, `.env.example`, `.gitignore`, `README.md`, `.github/**` |
| A3 | Persistence | `backend/prisma/**`, `backend/src/db/**` |
| A4 | Backend Core & Scaffold | `backend/package.json`, `backend/tsconfig.json`, `backend/src/{app.ts,server.ts,core,plugins}/**` |
| A5 | Auth & Identity | `backend/src/modules/auth/**`, `backend/src/mail/**` |
| A6 | Teams | `backend/src/modules/teams/**` |
| A7 ⚠ | Tickets | `backend/src/modules/tickets/**` |
| A8 | Comments | `backend/src/modules/comments/**` |
| A15 | Epics Backend | `backend/src/modules/epics/**` |
| A9 | FE Foundation & Scaffold | `frontend/{package.json,tsconfig.json,vite.config.ts,index.html}`, `frontend/src/{app,lib,components}/**` |
| A10 | FE Auth | `frontend/src/features/auth/**` |
| A11 | FE Teams & Epics | `frontend/src/features/{teams,epics}/**` |
| A12 ⚠ | FE Board & DnD | `frontend/src/features/board/**` |
| A13 | FE Ticket Detail & Comments | `frontend/src/features/{tickets,comments}/**` |
| A14 | QA / Quality Engineering | `backend/tests/**`, `frontend/tests/**`, `e2e/**`, `docs/quality/qa/**` |
| R0 | Architecture review (read-only) | `docs/quality/reviews/R0-*` |
| R1 | Contract-conformance review (read-only) | `docs/quality/reviews/R1-*` |
| R2 | Security review (read-only) | `docs/quality/reviews/R2-*` |
| R3 | DoD audit (read-only) | `docs/quality/reviews/R3-*` |
| R4 | Red Team review (read-only) | `docs/quality/reviews/R4-*`, `docs/quality/reviews/R4-repro/**` |
| R5 | Code Review (read-only) | `docs/quality/reviews/R5-*` |
| G1 | Project Historian (read-only re: code) | `CHANGELOG.md`, `docs/architecture/decisions/**`, `docs/governance/**`, `docs/quality/evidence/INDEX.md`, `docs/technology/technology-changes.md` (TCR log), `docs/technology/TECHNOLOGY_GOVERNANCE.md` |

Every write scope above is disjoint → no two agents ever edit the same file.

## Where each prompt lives (file map)
| Group | Folder | Files |
|---|---|---|
| Coordination | `docs/agents/` | `MASTER-ORCHESTRATOR.md`, `A0-orchestrator.md`, this `README.md` |
| Build (write code) | `docs/agents/build/` | `A1-contract` … `A14-tests` (14) |
| Review (read-only) | `docs/agents/review/` | `R0-architecture-review`, `R1-contract-conformance`, `R2-security-review`, `R3-dod-audit`, `R4-redteam-review` |
| Governance (doc-only) | `docs/agents/governance/` | `G1-project-historian` |

## FEATURE-COMPLETE (all 15 required)
A feature is complete only when: (1) implementation done · (2) automated tests pass · (3) manual verification done ·
(4) RTM complete · (5) R0 architecture passed · (6) R2 security passed · (7) R4 red team passed · (8) R3 DoD passed ·
(9) documentation updated · (10) ADRs updated on architecture change · (11) CHANGELOG updated · (12) Bug Log updated ·
(13) Evidence repository complete · (14) contract conformance passed (R1: zero drift) · (15) code review passed (R5).
(This is the per-change FEATURE-COMPLETE gate — not the project §13 Definition of Done; see docs/governance/GLOSSARY.md.)
