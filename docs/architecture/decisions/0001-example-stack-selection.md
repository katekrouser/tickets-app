# ADR-0001: Stack selection (React/Vite · Fastify · Prisma/PostgreSQL)

- **Status:** Accepted (dependency-version pins partially **Superseded by ADR-0010** — see note)
- **Date:** YYYY-MM-DD
- **Deciders:** Master Orchestrator, Architect (A1)
- **Owning agent(s):** A1 Contract, A2 Platform, A3 Persistence, A4 Backend Core
- **Related:** REQUIREMENTS §2, DEVELOPMENT_PLAN "Stack (confirmed)", **ADR-0010** (Phase-3 dependency remediation, TDR v2)

> **Note (2026-07-07):** The overall stack shape recorded here (React/Vite · Fastify · Prisma/PostgreSQL) remains in force. The specific dependency-version pins for `@fastify/jwt`, `vite`, `vitest`, `typescript`, `@dnd-kit/sortable`, `lodash`, and the FE test-tooling declarations are **superseded by ADR-0010** (TDR v2) under Master-Orchestrator-approved TCR-001.

## Context
Requirements mandate a three-tier SPA + HTTP API + RDBMS started via `docker compose up --build`, with automated
migrations, Argon2id hashing, configurable SMTP, and a drag-and-drop Kanban board. Languages are unrestricted.

## Decision
Use React 18 + TypeScript + Vite (FE), Node 20 + TypeScript + Fastify (BE), Prisma + PostgreSQL 16 (persistence),
JWT bearer + Argon2id (auth), nodemailer (SMTP), Vitest/Supertest/Playwright (tests), Docker Compose (orchestration).

## Alternatives considered
| Option | Pros | Cons | Rejected because |
|---|---|---|---|
| Node/Fastify/Prisma (chosen) | Schema-first validation, first-class migrations, strong TS types | Node-specific | — |
| Django/DRF | Batteries included | Heavier for an SPA-first API; ORM migration ergonomics | team velocity |
| Spring Boot | Robust | Slower iteration for a hackathon timebox | timebox |

## Consequences
- **Positive:** contract-first OpenAPI seam; generated FE client; automated Prisma migrations satisfy the fresh-DB DoD.
- **Negative / trade-offs:** whole team standardizes on TS toolchain.
- **Follow-ups / new tech debt:** none at inception.

## Verification
Confirmed by GATE 0 (compose stack healthy, empty DB migrates) and R3 DoD audit. Evidence: `docs/quality/evidence/INDEX.md`.
