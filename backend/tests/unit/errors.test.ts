import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from 'backend/src/core/errors';

/**
 * Domain Error Contract (ADR-0003). Verifies each subclass carries its frozen
 * HTTP status and that toBody() equals the OpenAPI `Error` wire shape
 * ({ code, message, details? }) — omitting `details` when none was provided.
 */
describe('DomainError subclasses (ADR-0003)', () => {
  it('map to their frozen HTTP status codes', () => {
    expect(new ValidationError('X', 'x').status).toBe(400);
    expect(new UnauthorizedError('X', 'x').status).toBe(401);
    expect(new ForbiddenError('X', 'x').status).toBe(403);
    expect(new NotFoundError('X', 'x').status).toBe(404);
    expect(new ConflictError('X', 'x').status).toBe(409);
  });

  it('are instances of DomainError and Error', () => {
    const e = new ConflictError('EMAIL_TAKEN', 'taken');
    expect(e).toBeInstanceOf(DomainError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ConflictError');
  });

  it('toBody() omits details when absent', () => {
    expect(new NotFoundError('TEAM_NOT_FOUND', 'nope').toBody()).toEqual({
      code: 'TEAM_NOT_FOUND',
      message: 'nope',
    });
  });

  it('toBody() includes structured details when provided', () => {
    const body = new ValidationError('VALIDATION_ERROR', 'bad', { field: 'name' }).toBody();
    expect(body).toEqual({ code: 'VALIDATION_ERROR', message: 'bad', details: { field: 'name' } });
  });
});
