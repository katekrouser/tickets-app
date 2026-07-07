# ADR-0002: Database Client Contract

- **Status:** Accepted
- **Date:** YYYY-MM-DD
- **Deciders:** Master Orchestrator, Architect (A1)
- **Owning agent(s):** **A3** (owns `backend/src/db/**`)
- **Related:** ADR-0001 (stack), `docs/agents/build/A3-persistence.md`, `docs/technology/TDR.md`

## Context
Six agents (A4, A5, A6, A7, A8, A15) need database access. Without a single pinned client export, each could
instantiate its own `PrismaClient` (connection-pool exhaustion, inconsistent config) or assume a different import
shape (breaking A4's core wiring). A4 explicitly reported this as a blocking ambiguity.

## Decision
`backend/src/db` exposes **one** database client via a **frozen export signature**:

| Item | Value |
|---|---|
| **Owner** | A3 |
| **Export** | `export const prisma` (a singleton `PrismaClient` instance) |
| **Definition file** | `backend/src/db/client.ts` |
| **Public entrypoint** | `backend/src/db/index.ts` (re-exports `{ prisma }`) |
| **Consumer import** | `import { prisma } from 'backend/src/db'` |
| **Consumers** | A4, A5, A6, A7, A8, A15 |

No consumer instantiates its own client; all DB access goes through this singleton. Liveness checks (e.g. A4's
`/ready`) run a trivial query through `prisma` — no extra exported helper is part of the frozen signature.

## Change control (frozen)
**No agent may change the export signature** (`prisma`, its type, `client.ts`/`index.ts` locations) **without an
approved superseding ADR and an update to this contract**, ratified by the Master Orchestrator. A3 owns the change;
G1 logs it; consumers are notified before any edit.

## Alternatives considered
| Option | Rejected because |
|---|---|
| Per-module `new PrismaClient()` | connection-pool exhaustion; inconsistent config |
| `getDb()` factory / exported healthcheck helper | wider surface than needed; a single `prisma` singleton suffices |

## Consequences
- **Positive:** one connection pool; deterministic import for all six consumers; A4's core wiring unblocked.
- **Negative / trade-offs:** the signature is rigid by design (that is the point) — evolution requires an ADR.

## Verification
R0 (architecture) confirms all six consumers import `{ prisma } from 'backend/src/db'` and none constructs a client;
R5 (code review) flags any deviation. Evidence: `docs/quality/evidence/INDEX.md`.
