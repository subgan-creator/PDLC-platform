import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@pdlc/shared-types';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { RequestContext } from '../request-context/request-context';

/**
 * Global exception filter. Every error response — Nest's built-in
 * exceptions, Zod validation failures, and unhandled errors — is
 * normalized to RFC 9457 problem+json, per CLAUDE.md ("no exceptions").
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const requestId = RequestContext.current()?.requestId;

    const problem = this.toProblemDetails(exception, requestId);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Unhandled exception');
    }

    res.status(problem.status).contentType('application/problem+json').send(problem);
  }

  private toProblemDetails(exception: unknown, requestId: string | undefined): ProblemDetails {
    if (exception instanceof ZodError) {
      return {
        type: 'https://pdlc.dev/problems/validation-error',
        title: 'Validation failed',
        status: HttpStatus.BAD_REQUEST,
        detail: 'One or more fields failed validation.',
        requestId,
        errors: exception.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? exception.message);
      const conflict = typeof body === 'object' && body !== null && 'current' in body ? body.current : undefined;
      return {
        type: `https://pdlc.dev/problems/${slugify(exception.name)}`,
        title: exception.name.replace(/Exception$/, ''),
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
        requestId,
        ...(conflict !== undefined ? { conflict } : {}),
      };
    }

    return {
      type: 'https://pdlc.dev/problems/internal-server-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred. It has been logged with the request ID above.',
      requestId,
    };
  }
}

function slugify(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}
