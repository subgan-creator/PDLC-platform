import { Injectable, NotFoundException } from '@nestjs/common';
import type { Source } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateSourceDto, UpdateSourceDto } from './dto/source.dto';

@Injectable()
export class SourcesRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(): Promise<Source[]> {
    return this.withTx((tx) =>
      tx.source.findMany({
        where: { tenantId: this.tenantId },
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  }

  async create(input: CreateSourceDto, actorUserId: string): Promise<Source> {
    return this.withTx(async (tx) => {
      const source = await tx.source.create({
        data: { tenantId: this.tenantId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'source.created',
        entityType: 'Source',
        entityId: source.id,
        actorUserId,
        payload: { sourceId: source.id, type: source.type, name: source.name },
      });
      return source;
    });
  }

  async update(id: string, input: UpdateSourceDto, actorUserId: string): Promise<Source> {
    return this.withTx(async (tx) => {
      const existing = await tx.source.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Source ${id} not found`);

      const source = await tx.source.update({ where: { id }, data: input });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'source.updated',
        entityType: 'Source',
        entityId: source.id,
        actorUserId,
        payload: { sourceId: source.id, type: source.type, name: source.name },
      });
      return source;
    });
  }

  async delete(id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.source.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Source ${id} not found`);
      await tx.source.delete({ where: { id } });
    });
  }
}
