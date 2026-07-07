/**
 * Client-side validation that MIRRORS the server contract (server remains authoritative —
 * REQUIREMENTS §3, contracts/openapi.yaml). These checks give fast feedback; the backend
 * re-validates every request and its response is the source of truth.
 *
 * Contract bounds:
 *   - email: trimmed, compared case-insensitively, 3..254 chars, email format.
 *   - signup password: 8..200 chars (REQUIREMENTS §3: ≥ 8 chars).
 *   - login password: 1..200 chars (presence only; server verifies credentials).
 */

/** Pragmatic email shape check (server is authoritative on true validity/uniqueness). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_MIN = 3;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

/** Validate an email against the contract bounds. Returns an error message or undefined. */
export function validateEmail(raw: string): string | undefined {
  const email = raw.trim();
  if (!email) return 'Email is required.';
  if (email.length < EMAIL_MIN) return 'Email is too short.';
  if (email.length > EMAIL_MAX) return `Email must be at most ${EMAIL_MAX} characters.`;
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return undefined;
}

/** Validate a new-account password (sign-up). */
export function validateNewPassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return undefined;
}

/** Validate a login password (presence + max length; the server verifies the secret). */
export function validateLoginPassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return undefined;
}
