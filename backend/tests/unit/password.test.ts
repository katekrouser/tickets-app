import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from 'backend/src/modules/auth/password.js';

/**
 * Password hashing (REQUIREMENTS §3): Argon2id via @node-rs/argon2. Plaintext is
 * never stored — only the self-describing encoded hash. Verifies the hash format,
 * round-trip verification, wrong-password rejection, and per-hash salting.
 */
describe('password hashing (Argon2id, REQUIREMENTS §3)', () => {
  it('produces an Argon2id-encoded hash that does not contain the plaintext', async () => {
    const plaintext = 'correct horse battery staple';
    const hash = await hashPassword(plaintext);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain(plaintext);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cretpassword');
    expect(await verifyPassword(hash, 's3cretpassword')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cretpassword');
    expect(await verifyPassword(hash, 'wrongpassword')).toBe(false);
  });

  it('salts each hash uniquely (same input → different hash)', async () => {
    const a = await hashPassword('samepassword123');
    const b = await hashPassword('samepassword123');
    expect(a).not.toBe(b);
    // ...yet both still verify.
    expect(await verifyPassword(a, 'samepassword123')).toBe(true);
    expect(await verifyPassword(b, 'samepassword123')).toBe(true);
  });
});
