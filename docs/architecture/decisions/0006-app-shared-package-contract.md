# ADR-0006: `@app/shared` Package Contract

- **Status:** Accepted · **Date:** YYYY-MM-DD
- **Owner:** A1 · **Producer:** A1 · **Consumers:** A4, A5, A6, A7, A8, A15 (backend), A9, A10, A11, A12, A13 (frontend), A14 (tests)
- **Related:** ADR-0001 (stack), ADR-0003 (error `ErrorBody`), TDR (openapi-typescript, npm workspaces)
- **Resolves:** Interface Readiness Audit **I-4** (shared package specifier + JSON-Schema export shape)

## Package specification (single-valued)
- **Package name:** `@app/shared` (npm-workspaces package; resolved identically in backend and frontend).
- **Location:** `packages/shared`. **Public entry:** `packages/shared/src/index.ts`.
- **Import specifier (the ONLY form any consumer uses):** `@app/shared`. Relative paths into `packages/shared/**` are forbidden.
- **Generation:** A1 runs **openapi-typescript** (TDR) to produce `packages/shared/src/openapi.d.ts` from `contracts/openapi.yaml`, and a build step that extracts operation schemas into `schemas` (below). Nothing is hand-authored that shadows generated output.

## Exported symbols & exact signatures
```ts
// packages/shared/src/index.ts  (produced by A1)

// 1) Generated OpenAPI types (openapi-typescript output):
export type { paths, components, operations } from './openapi';

// 2) Enum constants (single source; mirror contracts/openapi.yaml exactly):
export const TicketType  = { bug: 'bug', feature: 'feature', fix: 'fix' } as const;
export type  TicketType  = (typeof TicketType)[keyof typeof TicketType];
export const TICKET_TYPES: readonly TicketType[];
export const TicketState = { new: 'new', ready_for_implementation: 'ready_for_implementation',
  in_progress: 'in_progress', ready_for_acceptance: 'ready_for_acceptance', done: 'done' } as const;
export type  TicketState = (typeof TicketState)[keyof typeof TicketState];
export const TICKET_STATES: readonly TicketState[];

// 3) Domain error codes (align with ADR-0003 `code` values):
export const errorCodes: Record<string, string>;

// 4) JSON-Schema export API (consumed by A4's Fastify/Ajv validation):
import type { JSONSchema7 } from 'json-schema';
export interface RouteSchemas {
  body?: JSONSchema7;
  params?: JSONSchema7;
  querystring?: JSONSchema7;
  response: Record<number, JSONSchema7>;   // keyed by HTTP status code
}
/** Keyed by OpenAPI operationId; each value is Fastify-`schema`-shaped. */
export const schemas: Record<string, RouteSchemas>;
```

## Usage (canonical)
```ts
// A4 wiring validation for an operation:
import { schemas } from '@app/shared';
app.post('/', { schema: schemas['createTicket'] }, handler);   // body/params/querystring/response validated by Ajv

// Any backend/frontend consumer using an enum:
import { TicketState, TICKET_STATES } from '@app/shared';
```

## Lifecycle
A1 produces `@app/shared` during Phase 0 (with the contract + TDR), before A3/A4/A9. Regenerated whenever the
contract changes (contract change control). Consumers import from Phase 1 onward.

## Forbidden usages
- Importing via a relative `packages/shared/**` path instead of the `@app/shared` specifier.
- Re-declaring `TicketType`/`TicketState`/error codes anywhere else.
- Hand-editing `openapi.d.ts` or `schemas` (they are generated).
- Backend or frontend adding its own copy of request/response schemas.

## Compatibility rules
- The public API above (`paths`/`components`/`operations`, `TicketType`/`TicketState` + arrays, `errorCodes`,
  `RouteSchemas`, `schemas`) is frozen. Adding operations/schemas is additive (regenerated from the spec).
  Renaming/removing an export or changing `RouteSchemas` requires a superseding ADR (MO-ratified, G1-logged).
