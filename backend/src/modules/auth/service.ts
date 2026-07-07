/**
 * Auth service (A5) — full account lifecycle (REQUIREMENTS §3).
 *
 * All DB access is via the frozen prisma singleton (ADR-0002); all failure
 * outcomes are raised as DomainError subclasses (ADR-0003) and mapped to the
 * wire by A4's central handler; bearer tokens are minted only via issueToken
 * (ADR-0004). Passwords are hashed with Argon2id and never stored/logged raw.
 */
import type { FastifyBaseLogger } from 'fastify';
import { Prisma, type User } from '@prisma/client';
import { prisma } from 'backend/src/db';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from 'backend/src/core/errors';
import { issueToken } from 'backend/src/core/auth';
import { getConfig } from 'backend/src/core/config';
import { sendVerificationEmail } from 'backend/src/mail';
import { hashPassword, verifyPassword } from './password.js';
import { issueVerificationToken, invalidateUnusedTokens } from './tokens.js';

/** Public account shape (matches the OpenAPI `User` schema exactly). */
export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

/** Trim and lowercase an email for storage/lookup (citext also matches case-insensitively). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Issue a verification token and email the verification link. A transient SMTP
 * failure is logged but NOT propagated: the account already exists and the user
 * can request a fresh email via resend, so signup/resend must not hard-fail on
 * mail-server hiccups. The link carries the single-use verification token only.
 */
async function dispatchVerification(user: User, logger: FastifyBaseLogger): Promise<void> {
  const token = await issueVerificationToken(user.id);
  const { appBaseUrl } = getConfig();
  const verifyUrl = `${appBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (err) {
    logger.error({ err, userId: user.id }, 'failed to send verification email');
  }
}

/**
 * Register a new account: normalize email, hash password (Argon2id), persist an
 * unverified user, then dispatch a verification email. No auto-login. Throws
 * ConflictError(EMAIL_TAKEN) if the email is already registered.
 */
export async function signup(
  rawEmail: string,
  password: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const passwordHash = await hashPassword(password);

  let user: User;
  try {
    user = await prisma.user.create({ data: { email, passwordHash } });
  } catch (err) {
    // Unique email index (citext) — race-safe: even if two requests slip past a
    // pre-check, the DB constraint yields P2002 here.
    if (isUniqueViolation(err)) {
      throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw err;
  }

  await dispatchVerification(user, logger);
}

/**
 * Consume a single-use verification token: reject invalid/used/expired tokens
 * (400), otherwise atomically mark the token used and the user verified. Does
 * NOT log the user in (no token issued here).
 */
export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    throw new ValidationError('TOKEN_INVALID', 'This verification link is invalid.');
  }
  if (record.usedAt) {
    throw new ValidationError('TOKEN_USED', 'This verification link has already been used.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new ValidationError('TOKEN_EXPIRED', 'This verification link has expired. Request a new one.');
  }

  await prisma.$transaction(async (tx) => {
    // Atomically claim the token: the `usedAt: null` guard makes consumption
    // single-use and race-safe (a second concurrent verify claims 0 rows).
    const claimed = await tx.verificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new ValidationError('TOKEN_USED', 'This verification link has already been used.');
    }
    await tx.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  });
}

/**
 * Resend a verification email. Responds identically whether or not an eligible
 * (existing + unverified) account matches, to avoid account enumeration. When it
 * does match, prior unused tokens are invalidated before issuing a new one.
 */
export async function resendVerification(
  rawEmail: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return; // silent no-op (no enumeration)

  await invalidateUnusedTokens(user.id);
  await dispatchVerification(user, logger);
}

/**
 * Authenticate local credentials. 401 INVALID_CREDENTIALS for unknown email or
 * wrong password (indistinguishable); 403 EMAIL_NOT_VERIFIED for a valid but
 * unverified account; otherwise issue a bearer token (ADR-0004).
 */
export async function login(rawEmail: string, password: string): Promise<LoginResult> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);
  if (!passwordOk) {
    throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (!user.emailVerified) {
    throw new ForbiddenError('EMAIL_NOT_VERIFIED', 'Please verify your email before signing in.');
  }

  const token = issueToken({ id: user.id, email: user.email });
  return { token, user: toPublicUser(user) };
}
