import { baseEnvSchema } from '@pdlc/config';
import { z } from 'zod';

/**
 * API-specific environment schema, extending the shared base. Validated
 * once at boot in ConfigModule — see loadEnv() in @pdlc/config.
 */
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3000),

  // OIDC (A5 identity & access). In dev mode, AUTH_MODE=dev-stub bypasses
  // real OIDC and trusts an `x-dev-user-id` header — see auth/dev-stub.strategy.ts.
  AUTH_MODE: z.enum(['oidc', 'dev-stub']).default('dev-stub'),
  OIDC_ISSUER_URL: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_AUDIENCE: z.string().optional(),

  // Object storage (S3-compatible; LocalStack in dev).
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().default('pdlc-attachments'),
  S3_REGION: z.string().default('us-east-1'),

  OPENSEARCH_URL: z.string().url().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
