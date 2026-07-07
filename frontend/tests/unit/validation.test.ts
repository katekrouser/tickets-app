import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
} from '@/features/auth/validation';

/**
 * Client-side auth validation mirrors the server contract (REQUIREMENTS §3).
 * The server stays authoritative; these give fast feedback.
 */
describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
  });
  it('requires a value', () => {
    expect(validateEmail('   ')).toBeDefined();
  });
  it('rejects a malformed address', () => {
    expect(validateEmail('not-an-email')).toBeDefined();
    expect(validateEmail('a@b')).toBeDefined();
  });
  it('rejects an over-long address (>254)', () => {
    expect(validateEmail('a'.repeat(250) + '@example.com')).toBeDefined();
  });
});

describe('validateNewPassword (signup, ≥8 chars — §3)', () => {
  it('rejects a password shorter than the minimum', () => {
    expect(validateNewPassword('a'.repeat(PASSWORD_MIN - 1))).toBeDefined();
  });
  it('accepts a password at the minimum length', () => {
    expect(validateNewPassword('a'.repeat(PASSWORD_MIN))).toBeUndefined();
  });
  it('requires a value', () => {
    expect(validateNewPassword('')).toBeDefined();
  });
});

describe('validateLoginPassword (presence only)', () => {
  it('accepts any non-empty password (server verifies the secret)', () => {
    expect(validateLoginPassword('x')).toBeUndefined();
  });
  it('requires a value', () => {
    expect(validateLoginPassword('')).toBeDefined();
  });
});
