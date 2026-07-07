# Hackathon Ticket Tracker — AI Multi-Agent Development Plan

> Companion to `docs/requirements/REQUIREMENTS.md` (canonical scope). This document defines the agent org,
> dependencies, phases, and risks. Per-agent executable prompts live in `docs/agents/`.
> **No application code is written by this plan** — it is the orchestration strategy only.

## Stack (confirmed)
| Tier | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite; `@dnd-kit/core`; TanStack Query; React Router |
| Backend | Node 20 + TypeScript + Fastify |
| ORM/migrations | Prisma |
| DB | PostgreSQL 16 (own container) |
| Auth | JWT bearer + Argon2id (`@node-rs/argon2`) |
| Mail | nodemailer → SMTP (`relay1.dataart.com`), Mailhog for local |
| Tests | Vitest + Supertest (BE), Playwright (E2E/FE) |
| Orchestration | Docker Compose (postgres + backend + frontend) |

---

## Part A — Analysis & Module Decomposition

| # | Module | Requirements covered |
|---|---|---|
| M0 | Platform / DevOps | §2, docker-compose, `.env`, README (§11), CI |
| M1 | API Contract & Domain | §6 enums, §9 codes/timestamps, BE↔FE seam |
| M2 | Persistence & Migrations | §9 migrations, fresh-DB-no-seed, integrity, entities |
| M3 | Backend Core | §9 codes, §11 security scaffold, auth middleware, error/validation |
| M4 | Auth & Identity | §3 lifecycle, Argon2id, SMTP, token lifecycle |
| M5 | Teams API | §4 CRUD, uniqueness, 409 guard |
| M6 | Epics API | §5 CRUD, team-scoping, 409 guard |
| M7 | Tickets API | §6 fields/enums, modified_at, epic-team enforcement, filters/search |
| M8 | Comments API | §7 add/list, immutability, no modified_at bump |
| M9 | Frontend Foundation | §2 shell, routing, client, auth guard, design system, §11 states |
| M10 | Frontend Auth screens | §10 signup/verify/resend/login |
| M11 | Frontend Teams & Epics screens | §10 team + epic management |
| M12 | Frontend Board & Tickets | §8 board+DnD, §6 ticket views, §7 comments UI |
| M13 | Test & QA automation | §11 BE flow + FE/API flow + invariant regressions |

### Module dependency graph
```
M0 Platform (ambient) ─ everyone runs in these containers
M1 Contract ─→ {M2 Persistence, M3 BackendCore, M9 FE Foundation}
M2 ─→ M3
{M2,M3} ─→ {M4 Auth, M5 Teams}
M5 ─→ M6 ─→ M7 ─→ M8            (FK chain: epic→team, ticket→team+epic, comment→ticket)
M9 ─→ {M10, M11, M12}
{M4..M8, M10..M12} ─→ M13
```

### Independence
- **After M1 freezes:** entire FE track (M9–M12 vs. mock server) runs parallel to entire BE track (M2–M8).
- **BE after M2+M3:** M4 and M5 independent; M6/M7/M8 chain by FK but code against contract.
- **FE after M9 freeze:** M10, M11, M12 fully independent screens.
- **M0** runs start-to-finish alongside everything.

---

## Part B — Agent Org

> Authoritative roster/ownership/gates now live in `docs/agents/README.md` and
> `docs/agents/MASTER-ORCHESTRATOR.md` (v3). This section reflects the same v3 roster.

```
Master Orchestrator (never writes code)
├─ A0 Orchestrator/PM (spawnable coordinator)
├─ Platform Lead:  A1 Contract*, A2 Platform, A3 Persistence
├─ Backend Lead:   A4 Core+Scaffold, A5 Auth, A6 Teams, A15 Epics, A7 Tickets, A8 Comments
├─ Frontend Lead:  A9 Foundation+Scaffold, A10 Auth UI, A11 Teams/Epics UI, A12 Board+DnD, A13 Ticket-Detail+Comments
├─ Quality Guild:  A14 QA/Quality-Engineering (codes tests + owns QA gate)
│                  R0 Architecture, R1 Contract, R2 Security, R3 DoD, R4 Red-Team (review-only)
└─ Governance:     A1 (Architect) → docs/architecture/**; G1 Project Historian → lifecycle records (doc-only)
* A1 is foundational; unblocks both leads.
```

Full per-agent specs (Name / Goal / Responsibilities / Files owned / Dependencies / Deliverables /
Acceptance) are in `docs/agents/`. Summary of ownership boundaries (exclusive write scope) —
**non-normative excerpt; canonical source: [../governance/OWNERSHIP.md](../governance/OWNERSHIP.md)** (module-ownership rows enforced by harness V-own-sync):

| Agent | Owns |
|---|---|
| A1 | `contracts/**`, `packages/shared/**`, `docs/architecture/**` (except `decisions/` → G1), `docs/technology/TDR.md` (Architect docs) |
| A2 | `docker-compose.yml`, `docker/**`, `*/Dockerfile`, `.env.example`, `.gitignore`, `README.md`, `.github/**` |
| A3 | `backend/prisma/**`, `backend/src/db/**` |
| A4 | `backend/package.json`, `backend/tsconfig.json`, `backend/src/{app.ts,server.ts,core,plugins}/**` |
| A5 | `backend/src/modules/auth/**`, `backend/src/mail/**` |
| A6 | `backend/src/modules/teams/**` |
| A7 | `backend/src/modules/tickets/**` |
| A8 | `backend/src/modules/comments/**` |
| A15 | `backend/src/modules/epics/**` (Epics Backend) |
| A9 | `frontend/{package.json,tsconfig.json,vite.config.ts,index.html}`, `frontend/src/{app,lib,components}/**` |
| A10 | `frontend/src/features/auth/**` |
| A11 | `frontend/src/features/{teams,epics}/**` |
| A12 | `frontend/src/features/board/**` |
| A13 | `frontend/src/features/{tickets,comments}/**` |
| A14 | `backend/tests/**`, `frontend/tests/**`, `e2e/**`, `docs/quality/qa/**` |
| R0/R1/R2/R3/R4 | `docs/quality/reviews/<Rn>-*` only (no application code) |
| G1 | `CHANGELOG.md`, `docs/architecture/decisions/**`, `docs/governance/**`, `docs/quality/evidence/INDEX.md`, `docs/technology/technology-changes.md`, `docs/technology/TECHNOLOGY_GOVERNANCE.md` (Project Historian; doc-only; logs TCRs) |

---

## Part C — Communication Model
1. **Contract is the API.** `contracts/openapi.yaml` + `@app/shared` are the only cross-track interface; A1 freezes them before feature agents start. Contract changes go through the Master Orchestrator and re-trigger R1 (and R0 if structure changed).
2. **File ownership = merge safety.** Disjoint write boundaries + git worktrees → no conflicts.
3. **Handoff notes.** Each agent writes `docs/process/handoffs/<id>.md` (deliverables, interfaces, decisions, TODOs).
4. **Orchestrator integrates.** The Master Orchestrator drives agents, merges, and gates; A1 owns the contract/plan (see OWNERSHIP.md); A0 is a subordinate delegate that only relays and reports (owns nothing, never approves).
5. **Claude Code mechanics.** The Master Orchestrator (via its A0 relay delegate) spawns build agents with `isolation: "worktree"`; each returns a structured summary. Review agents run read-only. Resume an agent with SendMessage to address findings. A0 only relays/reports — it never approves, merges, or owns.

---

## Part D — Roadmap, Graphs, Phases

### Execution phases
| Phase | Parallel agents | Exit gate |
|---|---|---|
| 0 Foundation | A1, A2, A3, A4, A9 | Contract frozen; server boots; compose healthy; empty DB migrates |
| 1 Features | BE: A5,A6,A15,A7,A8 · FE: A9→(A10,A11,A12,A13) | Endpoints match contract; screens work vs mock |
| 2 Integration | Master Orch (+A2) | FE→real BE; happy paths pass end-to-end |
| 3 Enterprise Quality | A14(QA), R0, R1, R2, R4 (parallel) | QA gate PASS (coverage+RTM); R0/R2/R4 no High/Critical; R1 zero drift |
| 4 DoD sign-off | R3 + fixes | Every §13 box checked on clean `docker compose up --build` |

### Agent dependency graph
```
A1 → {A2, A9};  A1 → A4(scaffold) → A3 → A4(core)   # cycle-break: A4 writes package.json first, A3 builds the DB client, A4 then wires it
{A3, A4(core)} → {A5, A6};  A6 → A15(epics) → A7 → A8
A9 → {A10, A11, A12, A13}
{A5..A8, A15, A10..A13} → A14
integration → {A14, R0, R1, R2, R4} → R3
```

### Critical path
`A1 → A4(scaffold) → A3 → A4(core) → A15 → A7 → A8 → A14(QA) → R3` (ticket/comment chain). Strongest model/effort to A7 and A12.

### Feature-complete (all 15; see MASTER-ORCHESTRATOR.md)
1. Implementation · 2. Automated tests pass · 3. Manual verification · 4. RTM complete ·
5. R0 architecture · 6. R2 security · 7. R4 red team · 8. R3 DoD ·
9. Docs updated · 10. ADRs updated on architecture change · 11. CHANGELOG updated · 12. Bug Log updated ·
13. Evidence repository complete · 14. Contract conformance (R1: zero drift) · 15. Code review (R5).
(Contract drift blocks 2, 4, 11–15.)

### Maximizing parallelism
- Contract-first splits the project into 2 parallel tracks (BE + FE-vs-mock).
- Worktree isolation → up to 8 build agents concurrently in Phase 1.
- A9 freezes design system + client + route-registry before A10–A13 start (no inter-screen waiting).
- A7/A8 code against A5/A6 contracts; FKs integrated at merge.
- All 5 quality agents (A14, R0, R1, R2, R4) run in parallel over the same integration branch in Phase 3.
- A2 and A14 run start-to-finish alongside features.

---

## Part E — Risk Register
Moved to its own document → **[RISK_REGISTER.md](RISK_REGISTER.md)** (kept separate so it can be reviewed and
updated independently across the lifecycle).

---

## How to run this plan
1. Confirm `docs/requirements/REQUIREMENTS.md` and this plan.
2. Phase 0: A1 first (contract + TDR) → A2 ‖ A4(scaffold) ‖ A9 → A3 → A4(core). (Authoritative order: see the Spawn order in agents/README + MASTER-ORCHESTRATOR.)
3. Freeze the contract; Phase 1: spawn the 7 feature agents in worktrees.
4. Phase 2: the Master Orchestrator merges and points FE at the real backend (A0 relays status only).
5. Phase 3: A13 + R1/R2/R3.
6. Phase 4: R4 DoD audit on a clean checkout; fix loop until all §13 boxes pass.
