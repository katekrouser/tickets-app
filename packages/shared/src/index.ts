/**
 * @app/shared — public entry point (ADR-0006).
 *
 * The single source of truth shared by backend and frontend:
 *   1. Generated OpenAPI types (openapi-typescript output — ./openapi.d.ts)
 *   2. TicketType / TicketState enum constants + arrays + types
 *   3. errorCodes registry (aligns with ADR-0003 `code` values)
 *   4. RouteSchemas interface + generated `schemas` (Fastify/Ajv JSON Schemas)
 *
 * Import ONLY via the `@app/shared` specifier — never a relative path into this package.
 */
import type { JSONSchema7 } from 'json-schema';

// 1) Generated OpenAPI types (openapi-typescript output).
//    NodeNext-style explicit `.js` specifier: type-only export, erased at runtime;
//    resolves to ./openapi.d.ts for types (src) and dist/openapi.d.ts (built).
export type { paths, components, operations } from './openapi.js';

// 2) Enum constants — mirror contracts/openapi.yaml exactly (single source of truth).
export const TicketType = {
  bug: 'bug',
  feature: 'feature',
  fix: 'fix',
} as const;
export type TicketType = (typeof TicketType)[keyof typeof TicketType];
export const TICKET_TYPES: readonly TicketType[] = ['bug', 'feature', 'fix'] as const;

export const TicketState = {
  new: 'new',
  ready_for_implementation: 'ready_for_implementation',
  in_progress: 'in_progress',
  ready_for_acceptance: 'ready_for_acceptance',
  done: 'done',
} as const;
export type TicketState = (typeof TicketState)[keyof typeof TicketState];
export const TICKET_STATES: readonly TicketState[] = [
  'new',
  'ready_for_implementation',
  'in_progress',
  'ready_for_acceptance',
  'done',
] as const;

// 3) Domain error codes — stable SCREAMING_SNAKE machine codes (ADR-0003).
//    Consumers MAY add new codes freely; these are the canonical shared ones.
export const errorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL',
  // auth
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_USED: 'TOKEN_USED',
  // teams
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  TEAM_NAME_TAKEN: 'TEAM_NAME_TAKEN',
  TEAM_HAS_DEPENDENTS: 'TEAM_HAS_DEPENDENTS',
  // epics
  EPIC_NOT_FOUND: 'EPIC_NOT_FOUND',
  EPIC_REFERENCED: 'EPIC_REFERENCED',
  EPIC_TEAM_MISMATCH: 'EPIC_TEAM_MISMATCH',
  // tickets / comments
  TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
} satisfies Record<string, string>;
export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

// 4) JSON-Schema export API (consumed by A4's Fastify/Ajv validation).
export interface RouteSchemas {
  body?: JSONSchema7;
  params?: JSONSchema7;
  querystring?: JSONSchema7;
  /** Keyed by HTTP status code. */
  response: Record<number, JSONSchema7>;
}

/** Keyed by OpenAPI operationId; each value is Fastify-`schema`-shaped. Generated. */
export { schemas } from './schemas.js';
