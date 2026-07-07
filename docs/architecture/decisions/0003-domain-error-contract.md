# ADR-0003: Domain Error Contract

- **Status:** Accepted
- **Date:** YYYY-MM-DD
- **Owner:** A4 (Backend Core) · **Producer:** A4 · **Consumers:** A5, A6, A7, A8, A15 (raise errors); A4 (maps them); R0/R2/R5 (verify)
- **Related:** ADR-0002 (DB client), ADR-0001 (stack), `contracts/openapi.yaml` (shared `Error` schema)
- **Resolves:** Interface Readiness Audit **I-1** (domain-error signaling undefined)

## Context
Feature modules must produce HTTP 400/401/403/404/409 outcomes (team-delete-with-dependents → 409; cross-team
epic → 400) but had no defined way to signal them; A4's central handler had no defined input type. This contract
pins exactly how a module raises a domain error and how A4 maps it to the wire.

## File locations & ownership
- `backend/src/core/errors.ts` — the error types + handler registrar. **Owned by A4.**
- Consumers import from the exact specifier **`backend/src/core/errors`** (A4 guarantees `backend/tsconfig.json`
  resolves this bare specifier, consistent with ADR-0002's `backend/src/db`).

## Exported symbols & exact TypeScript signatures
```ts
// backend/src/core/errors.ts  (produced by A4)

/** Wire shape — MUST equal the OpenAPI `Error` schema in contracts/openapi.yaml. */
export interface ErrorBody {
  code: string;                              // stable SCREAMING_SNAKE machine code; values enumerated in Examples
  message: string;                           // human-readable, safe to expose
  details?: Record<string, unknown>;         // optional structured context
}

export abstract class DomainError extends Error {
  abstract readonly status: 400 | 401 | 403 | 404 | 409;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  protected constructor(code: string, message: string, details?: Record<string, unknown>);
  toBody(): ErrorBody;                        // { code, message, details? }
}

export class ValidationError   extends DomainError { readonly status: 400; constructor(code: string, message: string, details?: Record<string, unknown>); }
export class UnauthorizedError extends DomainError { readonly status: 401; constructor(code: string, message: string, details?: Record<string, unknown>); }
export class ForbiddenError    extends DomainError { readonly status: 403; constructor(code: string, message: string, details?: Record<string, unknown>); }
export class NotFoundError     extends DomainError { readonly status: 404; constructor(code: string, message: string, details?: Record<string, unknown>); }
export class ConflictError     extends DomainError { readonly status: 409; constructor(code: string, message: string, details?: Record<string, unknown>); }

/** Registered once by A4 in app.ts. Maps DomainError → {status, toBody()};
 *  Fastify schema-validation failures → 400 ValidationError shape;
 *  anything else → 500 { code:"INTERNAL", message:"Internal Server Error" } with NO stack/detail leak. */
export function registerErrorHandler(app: import('fastify').FastifyInstance): void;
```

## Lifecycle
A4 delivers `errors.ts` + calls `registerErrorHandler(app)` during **A4 Step CORE** (after A3, before feature
modules integrate). Consumers import and throw from **Phase 1** onward. No handoff needed — this ADR is the contract.

## Examples (canonical, not illustrative — implement exactly this way)
```ts
// A6 teams — delete blocked by dependents:
import { ConflictError } from 'backend/src/core/errors';
throw new ConflictError('TEAM_HAS_DEPENDENTS', 'Team has tickets or epics and cannot be deleted');

// A7 tickets — epic from another team:
import { ValidationError } from 'backend/src/core/errors';
throw new ValidationError('EPIC_TEAM_MISMATCH', 'Epic must belong to the ticket\'s team');

// A8 comments — ticket not found:
import { NotFoundError } from 'backend/src/core/errors';
throw new NotFoundError('TICKET_NOT_FOUND', 'Ticket does not exist');
```

## Forbidden usages
- Throwing raw `Error`, strings, or plain objects for domain outcomes.
- Setting `reply.code(...)`/HTTP status manually inside a module for an error path (throw a `DomainError` instead).
- Using any status outside `400|401|403|404|409` for a domain error (500 is handler-only, never thrown by modules).
- Leaking stack traces, SQL, or secrets in `message`/`details`.
- Re-defining error classes in a module; the only source is `backend/src/core/errors`.

## Compatibility rules
- `ErrorBody` is frozen and MUST be byte-identical to the OpenAPI `Error` schema (A1 keeps them in sync).
- New machine `code` values may be ADDED by consumers freely; changing `ErrorBody` fields, the status union, or a
  class name/signature requires a **superseding ADR** (MO-ratified, G1-logged).
