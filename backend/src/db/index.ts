// Public entrypoint for the database layer — ADR-0002.
//
// The frozen part of this contract is the `prisma` re-export; consumers import
// `{ prisma } from 'backend/src/db'`. `getDb()` and `dbHealthcheck()` are
// convenience helpers (not part of the frozen signature) so callers such as
// A4's `/ready` probe can run a trivial liveness query without reaching into
// `prisma.$queryRaw` directly.

import type { PrismaClient } from '@prisma/client';
import { prisma } from './client.js';

export { prisma };

/** Returns the shared singleton PrismaClient. */
export function getDb(): PrismaClient {
  return prisma;
}

/**
 * Liveness probe for the database connection. Runs a trivial `SELECT 1`.
 * Resolves `true` on success; rejects (throws) if the DB is unreachable, so
 * callers can map failure to a 503 in the `/ready` handler.
 */
export async function dbHealthcheck(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
