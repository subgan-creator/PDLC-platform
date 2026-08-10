import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, type AuditLogMetadata } from './audit-log.decorator';

/**
 * Writes an AuditEvent for every handler carrying `@AuditLog()`, after the
 * handler succeeds (so failed writes aren't logged as if they happened).
 * Registered globally in app.module.ts.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditLogMetadata | undefined>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const entityId = extractId(responseBody) ?? extractId(req.params);
        void this.auditService.record({
          action: metadata.action,
          entityType: metadata.entityType,
          entityId: entityId ?? 'unknown',
          after: metadata.action === 'DELETE' ? undefined : responseBody,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        });
      }),
    );
  }
}

function extractId(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return undefined;
}
