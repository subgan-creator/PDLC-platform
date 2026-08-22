import { z } from 'zod';

/**
 * Wraps an optional field so `KEY=` (present in the file, blank value) is
 * treated the same as `KEY` being absent entirely. `.env.example` files
 * deliberately leave optional vars blank as documentation of what they
 * are — without this, copying `.env.example` to `.env` verbatim produces
 * `""` for those keys, which fails a `.url()`/`.min(1)` check that would
 * otherwise happily accept "not set". Use this for every `.optional()`
 * field in an env schema that has a shape constraint beyond "is a string".
 */
export function optionalEnv<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => (val === '' ? undefined : val), schema.optional());
}

/**
 * Parses `process.env` (or any record) against a Zod schema and fails fast with a
 * readable error on boot rather than surfacing undefined-config bugs at request time.
 *
 * Every app (`apps/api`, `apps/worker`) defines its own schema by extending
 * `baseEnvSchema` and calls this once, in its config module, at startup.
 */
export function loadEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: Record<string, string | undefined> = process.env,
): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Invalid environment configuration:\n${formatted}`);
    throw new Error('Environment validation failed. See above for details.');
  }
  return result.data as z.infer<TSchema>;
}

/**
 * Fields every long-running PDLC service needs, regardless of whether it's the
 * API, the worker, or a future service. Service-specific schemas should
 * `.extend()` this.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  OTEL_EXPORTER_OTLP_ENDPOINT: optionalEnv(z.string().url()),
  OTEL_SERVICE_NAME: optionalEnv(z.string().min(1)),

  // Data residency: every deployment is pinned to exactly one region; a tenant's
  // DATABASE_URL must resolve inside this region. Enforced at provisioning time,
  // asserted here so a misconfigured deploy fails at boot, not in an incident.
  DEPLOYMENT_REGION: z.string().min(1).default('local'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
