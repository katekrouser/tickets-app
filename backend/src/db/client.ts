// Database Client Contract — FROZEN (ADR-0002).
//
// `backend/src/db` exposes exactly ONE database client: the singleton `prisma`.
// The frozen export signature is `export const prisma` (a `PrismaClient`
// instance) defined here and re-exported by `./index.ts` (the public
// entrypoint). Consumers (A4, A5, A6, A7, A8, A15) do:
//     import { prisma } from 'backend/src/db'
// No consumer instantiates its own client — one process, one connection pool.
// Changing this signature requires a superseding ADR (see ADR-0002).

import { PrismaClient } from '@prisma/client';

// Reuse a single instance across hot-reloads in development (tsx watch), so we
// never accumulate connections against Postgres. In production this is just a
// plain singleton created once at module load.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
