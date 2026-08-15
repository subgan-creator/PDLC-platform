import { describe, expect, it } from 'vitest';
import { ApiError, isVersionConflict, toQueryString } from './api-client';

describe('toQueryString', () => {
  it('serializes primitives and skips undefined/null/empty values', () => {
    expect(toQueryString({ a: 1, b: undefined, c: '', d: null, e: 'x' })).toBe('?a=1&e=x');
  });

  it('repeats the key for array values', () => {
    expect(toQueryString({ phase: ['DISCOVERY', 'BUILD'] })).toBe('?phase=DISCOVERY&phase=BUILD');
  });

  it('returns an empty string when every value is filtered out', () => {
    expect(toQueryString({ a: undefined })).toBe('');
  });
});

describe('isVersionConflict', () => {
  it('is true only for a 409 ApiError', () => {
    const conflict = new ApiError({ type: 'about:blank', title: 'Conflict', status: 409 });
    const notFound = new ApiError({ type: 'about:blank', title: 'Not Found', status: 404 });
    expect(isVersionConflict(conflict)).toBe(true);
    expect(isVersionConflict(notFound)).toBe(false);
    expect(isVersionConflict(new Error('boom'))).toBe(false);
  });
});
