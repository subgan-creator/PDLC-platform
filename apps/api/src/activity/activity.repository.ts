import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';

export interface ActivityFeedItem {
  id: string;
  source: 'audit' | 'outbox';
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  occurredAt: Date;
  detail: unknown;
}

const FEED_LIMIT = 100;

/**
 * Per-initiative activity feed: the audit trail for the Initiative record
 * itself (full before/after — audit_events only ever has `entityType` +
 * `entityId`, so this only ever matches direct Initiative mutations, not
 * sub-resources) merged with every outbox event tagged with this
 * initiativeId (docs/07-events.md — every sub-resource mutation
 * denormalizes `initiativeId` onto its event for exactly this query).
 * Sorted by time. This is the read-side equivalent of what Phase 4's
 * Context Engine builds per-user; scoping it to one initiative here needs
 * no new infrastructure, just a query.
 */
@Injectable()
export class ActivityRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async forInitiative(initiativeId: string): Promise<ActivityFeedItem[]> {
    const [auditEvents, outboxEvents] = await this.withTx(async (tx) => {
      const audit = await tx.auditEvent.findMany({
        where: { tenantId: this.tenantId, entityType: 'Initiative', entityId: initiativeId },
        orderBy: { occurredAt: 'desc' },
        take: FEED_LIMIT,
      });
      const outbox = await tx.outboxEvent.findMany({
        where: { tenantId: this.tenantId, initiativeId },
        orderBy: { occurredAt: 'desc' },
        take: FEED_LIMIT,
      });
      return [audit, outbox] as const;
    });

    const fromAudit: ActivityFeedItem[] = auditEvents.map((e) => ({
      id: e.id,
      source: 'audit' as const,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUserId: e.actorUserId,
      occurredAt: e.occurredAt,
      detail: { before: e.before, after: e.after },
    }));

    const fromOutbox: ActivityFeedItem[] = outboxEvents.map((e) => ({
      id: e.id,
      source: 'outbox' as const,
      action: e.eventType,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUserId: e.actorUserId,
      occurredAt: e.occurredAt,
      detail: e.payload,
    }));

    return [...fromAudit, ...fromOutbox]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, FEED_LIMIT);
  }
}
