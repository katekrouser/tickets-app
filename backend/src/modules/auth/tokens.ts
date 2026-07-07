/**
 * Email-verification token lifecycle (A5).
 *
 * A verification token is a 256-bit cryptographically-random value stored in the
 * `VerificationToken` table (ADR-0002 prisma singleton). It is single-use and
 * expires 24h after issue (REQUIREMENTS §3). This is NOT a JWT and is unrelated
 * to the bearer-token auth contract (ADR-0004) — it is the one token allowed to
 * appear in a URL (the verification link).
 */
import { randomBytes } from 'node:crypto';
import { prisma } from 'backend/src/db';

/** Verification-token lifetime: 24 hours (REQUIREMENTS §3). */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Issue a fresh verification token for a user and persist it with a +24h expiry.
 * Returns the raw token to embed in the verification link.
 */
export async function issueVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex'); // 256-bit, URL-safe
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.verificationToken.create({ data: { token, userId, expiresAt } });
  return token;
}

/**
 * Invalidate every still-unused verification token for a user (used by resend so
 * a new token supersedes prior unused ones — REQUIREMENTS §3). Deleting the rows
 * makes any prior link resolve as invalid on next use.
 */
export async function invalidateUnusedTokens(userId: string): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { userId, usedAt: null } });
}
