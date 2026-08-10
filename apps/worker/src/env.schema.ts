import { baseEnvSchema } from '@pdlc/config';
import { z } from 'zod';

export const workerEnvSchema = baseEnvSchema.extend({
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3100),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
