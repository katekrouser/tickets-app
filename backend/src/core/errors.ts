/**
 * Domain Error Contract — FROZEN (ADR-0003).
 *
 * Feature modules (A5–A8, A15) signal HTTP 400/401/403/404/409 outcomes by
 * throwing one of the DomainError subclasses below (imported from the exact
 * specifier `backend/src/core/errors`). `registerErrorHandler(app)` — called
 * once by A4 in app.ts — maps them to the wire `ErrorBody`, turns Fastify/Ajv
 * validation failures into a 400 ValidationError shape, and maps anything else
 * to a 500 with NO stack/detail/secret leak.
 *
 * `ErrorBody` MUST stay byte-identical to the OpenAPI `Error` schema
 * (contracts/openapi.yaml): { code, message, details? }.
 */
import type { FastifyError, FastifyInstance } from 'fastify';

/** Wire shape — equals the OpenAPI `Error` schema. */
export interface ErrorBody {
  /** Stable SCREAMING_SNAKE machine code. */
  code: string;
  /** Human-readable, safe to expose. */
  message: string;
  /** Optional structured context. */
  details?: Record<string, unknown>;
}

export abstract class DomainError extends Error {
  abstract readonly status: 400 | 401 | 403 | 404 | 409;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  protected constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    // Restore prototype chain / give a useful name for logs.
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }

  toBody(): ErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export class ValidationError extends DomainError {
  readonly status = 400 as const;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly status = 401 as const;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class ForbiddenError extends DomainError {
  readonly status = 403 as const;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class NotFoundError extends DomainError {
  readonly status = 404 as const;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class ConflictError extends DomainError {
  readonly status = 409 as const;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

/**
 * Registered ONCE by A4 in app.ts. Maps:
 *   - DomainError            → { status, toBody() }
 *   - Fastify/Ajv validation → 400 { code: 'VALIDATION_ERROR', message, details }
 *   - other client 4xx       → preserved status, safe code/message
 *   - anything else          → 500 { code: 'INTERNAL', message: 'Internal Server Error' }
 * Also sets a not-found handler so unknown routes return 404 in the ErrorBody shape.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    // 1) Domain outcome raised by a feature module.
    if (error instanceof DomainError) {
      reply.code(error.status).send(error.toBody());
      return;
    }

    const fe = error as FastifyError;
    const status = typeof fe.statusCode === 'number' ? fe.statusCode : 500;

    // 2) Schema/Ajv validation failure, or any malformed 400 request (e.g. bad JSON body).
    if (fe.validation || status === 400) {
      const body: ErrorBody = {
        code: 'VALIDATION_ERROR',
        message: fe.message || 'Request validation failed',
      };
      if (fe.validation) body.details = { validation: fe.validation };
      reply.code(400).send(body);
      return;
    }

    // 3) Other framework client errors (401/403/404/409) that reached the handler
    //    without being a DomainError — preserve status; expose only safe fields.
    if (status > 400 && status < 500) {
      reply.code(status).send({ code: fe.code ?? 'ERROR', message: fe.message } satisfies ErrorBody);
      return;
    }

    // 4) Unexpected server error → 500, NO stack/detail/secret leak. Log server-side only.
    request.log.error(error);
    reply.code(500).send({ code: 'INTERNAL', message: 'Internal Server Error' } satisfies ErrorBody);
  });

  // Unknown route → 404 in the ErrorBody shape. Auth is a post-routing preHandler,
  // so unmatched paths land here (404) rather than being rejected as 401.
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      code: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`,
    } satisfies ErrorBody);
  });
}
