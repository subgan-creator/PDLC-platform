// dotenv MUST load before anything below reads process.env. Silently does
// nothing if there's no .env file (real deployments get env vars injected
// by the platform instead), so this is always safe to import.
import 'dotenv/config';

import { loadEnv } from '@pdlc/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pino from 'pino';
import { workerEnvSchema } from './env.schema';
import { QUEUE_NAMES } from './queues';
import { exampleProcessor, type ExampleJobData } from './processors/example.processor';
import { startHealthServer } from './health-server';

const env = loadEnv(workerEnvSchema);
const logger = pino({ level: env.LOG_LEVEL, name: env.OTEL_SERVICE_NAME ?? 'pdlc-worker' });

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const exampleWorker = new Worker<ExampleJobData>(
  QUEUE_NAMES.example,
  (job) => exampleProcessor(job, logger),
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
  },
);

exampleWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Job completed'));
exampleWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'));

const healthServer = startHealthServer(env.WORKER_HEALTH_PORT, connection);
logger.info({ port: env.WORKER_HEALTH_PORT }, 'Worker health server listening');

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down worker');
  await exampleWorker.close();
  await connection.quit();
  healthServer.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
