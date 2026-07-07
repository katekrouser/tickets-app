import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Email-verification token lifecycle (A5, REQUIREMENTS §3):
 *   - a token is 256-bit random (64 hex chars),
 *   - it expires 24h after issue,
 *   - resend invalidates prior UNUSED tokens (deleteMany where usedAt:null).
 *
 * The DB singleton (ADR-0002) is mocked so this stays a pure unit test.
 */
const { create, deleteMany } = vi.hoisted(() => ({
  create: vi.fn(async ({ data }: { data: unknown }) => data),
  deleteMany: vi.fn(async () => ({ count: 1 })),
}));

vi.mock('backend/src/db', () => ({
  prisma: { verificationToken: { create, deleteMany } },
}));

import {
  issueVerificationToken,
  invalidateUnusedTokens,
} from 'backend/src/modules/auth/tokens.js';

beforeEach(() => {
  create.mockClear();
  deleteMany.mockClear();
});

describe('issueVerificationToken', () => {
  it('creates a 256-bit (64 hex char) single-use token', async () => {
    const token = await issueVerificationToken('user-1');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(create).toHaveBeenCalledOnce();
    const arg = create.mock.calls[0][0] as { data: { token: string; userId: string } };
    expect(arg.data.token).toBe(token);
    expect(arg.data.userId).toBe('user-1');
  });

  it('sets a +24h expiry (REQUIREMENTS §3)', async () => {
    const before = Date.now();
    await issueVerificationToken('user-1');
    const arg = create.mock.calls[0][0] as { data: { expiresAt: Date } };
    const ttl = arg.data.expiresAt.getTime() - before;
    const DAY = 24 * 60 * 60 * 1000;
    // Allow a small execution slack window.
    expect(ttl).toBeGreaterThanOrEqual(DAY - 2000);
    expect(ttl).toBeLessThanOrEqual(DAY + 2000);
  });
});

describe('invalidateUnusedTokens (resend supersedes prior tokens)', () => {
  it('deletes only the user\'s still-unused tokens', async () => {
    await invalidateUnusedTokens('user-9');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-9', usedAt: null } });
  });
});
