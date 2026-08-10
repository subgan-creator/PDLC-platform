import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: AuditAction;
  entityType: string;
}

/**
 * Declares what an endpoint's writes should be recorded as, e.g.
 * `@AuditLog('UPDATE', 'Story')`. AuditInterceptor reads this and the
 * response body (expected to carry an `id`) to write the AuditEvent —
 * every create/update/delete endpoint must carry one; read-of-sensitive
 * endpoints call AuditService.record() directly with READ_SENSITIVE.
 */
export const AuditLog = (action: AuditAction, entityType: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, entityType } satisfies AuditLogMetadata);
