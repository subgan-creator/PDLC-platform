import { ForbiddenException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { ProblemDetails } from '@pdlc/shared-types';
import { describe, expect, it, vi } from 'vitest';
import type { ZodError } from 'zod';
import { z } from 'zod';
import { ProblemDetailsFilter } from './problem-details.filter';

function mockHost(): {
  host: ArgumentsHost;
  send: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn();
  const contentType = vi.fn().mockReturnValue({ send });
  const status = vi.fn().mockReturnValue({ contentType });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  return { host, send, status };
}

function sentBody(send: ReturnType<typeof vi.fn>): ProblemDetails {
  return send.mock.calls[0]![0] as ProblemDetails;
}

describe('ProblemDetailsFilter', () => {
  it('formats a ZodError as a 400 with a field-level error list', () => {
    const filter = new ProblemDetailsFilter();
    const { host, send, status } = mockHost();

    const result = z.object({ email: z.string().email() }).safeParse({ email: 'not-an-email' });
    filter.catch((result as { error: ZodError }).error, host);

    expect(status).toHaveBeenCalledWith(400);
    const body = sentBody(send);
    expect(body.title).toBe('Validation failed');
    expect(body.errors?.[0]?.field).toBe('email');
  });

  it('formats a Nest HttpException using its own status', () => {
    const filter = new ProblemDetailsFilter();
    const { host, send, status } = mockHost();

    filter.catch(new ForbiddenException('Missing permission: user:READ'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(sentBody(send).detail).toBe('Missing permission: user:READ');
  });

  it('falls back to a generic 500 for unrecognized errors, without leaking internals', () => {
    const filter = new ProblemDetailsFilter();
    const { host, send, status } = mockHost();

    filter.catch(new Error('database password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(sentBody(send).detail).not.toContain('hunter2');
  });
});
