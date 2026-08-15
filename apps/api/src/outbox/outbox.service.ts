import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface EmitOutboxEventInput {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  initiativeId?: string | null;
  actorUserId?: string | null;
  payload: unknown;
}

/**
 * Transactional outbox writer (docs/07-events.md, A7). Takes the caller's
 * own transaction client rather than owning one — the whole point of the
 * pattern is that the event row commits atomically with the mutation it
 * describes, so this must run inside the same `withTenantContext`
 * transaction as the write, never after it.
 *
 * No PrismaService dependency here by design: this service only ever
 * touches the `tx` it's handed, so it's exempt from the "inject a
 * repository, not PrismaService" rule without needing an ESLint carve-out.
 */
@Injectable()
export class OutboxService {
  async emit(tx: Prisma.TransactionClient, input: EmitOutboxEventInput): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        initiativeId: input.initiativeId ?? null,
        actorUserId: input.actorUserId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }
}
