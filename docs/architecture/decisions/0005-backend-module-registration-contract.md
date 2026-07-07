# ADR-0005: Backend Module Registration Contract

- **Status:** Accepted
- **Date:** YYYY-MM-DD
- **Owner:** A4 (Backend Core; owns `app.ts` registration) · **Producer:** A4 (defines convention + registers) · **Consumers:** A5, A6, A7, A8, A15 (each exports one plugin) · R0 verifies
- **Related:** ADR-0002 (DB client), ADR-0003 (errors), ADR-0004 (auth), `contracts/openapi.yaml`
- **Resolves:** Interface Readiness Audit **I-3** (module-registration convention undefined)

## File locations & ownership
- Each feature module's entrypoint: **`backend/src/modules/<name>/index.ts`** (owned by the module's agent).
- A4 imports and registers each in `backend/src/app.ts` (owned by A4).

## Exact contract — what a module exports
```ts
// backend/src/modules/<name>/index.ts   (owned by the module agent)
import type { FastifyPluginAsync } from 'fastify';

const <name>Module: FastifyPluginAsync = async (app) => {
  // define routes only; use { prisma } (ADR-0002); throw DomainError (ADR-0003);
  // auth is already global (ADR-0004) — read request.authUser.
  app.get('/', async (req) => { /* ... */ });
};

export default <name>Module;   // DEFAULT export, exactly this signature
```

## Exact contract — how A4 registers them (frozen prefixes)
```ts
// backend/src/app.ts  (owned by A4)
app.register(authModule,     { prefix: '/api/auth' });
app.register(teamsModule,    { prefix: '/api/teams' });
app.register(epicsModule,    { prefix: '/api/epics' });
app.register(ticketsModule,  { prefix: '/api/tickets' });
app.register(commentsModule, { prefix: '/api/tickets' }); // defines '/:ticketId/comments'
```

## Exported symbols (per consumer)
| Module agent | File | Default export symbol | Mounted prefix |
|---|---|---|---|
| A5 | `backend/src/modules/auth/index.ts` | `authModule: FastifyPluginAsync` | `/api/auth` |
| A6 | `backend/src/modules/teams/index.ts` | `teamsModule: FastifyPluginAsync` | `/api/teams` |
| A15 | `backend/src/modules/epics/index.ts` | `epicsModule: FastifyPluginAsync` | `/api/epics` |
| A7 | `backend/src/modules/tickets/index.ts` | `ticketsModule: FastifyPluginAsync` | `/api/tickets` |
| A8 | `backend/src/modules/comments/index.ts` | `commentsModule: FastifyPluginAsync` | `/api/tickets` (adds `/:ticketId/comments`) |

## Lifecycle
A4 defines this convention and the `app.ts` registrations in **Step CORE**. Each consumer delivers its
`modules/<name>/index.ts` default-export plugin in **Phase 1**; A4 wires them at integration. Adding a module = the
agent ships the plugin + A4 adds one `app.register` line (A4 owns `app.ts`). No handoff; this ADR is the contract.

## Examples (canonical — implement exactly this way)
```ts
// A6 backend/src/modules/teams/index.ts
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from 'backend/src/db';                 // ADR-0002
import { ConflictError } from 'backend/src/core/errors';  // ADR-0003

const teamsModule: FastifyPluginAsync = async (app) => {
  app.get('/', async (req) => prisma.team.findMany());                // GET /api/teams  (auth global, ADR-0004)
  app.delete('/:id', async (req) => {
    const has = await prisma.ticket.count({ where: { teamId: (req.params as any).id } });
    if (has) throw new ConflictError('TEAM_HAS_DEPENDENTS', 'Team has tickets or epics');
    /* ... */
  });
};
export default teamsModule;
```
```ts
// A4 backend/src/app.ts (registration)
import teamsModule from 'backend/src/modules/teams';
app.register(teamsModule, { prefix: '/api/teams' });
```

## Forbidden usages
- Any entrypoint export other than a **default** `FastifyPluginAsync` (no named-export entrypoint, no class).
- Calling `app.listen()`/bootstrapping inside a module (A4's `server.ts` owns lifecycle).
- Registering global hooks, decorators, error handlers, or auth inside a module (those are A4 core: ADR-0003/0004).
- Wrapping in `fastify-plugin` (modules are encapsulated; wrapping would leak scope) unless a superseding ADR allows it.
- Importing another module's internals; cross-module needs go through the DB (ADR-0002) and the shared contract — never another module's private code.
- Hard-coding a prefix inside the module (the prefix is applied by A4 at registration).

## Compatibility rules
- **Targets Fastify 5.x** (`FastifyPluginAsync` from `fastify`). The TDR must name Fastify 5.x (see "remaining items").
- The default-export-plugin signature and the prefix table are frozen; changes require a superseding ADR
  (MO-ratified, G1-logged). New modules extend the table via their own ADR/charter entry.
