import { Injectable, NotFoundException } from '@nestjs/common';
import type { RaidItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateRaidItemDto, UpdateRaidItemDto } from './dto/raid.dto';

@Injectable()
export class RaidRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(initiativeId: string): Promise<RaidItem[]> {
    return this.withTx((tx) =>
      tx.raidItem.findMany({
        where: { tenantId: this.tenantId, initiativeId },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  }

  async create(
    initiativeId: string,
    input: CreateRaidItemDto,
    actorUserId: string,
  ): Promise<RaidItem> {
    return this.withTx(async (tx) => {
      const item = await tx.raidItem.create({
        data: {
          tenantId: this.tenantId,
          initiativeId,
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'raid_item.created',
        entityType: 'RaidItem',
        entityId: item.id,
        initiativeId,
        actorUserId,
        payload: {
          raidItemId: item.id,
          type: item.type,
          severity: item.severity,
          status: item.status,
        },
      });
      return item;
    });
  }

  async update(
    initiativeId: string,
    id: string,
    input: UpdateRaidItemDto,
    actorUserId: string,
  ): Promise<RaidItem> {
    return this.withTx(async (tx) => {
      const existing = await tx.raidItem.findFirst({
        where: { id, initiativeId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`RAID item ${id} not found`);

      const item = await tx.raidItem.update({
        where: { id },
        data: {
          ...input,
          dueDate:
            input.dueDate !== undefined
              ? input.dueDate
                ? new Date(input.dueDate)
                : null
              : undefined,
        },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'raid_item.updated',
        entityType: 'RaidItem',
        entityId: item.id,
        initiativeId,
        actorUserId,
        payload: {
          raidItemId: item.id,
          type: item.type,
          severity: item.severity,
          status: item.status,
        },
      });
      return item;
    });
  }

  async delete(initiativeId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.raidItem.findFirst({
        where: { id, initiativeId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`RAID item ${id} not found`);
      await tx.raidItem.delete({ where: { id } });
    });
  }
}
