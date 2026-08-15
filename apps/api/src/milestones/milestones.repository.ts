import { Injectable, NotFoundException } from '@nestjs/common';
import type { Milestone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Injectable()
export class MilestonesRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(initiativeId: string): Promise<Milestone[]> {
    return this.withTx((tx) =>
      tx.milestone.findMany({ where: { tenantId: this.tenantId, initiativeId }, orderBy: { dueDate: 'asc' } }),
    );
  }

  async create(initiativeId: string, input: CreateMilestoneDto, actorUserId: string): Promise<Milestone> {
    return this.withTx(async (tx) => {
      const milestone = await tx.milestone.create({
        data: { tenantId: this.tenantId, initiativeId, ...input, dueDate: new Date(input.dueDate) },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'milestone.created',
        entityType: 'Milestone',
        entityId: milestone.id,
        initiativeId,
        actorUserId,
        payload: { milestoneId: milestone.id, title: milestone.title, dueDate: milestone.dueDate, status: milestone.status },
      });
      return milestone;
    });
  }

  async update(initiativeId: string, id: string, input: UpdateMilestoneDto, actorUserId: string): Promise<Milestone> {
    return this.withTx(async (tx) => {
      const existing = await tx.milestone.findFirst({ where: { id, initiativeId, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Milestone ${id} not found`);

      const milestone = await tx.milestone.update({
        where: { id },
        data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : undefined },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'milestone.updated',
        entityType: 'Milestone',
        entityId: milestone.id,
        initiativeId,
        actorUserId,
        payload: { milestoneId: milestone.id, title: milestone.title, dueDate: milestone.dueDate, status: milestone.status },
      });
      return milestone;
    });
  }

  async delete(initiativeId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.milestone.findFirst({ where: { id, initiativeId, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Milestone ${id} not found`);
      await tx.milestone.delete({ where: { id } });
    });
  }
}
