import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { baseEnvSchema, loadEnv } from './env';

describe('loadEnv', () => {
  it('parses valid input and applies documented defaults', () => {
    const result = loadEnv(baseEnvSchema, {
      DATABASE_URL: 'postgresql://localhost:5432/pdlc',
      REDIS_URL: 'redis://localhost:6379',
    });

    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.DEPLOYMENT_REGION).toBe('local');
    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/pdlc');
  });

  it('throws with a readable message and logs every failing field on invalid input', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => loadEnv(baseEnvSchema, { DATABASE_URL: 'not-a-url' })).toThrow(
      'Environment validation failed',
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));

    errorSpy.mockRestore();
  });

  it('rejects an unrecognized NODE_ENV rather than silently coercing it', () => {
    const schema = baseEnvSchema.pick({ NODE_ENV: true });
    const result = schema.safeParse({ NODE_ENV: 'staging-ish' });
    expect(result.success).toBe(false);
  });

  it('works with an arbitrary schema, not just baseEnvSchema', () => {
    const customSchema = z.object({ FOO: z.string() });
    expect(loadEnv(customSchema, { FOO: 'bar' })).toEqual({ FOO: 'bar' });
  });
});
