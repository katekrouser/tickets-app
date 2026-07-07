import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from 'backend/src/core/config';

/**
 * Environment configuration loader (ADR-0007). Fail-fast validation of the frozen
 * env-var names. Each test builds a fresh, minimal-valid environment then mutates
 * one variable to assert the failure/derivation behaviour.
 */
/**
 * A valid high-entropy JWT_SECRET fixture (R4-H1): 64 hex chars, well over the
 * 32-char floor and not the known-weak committed default. Reused by every case
 * that needs loadConfig() to SUCCEED.
 */
const VALID_JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const BASE_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  BACKEND_PORT: '3000',
  APP_BASE_URL: 'http://localhost:8080',
  JWT_SECRET: VALID_JWT_SECRET,
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_FROM: 'no-reply@example.com',
};

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = { ...process.env };
  // Clear the frozen names so leakage from the outer env can't mask a failure.
  for (const k of [
    ...Object.keys(BASE_ENV),
    'JWT_TTL_HOURS',
    'SMTP_USER',
    'SMTP_PASS',
  ]) {
    delete process.env[k];
  }
  Object.assign(process.env, BASE_ENV);
});

afterEach(() => {
  process.env = saved;
});

describe('loadConfig (ADR-0007 fail-fast)', () => {
  it('loads a complete valid environment', () => {
    const c = loadConfig();
    expect(c.databaseUrl).toBe(BASE_ENV.DATABASE_URL);
    expect(c.backendPort).toBe(3000);
    expect(c.smtp.host).toBe('localhost');
    expect(c.smtp.port).toBe(1025);
  });

  it('defaults JWT_TTL_HOURS to 24 when unset (ADR-0004)', () => {
    delete process.env.JWT_TTL_HOURS;
    expect(loadConfig().jwtTtlHours).toBe(24);
  });

  it('honours an explicit JWT_TTL_HOURS', () => {
    process.env.JWT_TTL_HOURS = '12';
    expect(loadConfig().jwtTtlHours).toBe(12);
  });

  it('throws when a required variable is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when a required variable is blank/whitespace', () => {
    process.env.APP_BASE_URL = '   ';
    expect(() => loadConfig()).toThrow(/APP_BASE_URL/);
  });

  it('rejects a non-positive-integer port', () => {
    process.env.BACKEND_PORT = 'not-a-number';
    expect(() => loadConfig()).toThrow(/BACKEND_PORT/);
  });

  it('rejects a zero/negative port', () => {
    process.env.BACKEND_PORT = '0';
    expect(() => loadConfig()).toThrow(/BACKEND_PORT/);
  });

  it('allows empty SMTP_USER/SMTP_PASS (dev Mailhog)', () => {
    const c = loadConfig();
    expect(c.smtp.user).toBe('');
    expect(c.smtp.pass).toBe('');
  });

  it('defaults NODE_ENV to development when unset', () => {
    delete process.env.NODE_ENV;
    expect(loadConfig().nodeEnv).toBe('development');
  });
});

/**
 * R4-H1 regression: JWT_SECRET fail-fast hardening. loadConfig() must refuse to
 * boot on a forgeable signing key — missing/empty, shorter than 32 chars, or the
 * known-weak committed default `dev-only-change-me`. BASE_ENV is otherwise fully
 * valid so only the mutated JWT_SECRET is under test.
 */
describe('loadConfig — JWT_SECRET hardening (R4-H1)', () => {
  it('throws when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is empty / whitespace-only', () => {
    process.env.JWT_SECRET = '   ';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    // 31 chars — one below the floor.
    process.env.JWT_SECRET = 'a'.repeat(31);
    expect(() => loadConfig()).toThrow(/JWT_SECRET.*32/);
  });

  it('accepts a JWT_SECRET of exactly 32 characters (boundary)', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    expect(loadConfig().jwtSecret).toHaveLength(32);
  });

  it('throws when JWT_SECRET is the known-weak default dev-only-change-me', () => {
    process.env.JWT_SECRET = 'dev-only-change-me';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });
});
