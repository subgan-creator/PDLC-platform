import { z } from 'zod';

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

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().min(1).optional(),

  // Data residency: every deployment is pinned to exactly one region; a tenant's
  // DATABASE_URL must resolve inside this region. Enforced at provisioning time,
  // asserted here so a misconfigured deploy fails at boot, not in an incident.
  DEPLOYMENT_REGION: z.string().min(1).default('local'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
