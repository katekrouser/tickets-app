/**
 * Backend Module Registration — FROZEN convention (ADR-0005).
 *
 * Each feature module (A5–A8, A15) ships `backend/src/modules/<name>/index.ts`
 * with a DEFAULT export of a `FastifyPluginAsync`, and is mounted under its
 * frozen prefix from the table below. app.ts iterates this registry and calls
 * `app.register(plugin, { prefix })` for each entry — mirroring the frontend
 * route-registry (ADR-0008): the set tolerates ZERO modules, so the server
 * boots today with none registered.
 *
 * To add a module (still one line, A4 owns app.ts / this registry):
 *   1. the feature agent ships modules/<name>/index.ts (default plugin),
 *   2. import it here and append its { plugin, prefix } entry.
 *
 * FROZEN prefix table (ADR-0005) — all five modules active in Phase 2:
 *   authModule     → /api/auth       (A5)
 *   teamsModule    → /api/teams      (A6; also serves GET /:teamId/epics → listTeamEpics)
 *   epicsModule    → /api/epics      (A15)
 *   ticketsModule  → /api/tickets    (A7)
 *   commentsModule → /api/tickets    (A8; defines /:ticketId/comments)
 *
 * tickets and comments intentionally share the /api/tickets prefix: Fastify
 * encapsulates each plugin, and their route sets are disjoint (tickets owns
 * /, /:id, …; comments owns /:ticketId/comments), so there is no collision.
 */
import type { FastifyPluginAsync } from 'fastify';
import authModule from 'backend/src/modules/auth';
import teamsModule from 'backend/src/modules/teams';
import epicsModule from 'backend/src/modules/epics';
import ticketsModule from 'backend/src/modules/tickets';
import commentsModule from 'backend/src/modules/comments';

export interface ModuleRegistration {
  plugin: FastifyPluginAsync;
  prefix: string;
}

/** Feature modules to mount under their frozen prefixes (ADR-0005). */
export const featureModules: ModuleRegistration[] = [
  { plugin: authModule, prefix: '/api/auth' },
  { plugin: teamsModule, prefix: '/api/teams' },
  { plugin: epicsModule, prefix: '/api/epics' },
  { plugin: ticketsModule, prefix: '/api/tickets' },
  { plugin: commentsModule, prefix: '/api/tickets' },
];
