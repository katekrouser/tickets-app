/**
 * Environment configuration loader — ADR-0007 (Environment Variable Contract).
 *
 * Reads ONLY the frozen ADR-0007 variable names and fails fast at boot if a
 * required one is missing, so the container never starts half-configured.
 * `.env.example` (owned by A2) enumerates every name; compose injects dev values.
 *
 * Frozen names read here: NODE_ENV, DATABASE_URL, BACKEND_PORT, APP_BASE_URL,
 * JWT_SECRET, JWT_TTL_HOURS, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * No other name is read at runtime (ADR-0007 forbids inventing env names).
 */

export interface SmtpConfig {
  host: string;
  port: number;
  /** May be empty in dev (Mailhog needs no auth). */
  user: string;
  /** May be empty in dev. */
  pass: string;
  from: string;
}

export interface AppConfig {
  nodeEnv: string;
  databaseUrl: string;
  backendPort: number;
  appBaseUrl: string;
  jwtSecret: string;
  jwtTtlHours: number;
  smtp: SmtpConfig;
}

let cached: AppConfig | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name} (see ADR-0007).`);
  }
  return value;
}

/** Minimum acceptable JWT_SECRET length (R4-H1). */
const JWT_SECRET_MIN_LENGTH = 32;

/**
 * Known-weak / publicly-committed JWT_SECRET values that must never be accepted
 * at boot. At minimum the placeholder shipped in `.env.example` (R4-H1) — anyone
 * who has seen the repo could forge tokens with it.
 */
const WEAK_JWT_SECRETS: readonly string[] = ['dev-only-change-me'];

/**
 * Load JWT_SECRET with fail-fast hardening (R4-H1). Reuses `required()` for the
 * missing/empty case, then rejects a secret that is too short or a known-weak
 * committed default so the app refuses to boot on a forgeable signing key.
 */
function requiredJwtSecret(): string {
  const value = required('JWT_SECRET');
  if (WEAK_JWT_SECRETS.includes(value)) {
    throw new Error(
      'Environment variable JWT_SECRET is set to a known-weak/default value; set a unique high-entropy secret (see ADR-0007).',
    );
  }
  if (value.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `Environment variable JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (got ${value.length}); set a high-entropy secret (see ADR-0007).`,
    );
  }
  return value;
}

function requiredPositiveInt(name: string): number {
  const raw = required(name);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer (got "${raw}").`);
  }
  return n;
}

function optionalPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer (got "${raw}").`);
  }
  return n;
}

/**
 * Validate and cache configuration. Call ONCE during boot (server.ts) before
 * building the app; throws (fail-fast) if a required variable is missing/invalid.
 */
export function loadConfig(): AppConfig {
  const config: AppConfig = {
    // Optional: defaults to development when unset.
    nodeEnv: process.env.NODE_ENV?.trim() || 'development',
    databaseUrl: required('DATABASE_URL'),
    backendPort: requiredPositiveInt('BACKEND_PORT'),
    appBaseUrl: required('APP_BASE_URL'),
    jwtSecret: requiredJwtSecret(),
    // ADR-0004 default lifetime is 24h.
    jwtTtlHours: optionalPositiveInt('JWT_TTL_HOURS', 24),
    smtp: {
      host: required('SMTP_HOST'),
      port: requiredPositiveInt('SMTP_PORT'),
      // Secrets, allowed empty in dev (Mailhog).
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from: required('SMTP_FROM'),
    },
  };
  cached = config;
  return config;
}

/** Returns the config loaded by loadConfig(); throws if boot never loaded it. */
export function getConfig(): AppConfig {
  if (!cached) {
    throw new Error('Config not loaded — call loadConfig() during boot before getConfig().');
  }
  return cached;
}
