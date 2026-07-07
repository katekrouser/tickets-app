/**
 * @/lib/api — the single typed HTTP client for the whole SPA (ADR-0008, ADR-0009 §4).
 *
 * - Typed from the contract: `paths` comes from `@app/shared` (openapi-typescript output, ADR-0006).
 * - `baseUrl` is EXACTLY `'/api'` — a relative path, identical in dev and prod (ADR-0009 §4).
 *   The dev server proxies `/api` → the backend/mock (see vite.config.ts); nginx does the same in prod.
 * - Auth: a request middleware attaches `Authorization: Bearer <token>` on every request, reading the
 *   current token from `@/lib/auth` storage. Skipped when signed out. (No effect against the Prism mock,
 *   which ignores auth; required for the real backend's global `requireAuth`, ADR-0004.)
 *
 * Usage: `api.GET('/teams')`, `api.POST('/tickets', { body })`, etc. Do NOT instantiate a second client.
 */
import createClient from 'openapi-fetch';
import type { paths } from '@app/shared';
import { getStoredToken } from '@/lib/auth';

export const api = createClient<paths>({ baseUrl: '/api' });

// Attach the current bearer token (if any) to every outgoing request.
api.use({
  onRequest({ request }) {
    const token = getStoredToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
});
