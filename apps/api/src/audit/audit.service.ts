import { Injectable } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/request-context/request-context';

export interface RecordAuditEventInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * The only code path allowed to write to `audit.audit_events` (append-only
 * — see CLAUDE.md and docs/06-adr/ADR-0002). Called by AuditInterceptor for
 * every guarded mutation, and directly by services that need to log a
 * sensitive read (`READ_SENSITIVE`).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    const ctx = RequestContext.current();
    if (!ctx?.tenantId) {
      throw new Error('AuditService.record called outside a tenant-scoped request context.');
    }

    await this.prisma.withTenantContext((tx) =>
      tx.auditEvent.create({
        data: {
          tenantId: ctx.tenantId!,
          actorUserId: ctx.userId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          requestId: ctx.requestId,
          before: input.before === undefined ? undefined : (input.before as object),
          after: input.after === undefined ? undefined : (input.after as object),
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      }),
    );
  }
}
