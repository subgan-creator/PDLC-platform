import type { Job } from 'bullmq';
import type { Logger } from 'pino';

export interface ExampleJobData {
  message: string;
}

/**
 * Reference processor proving the queue -> worker -> Redis wiring works.
 * Real processors (activity-event-fanout, connector-sync, report-export)
 * follow this same `(job, logger) => Promise<TResult>` shape.
 */
export function exampleProcessor(
  job: Job<ExampleJobData>,
  logger: Logger,
): Promise<{ echoed: string }> {
  logger.info({ jobId: job.id, data: job.data }, 'Processing example job');
  return Promise.resolve({ echoed: job.data.message });
}
