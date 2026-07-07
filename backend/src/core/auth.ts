/**
 * Authentication Helper Contract — FROZEN (ADR-0004).
 *
 * The single source of JWT logic for the backend (bearer tokens via @fastify/jwt
 * 9.x on Fastify 5.x). Feature modules NEVER duplicate JWT logic or attach auth
 * per-route: A4 applies `requireAuth` globally through `registerAuth(app)`, and
 * every business route reads the verified identity from `request.authUser`.
 * Tokens travel ONLY in the `Authorization: Bearer <token>` header — never a URL.
 */
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { UnauthorizedError } from './errors.js';
import { getConfig } from './config.js';

/** Verified identity carried on every authenticated request. FROZEN shape. */
export interface AuthUser {
  id: string;
  email: string;
}

/** JWT claims embedded in the bearer token. */
export interface JwtClaims {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * The host Fastify instance holding the configured `@fastify/jwt` decorator.
 * Captured by registerAuth so the standalone issue/verify helpers (whose
 * signatures are frozen by ADR-0004) delegate to the single jwt instance
 * instead of instantiating their own — no ad-hoc JWT setup anywhere else.
 */
let jwtHost: FastifyInstance | undefined;

function host(): FastifyInstance {
  if (!jwtHost) {
    throw new Error('Auth not registered — call registerAuth(app) during boot before issuing/verifying tokens.');
  }
  return jwtHost;
}

/** Mint a bearer token for a verified user. exp = JWT_TTL_HOURS (ADR-0004 default 24h). */
export function issueToken(user: AuthUser): string {
  const { jwtTtlHours } = getConfig();
  return host().jwt.sign({ sub: user.id, email: user.email }, { expiresIn: `${jwtTtlHours}h` });
}

/** Verify a raw token; returns the identity or throws UnauthorizedError (ADR-0003) if invalid/expired. */
export function verifyToken(token: string): AuthUser {
  try {
    const claims = host().jwt.verify<JwtClaims>(token);
    return { id: claims.sub, email: claims.email };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'FAST_JWT_EXPIRED') {
      throw new UnauthorizedError('TOKEN_EXPIRED', 'Authentication token has expired');
    }
    throw new UnauthorizedError('TOKEN_INVALID', 'Invalid authentication token');
  }
}

/**
 * The ONLY public (unauthenticated) routes. FROZEN (ADR-0004). Matched as
 * `${METHOD} ${routeUrl}`. The backend serves no static assets (nginx serves
 * the SPA per ADR-0009), so the "static assets" clause has no entries here.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  'POST /api/auth/signup',
  'POST /api/auth/login',
  'GET /api/auth/verify-email',
  'POST /api/auth/resend-verification',
  'GET /health',
  'GET /ready',
] as const;

/**
 * Fastify preHandler enforcing auth. Public routes pass through untouched; every
 * other (matched) route requires a valid bearer token, whose identity is placed
 * on `request.authUser`. Applied GLOBALLY by registerAuth — never per-route.
 * (Unmatched routes never reach here; they go to the not-found handler → 404.)
 */
export const requireAuth: preHandlerHookHandler = async (request) => {
  // Unmatched route: skip auth so it falls through to the not-found handler
  // (unknown route → 404, never 401). The global preHandler also runs for 404s.
  if (request.is404) return;

  const routeUrl = request.routeOptions?.url ?? request.url;
  if (PUBLIC_ROUTES.includes(`${request.method} ${routeUrl}`)) return;

  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Missing or malformed Authorization header');
  }
  request.authUser = verifyToken(header.slice('Bearer '.length).trim());
};

/** Registered once by A4 in app.ts: configures @fastify/jwt and applies requireAuth to every route except PUBLIC_ROUTES. */
export function registerAuth(app: FastifyInstance): void {
  const { jwtSecret } = getConfig();
  app.register(fastifyJwt, { secret: jwtSecret });
  jwtHost = app;
  app.addHook('preHandler', requireAuth);
}

// Ambient augmentation — the verified identity on authenticated requests.
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
