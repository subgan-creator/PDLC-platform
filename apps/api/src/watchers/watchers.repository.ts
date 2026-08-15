import { Injectable } from '@nestjs/common';
import type { InitiativeWatcher } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class WatchersRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(initiativeId: string): Promise<InitiativeWatcher[]> {
    return this.withTx((tx) =>
      tx.initiativeWatcher.findMany({ where: { tenantId: this.tenantId, initiativeId } }),
    );
  }

  async watch(initiativeId: string, userId: string): Promise<InitiativeWatcher> {
    return this.withTx(async (tx) => {
      const watcher = await tx.initiativeWatcher.upsert({
        where: { initiativeId_userId: { initiativeId, userId } },
        create: { tenantId: this.tenantId, initiativeId, userId },
        update: {},
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'watcher.added',
        entityType: 'InitiativeWatcher',
        entityId: `${initiativeId}:${userId}`,
        initiativeId,
        actorUserId: userId,
        payload: { userId },
      });
      return watcher;
    });
  }

  async unwatch(initiativeId: string, userId: string): Promise<void> {
    await this.withTx(async (tx) => {
      await tx.initiativeWatcher.deleteMany({
        where: { tenantId: this.tenantId, initiativeId, userId },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'watcher.removed',
        entityType: 'InitiativeWatcher',
        entityId: `${initiativeId}:${userId}`,
        initiativeId,
        actorUserId: userId,
        payload: { userId },
      });
    });
  }
}
