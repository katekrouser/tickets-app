import { beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig } from 'backend/src/core/config';
import { registerAuth, issueToken, verifyToken } from 'backend/src/core/auth';

/**
 * Bearer-token contract (ADR-0004). Uses a real Fastify instance + @fastify/jwt
 * (the single JWT lib) so issue/verify exercise the production code path. Covers
 * the happy round-trip, an EXPIRED token → TOKEN_EXPIRED, and a malformed token
 * → TOKEN_INVALID (both mapped to 401 UnauthorizedError per ADR-0003).
 *
 * registerAuth captures the SAME app as the standalone issue/verify helpers'
 * jwt host, so a token signed via `app.jwt.sign` here verifies through the
 * frozen `verifyToken` helper under the identical secret.
 */
let app: FastifyInstance;

beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    BACKEND_PORT: '3000',
    APP_BASE_URL: 'http://localhost:8080',
    // R4-H1: JWT_SECRET must be >=32 high-entropy chars; 64-hex fixture.
    JWT_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'no-reply@example.com',
  });
  loadConfig();
  app = Fastify();
  registerAuth(app);
  await app.ready();
});

describe('issueToken / verifyToken (ADR-0004)', () => {
  it('round-trips a verified identity', () => {
    const token = issueToken({ id: 'user-1', email: 'a@example.com' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
    expect(verifyToken(token)).toEqual({ id: 'user-1', email: 'a@example.com' });
  });

  it('maps an expired token to UnauthorizedError(TOKEN_EXPIRED)', () => {
    const past = Math.floor(Date.now() / 1000) - 3600; // 1h ago
    const expired = app.jwt.sign({ sub: 'user-1', email: 'a@example.com', exp: past });
    try {
      verifyToken(expired);
      throw new Error('expected verifyToken to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('TOKEN_EXPIRED');
      expect((e as { status?: number }).status).toBe(401);
    }
  });

  it('maps a malformed token to UnauthorizedError(TOKEN_INVALID)', () => {
    try {
      verifyToken('not-a-real-jwt');
      throw new Error('expected verifyToken to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('TOKEN_INVALID');
      expect((e as { status?: number }).status).toBe(401);
    }
  });
});
