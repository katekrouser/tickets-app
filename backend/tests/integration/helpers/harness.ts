/**
 * Integration-test harness (A14). Boots the REAL Fastify app (all feature
 * modules, global auth, error contract) against a REAL Postgres reached via the
 * Prisma singleton, and drives it with Supertest (TDR: Vitest + Supertest, BE).
 *
 * DB-GATED: these suites require a migrated Postgres (DATABASE_URL). When it is
 * absent the suites self-skip (see `dbDescribe`) so `npm test` stays green in
 * environments without Docker/Postgres — they run for real in CI/Docker.
 *
 * Usage in a suite:
 *   import { dbDescribe, getHarness } from './helpers/harness';
 *   dbDescribe('...', () => { const h = getHarness(); ... h.api.post(...) });
 */
import { describe } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

export const DB_AVAILABLE = Boolean(process.env.DATABASE_URL);

/** describe() that runs only when a database is configured; otherwise skips. */
export const dbDescribe = DB_AVAILABLE ? describe : describe.skip;

function ensureEnv(): void {
  const defaults: Record<string, string> = {
    NODE_ENV: 'test',
    BACKEND_PORT: '3000',
    APP_BASE_URL: 'http://localhost:8080',
    // R4-H1: JWT_SECRET must be >=32 high-entropy chars; 64-hex fixture.
    JWT_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    JWT_TTL_HOURS: '24',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'no-reply@example.com',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

export interface Harness {
  app: FastifyInstance;
  api: supertest.Agent;
  /** Prisma singleton (typed loosely to avoid importing generated client types here). */
  prisma: any;
  /** Wipe all business rows in FK-safe order. */
  reset(): Promise<void>;
  /** Create a verified user and return a valid bearer token + the user row. */
  createVerifiedUser(email: string, password?: string): Promise<{ token: string; user: any }>;
  /** Authorization header value for a token. */
  bearer(token: string): [string, string];
  close(): Promise<void>;
}

/**
 * Lazily build the harness inside beforeAll. Returns an accessor whose fields are
 * populated once `init()` runs — so importing a suite never touches the DB/config.
 */
export function getHarness() {
  const h = {} as Harness;

  h.close = async () => {
    if (h.app) await h.app.close();
  };

  async function init(): Promise<Harness> {
    ensureEnv();
    // Import lazily so module load never triggers config/DB side effects.
    const { loadConfig } = await import('backend/src/core/config');
    const { buildApp } = await import('backend/src/app.js');
    const { prisma } = await import('backend/src/db');
    const { issueToken } = await import('backend/src/core/auth');
    const { hashPassword } = await import('backend/src/modules/auth/password.js');

    loadConfig();
    h.app = buildApp();
    await h.app.ready();
    h.api = supertest(h.app.server);
    h.prisma = prisma;

    h.reset = async () => {
      await prisma.comment.deleteMany();
      await prisma.ticket.deleteMany();
      await prisma.epic.deleteMany();
      await prisma.verificationToken.deleteMany();
      await prisma.team.deleteMany();
      await prisma.user.deleteMany();
    };

    h.createVerifiedUser = async (email, password = 'password12345') => {
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email: email.trim().toLowerCase(), passwordHash, emailVerified: true },
      });
      const token = issueToken({ id: user.id, email: user.email });
      return { token, user };
    };

    h.bearer = (token) => ['Authorization', `Bearer ${token}`];

    return h;
  }

  return { h, init };
}
