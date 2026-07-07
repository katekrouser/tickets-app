/**
 * Normalizes error payloads returned by `@/lib/api` (openapi-fetch) into a small,
 * safe-to-render shape. The shared error envelope is `{ code, message, details? }`
 * (contracts/openapi.yaml → components.schemas.Error), but a non-JSON response can
 * surface as a raw string, so we defensively narrow.
 */
import type { components } from '@app/shared';

export type ApiError = components['schemas']['Error'];

export interface ErrorInfo {
  code?: string;
  message?: string;
}

/** Extract a stable `code` and human message from an openapi-fetch `error` value. */
export function apiError(error: unknown): ErrorInfo {
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === 'string' ? e.code : undefined,
      message: typeof e.message === 'string' ? e.message : undefined,
    };
  }
  return {};
}
