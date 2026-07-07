import { describe, expect, it } from 'vitest';
import { apiError } from '@/features/auth/errors';

/** Normalizes openapi-fetch error payloads into a safe { code, message } shape. */
describe('apiError', () => {
  it('extracts code + message from the shared Error envelope', () => {
    expect(apiError({ code: 'EMAIL_TAKEN', message: 'taken' })).toEqual({
      code: 'EMAIL_TAKEN',
      message: 'taken',
    });
  });
  it('narrows non-string fields to undefined', () => {
    expect(apiError({ code: 123, message: null })).toEqual({ code: undefined, message: undefined });
  });
  it('returns an empty object for a non-object error', () => {
    expect(apiError('boom')).toEqual({});
    expect(apiError(undefined)).toEqual({});
  });
});
