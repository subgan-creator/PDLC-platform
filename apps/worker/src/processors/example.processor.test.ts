import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import type { Job } from 'bullmq';
import { exampleProcessor, type ExampleJobData } from './example.processor';

describe('exampleProcessor', () => {
  it('echoes the job payload back', async () => {
    const job = { id: '1', data: { message: 'hello' } } as Job<ExampleJobData>;
    const logger = pino({ enabled: false });

    const result = await exampleProcessor(job, logger);

    expect(result).toEqual({ echoed: 'hello' });
  });

  it('logs the job id and payload', async () => {
    const job = { id: '42', data: { message: 'hi' } } as Job<ExampleJobData>;
    const logger = pino({ enabled: false });
    const infoSpy = vi.spyOn(logger, 'info');

    await exampleProcessor(job, logger);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: '42' }),
      'Processing example job',
    );
  });
});
