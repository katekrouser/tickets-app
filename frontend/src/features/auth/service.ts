/**
 * Auth service layer — the ONLY place this feature touches `@/lib/api` (the single typed
 * client, ADR-0008/0009). Each function normalizes the openapi-fetch `{ data, error }`
 * result into a small discriminated union the screens can render directly.
 *
 * Endpoints (contracts/openapi.yaml → tag `auth`, all `security: []` / public):
 *   POST /auth/signup              201 { message } | 400 | 409 EMAIL_TAKEN
 *   POST /auth/login               200 { token, user } | 400 | 401 INVALID_CREDENTIALS | 403 EMAIL_NOT_VERIFIED
 *   GET  /auth/verify-email        302 → ${APP_BASE_URL}/login (success) | 400 TOKEN_*
 *   POST /auth/resend-verification 202 { message } | 400   (always 202 for existing/unknown — anti-enumeration)
 */
import { api } from '@/lib/api';
import { apiError, type ErrorInfo } from './errors';

export type Ok<T> = { ok: true; value: T };
export type Fail = { ok: false; error: ErrorInfo };
export type Result<T> = Ok<T> | Fail;

const fail = (error: ErrorInfo, fallback: string): Fail => ({
  ok: false,
  error: { code: error.code, message: error.message ?? fallback },
});

/** Register a new (unverified) account; the backend dispatches a verification email. */
export async function signup(email: string, password: string): Promise<Result<{ message: string }>> {
  const { data, error } = await api.POST('/auth/signup', {
    body: { email: email.trim(), password },
  });
  if (data) return { ok: true, value: { message: data.message } };
  return fail(apiError(error), 'Unable to create your account. Please try again.');
}

/** Authenticate with local credentials; on success returns a bearer token to hand to `login()`. */
export async function login(email: string, password: string): Promise<Result<{ token: string }>> {
  const { data, error } = await api.POST('/auth/login', {
    body: { email: email.trim(), password },
  });
  if (data) return { ok: true, value: { token: data.token } };
  return fail(apiError(error), 'Unable to sign in. Please try again.');
}

/** Request a fresh verification email. The server responds 202 regardless of account existence. */
export async function resendVerification(email: string): Promise<Result<{ message: string }>> {
  const { data, error } = await api.POST('/auth/resend-verification', {
    body: { email: email.trim() },
  });
  if (data) return { ok: true, value: { message: data.message } };
  return fail(apiError(error), 'Unable to send the verification email. Please try again.');
}

/**
 * Verify a single-use email token.
 *
 * The backend answers 302 → `${APP_BASE_URL}/login` on success (ADR-0009 §12). Browser `fetch`
 * transparently follows that same-origin redirect and lands on the SPA's `index.html` (a 200 HTML
 * body), so we parse as text and treat "no error envelope" as success — we never JSON-parse the
 * redirected HTML. A 400 carries a `TOKEN_EXPIRED | TOKEN_USED | TOKEN_INVALID` code.
 *
 * NOTE: this performs NO login — it only confirms the address (REQUIREMENTS §3: no auto-login).
 */
export async function verifyEmail(token: string): Promise<Result<null>> {
  const { error } = await api.GET('/auth/verify-email', {
    params: { query: { token } },
    parseAs: 'text',
  });
  if (error) return fail(apiError(error), 'This verification link is invalid.');
  return { ok: true, value: null };
}
