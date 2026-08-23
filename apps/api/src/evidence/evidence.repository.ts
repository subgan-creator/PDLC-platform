import { Injectable, NotFoundException } from '@nestjs/common';
import type { EvidenceItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateEvidenceItemDto, UpdateEvidenceItemDto } from './dto/evidence.dto';

@Injectable()
export class EvidenceRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(sourceId: string): Promise<EvidenceItem[]> {
    return this.withTx((tx) =>
      tx.evidenceItem.findMany({
        where: { tenantId: this.tenantId, sourceId },
        orderBy: [{ capturedAt: 'desc' }],
      }),
    );
  }

  async create(
    sourceId: string,
    input: CreateEvidenceItemDto,
    actorUserId: string,
  ): Promise<EvidenceItem> {
    return this.withTx(async (tx) => {
      const source = await tx.source.findFirst({
        where: { id: sourceId, tenantId: this.tenantId },
      });
      if (!source) throw new NotFoundException(`Source ${sourceId} not found`);

      const item = await tx.evidenceItem.create({
        data: {
          tenantId: this.tenantId,
          sourceId,
          ...input,
          capturedAt: new Date(input.capturedAt),
        },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'evidence_item.created',
        entityType: 'EvidenceItem',
        entityId: item.id,
        actorUserId,
        payload: { evidenceItemId: item.id, sourceId },
      });
      return item;
    });
  }

  async update(
    sourceId: string,
    id: string,
    input: UpdateEvidenceItemDto,
    actorUserId: string,
  ): Promise<EvidenceItem> {
    return this.withTx(async (tx) => {
      const existing = await tx.evidenceItem.findFirst({
        where: { id, sourceId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Evidence item ${id} not found`);

      const item = await tx.evidenceItem.update({
        where: { id },
        data: {
          ...input,
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
        },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'evidence_item.updated',
        entityType: 'EvidenceItem',
        entityId: item.id,
        actorUserId,
        payload: { evidenceItemId: item.id, sourceId },
      });
      return item;
    });
  }

  async delete(sourceId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.evidenceItem.findFirst({
        where: { id, sourceId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Evidence item ${id} not found`);
      await tx.evidenceItem.delete({ where: { id } });
    });
  }
}
