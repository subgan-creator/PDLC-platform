import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './request-context';

// `req.authUser` is declared once, globally, in ../../types/express.d.ts
// (the pattern @types/express itself uses). `req.id` is already declared by
// pino-http on http.IncomingMessage — see LoggerModule.forRoot in
// app.module.ts — so neither is re-declared here.

/**
 * Assigns a request ID (or trusts an inbound `x-request-id` for tracing
 * across services), then wraps the rest of the request — guards,
 * interceptors, the handler — in one AsyncLocalStorage context. tenantId
 * and userId start null and are filled in by AuthGuard once it verifies
 * the caller, via `RequestContext.set()` (same object reference, mutated
 * in place — see request-context.ts for why that's safe here).
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Reuse pino-http's id when available so app logs and access logs
    // correlate; fall back to our own in tests/contexts where pino-http
    // hasn't run (e.g. unit tests that call the middleware directly).
    // pino-http types `id` as `string | number | object`; our genReqId
    // (see app.module.ts) always returns a string, so anything else is
    // treated as "not set" rather than coerced.
    const pinoId = typeof req.id === 'string' ? req.id : undefined;
    const requestId = pinoId ?? (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
    res.setHeader('x-request-id', requestId);

    RequestContext.run({ requestId, tenantId: null, userId: null }, () => {
      next();
    });
  }
}
