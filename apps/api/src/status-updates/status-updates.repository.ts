import { Injectable } from '@nestjs/common';
import type { StatusUpdate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateStatusUpdateDto } from './dto/status-update.dto';

/**
 * Structured status updates — the seam for Reporting Studio (Phase 8) and
 * AI auto-draft (Phase 9, `draftedFromActivity`). Immutable once created:
 * no update/delete here by design — a correction is a new update, matching
 * how the Reporting Studio's "delta since last report" will read this log.
 */
@Injectable()
export class StatusUpdatesRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(initiativeId: string): Promise<StatusUpdate[]> {
    return this.withTx((tx) =>
      tx.statusUpdate.findMany({
        where: { tenantId: this.tenantId, initiativeId },
        orderBy: { periodStart: 'desc' },
      }),
    );
  }

  async create(
    initiativeId: string,
    input: CreateStatusUpdateDto,
    actorUserId: string,
  ): Promise<StatusUpdate> {
    return this.withTx(async (tx) => {
      const update = await tx.statusUpdate.create({
        data: {
          tenantId: this.tenantId,
          initiativeId,
          authoredBy: actorUserId,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          progress: input.progress,
          next: input.next,
          risks: input.risks,
          asks: input.asks,
          healthAtTimeOfUpdate: input.healthAtTimeOfUpdate,
        },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'status_update.created',
        entityType: 'StatusUpdate',
        entityId: update.id,
        initiativeId,
        actorUserId,
        payload: {
          statusUpdateId: update.id,
          periodStart: update.periodStart,
          periodEnd: update.periodEnd,
          healthAtTimeOfUpdate: update.healthAtTimeOfUpdate,
        },
      });
      return update;
    });
  }
}
