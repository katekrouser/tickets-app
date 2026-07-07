/**
 * Application composition (A4 Backend Core).
 *
 * Builds the shared Fastify runtime that feature modules plug into:
 *   - central error + not-found contract (ADR-0003),
 *   - global bearer auth except PUBLIC_ROUTES (ADR-0004),
 *   - public /health + /ready (/ready probes the DB via ADR-0002's client),
 *   - feature-module registration under the frozen prefix table (ADR-0005).
 *
 * The DB client and core helpers are imported via their FROZEN bare specifiers
 * (`backend/src/db`, `backend/src/core/errors`, `backend/src/core/auth`) — the
 * same specifiers feature modules use — which resolve via tsconfig `paths` at
 * compile time and via tsx (dev) / tsc-alias-rewritten output (prod) at runtime.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import { dbHealthcheck } from 'backend/src/db';
import { registerErrorHandler } from 'backend/src/core/errors';
import { registerAuth } from 'backend/src/core/auth';
import { getConfig } from './core/config.js';
import { featureModules } from './core/modules.js';

export function buildApp(): FastifyInstance {
  const config = getConfig();

  const app = Fastify({
    logger: { level: config.nodeEnv === 'production' ? 'info' : 'debug' },
  });

  // Register the error/not-found contract first (ADR-0003) so every downstream
  // failure — including validation and hook errors — maps to the ErrorBody shape.
  registerErrorHandler(app);

  // Apply bearer auth globally; PUBLIC_ROUTES pass through (ADR-0004).
  registerAuth(app);

  // Public liveness/readiness (both in PUBLIC_ROUTES).
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await dbHealthcheck();
      return { status: 'ready' };
    } catch (err) {
      _request.log.error({ err }, 'readiness check failed: database unreachable');
      reply.code(503);
      return { status: 'unavailable' };
    }
  });

  // Feature modules under their frozen prefixes (ADR-0005). Empty in Phase 0.
  for (const { plugin, prefix } of featureModules) {
    app.register(plugin, { prefix });
  }

  return app;
}
