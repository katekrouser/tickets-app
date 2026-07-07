# ADR-0004: Authentication Helper Contract

- **Status:** Accepted
- **Date:** YYYY-MM-DD
- **Owner:** A4 (Backend Core) · **Producer:** A4 · **Consumers:** A5 (issues/verifies on auth flows); A6, A7, A8, A15 + all business routes (auth applied globally); R2 (verifies)
- **Related:** ADR-0002 (DB client), ADR-0003 (errors — auth failures throw `UnauthorizedError`), `contracts/openapi.yaml`
- **Resolves:** Interface Readiness Audit **I-2** (auth-helper interface undefined)

## File locations & ownership
- `backend/src/core/auth.ts` — auth helpers + guard + global-auth registrar. **Owned by A4.**
- Consumers import from the exact specifier **`backend/src/core/auth`**.

## Exported symbols & exact TypeScript signatures
```ts
// backend/src/core/auth.ts  (produced by A4)
import type { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

/** Verified identity carried on every authenticated request. FROZEN payload shape. */
export interface AuthUser { id: string; email: string }

/** JWT claims embedded in the bearer token. */
export interface JwtClaims { sub: string; email: string; iat: number; exp: number }

/** Mint a bearer token for a verified user. exp = 24 hours from issue. */
export function issueToken(user: AuthUser): string;

/** Verify a raw token; returns the identity or throws UnauthorizedError (ADR-0003) if invalid/expired. */
export function verifyToken(token: string): AuthUser;

/** Fastify preHandler enforcing auth; on success sets request.authUser, else throws UnauthorizedError.
 *  Applied GLOBALLY by A4 (see registerAuth) — modules never attach it per-route. */
export const requireAuth: preHandlerHookHandler;

/** Registered once by A4 in app.ts: applies requireAuth to every route EXCEPT PUBLIC_ROUTES. */
export function registerAuth(app: FastifyInstance): void;

/** The ONLY public (unauthenticated) routes. Frozen. */
export const PUBLIC_ROUTES: readonly string[]; // exactly:
//   'POST /api/auth/signup', 'POST /api/auth/login', 'GET /api/auth/verify-email',
//   'POST /api/auth/resend-verification', 'GET /health', 'GET /ready', and static assets

// Ambient augmentation (declared in this file):
declare module 'fastify' { interface FastifyRequest { authUser?: AuthUser } }
```

## Lifecycle
A4 delivers `auth.ts` and calls `registerAuth(app)` in **Step CORE**. From Phase 1: A5 calls `issueToken` on
successful login and after successful verification-driven login flows; every business route (A6/A7/A8/A15/tickets)
reads `request.authUser` — auth is already enforced globally. No handoff; this ADR is the contract.

## Examples (canonical)
```ts
// A5 login success:
import { issueToken } from 'backend/src/core/auth';
const token = issueToken({ id: user.id, email: user.email });   // returns bearer string

// A7 tickets — current user (auth already enforced by global requireAuth):
const creatorId = request.authUser!.id;   // authUser is guaranteed present on business routes
```

## Forbidden usages
- Instantiating/duplicating JWT logic anywhere outside `backend/src/core/auth` (no `jsonwebtoken`, no ad-hoc `@fastify/jwt` setup in modules).
- Attaching `requireAuth` per-route in a module (auth is global; modules assume it).
- Placing any token in a URL/query string (bearer `Authorization` header only). The single-use email-verification token is A5's own token, NOT a JWT, and is out of this contract.
- Reading identity from anywhere but `request.authUser`.
- Editing `PUBLIC_ROUTES` from a module (A4 owns it).

## Compatibility rules
- **Targets `@fastify/jwt` 9.x on Fastify 5.x.** (The TDR must name Fastify 5.x; see "remaining items".)
- `AuthUser` and `PUBLIC_ROUTES` are frozen; changing either, or any signature, requires a superseding ADR (MO-ratified, G1-logged).
