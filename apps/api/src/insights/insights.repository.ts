import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Insight, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateInsightDto, ListInsightsQueryDto, UpdateInsightDto } from './dto/insight.dto';

@Injectable()
export class InsightsRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  async list(query: ListInsightsQueryDto): Promise<{ items: Insight[]; nextCursor: string | null }> {
    const where: Prisma.InsightWhereInput = {
      tenantId: this.tenantId,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { summary: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const items = await this.withTx((tx) =>
      tx.insight.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
    );

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, -1) : items;
    return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
  }

  async create(input: CreateInsightDto, actorUserId: string): Promise<Insight> {
    return this.withTx(async (tx) => {
      await this.assertEvidenceItemsExist(tx, input.evidenceItemIds);

      const insight = await tx.insight.create({
        data: { tenantId: this.tenantId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'insight.created',
        entityType: 'Insight',
        entityId: insight.id,
        actorUserId,
        payload: { insightId: insight.id, title: insight.title },
      });
      return insight;
    });
  }

  async update(id: string, input: UpdateInsightDto, actorUserId: string): Promise<Insight> {
    return this.withTx(async (tx) => {
      const existing = await tx.insight.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Insight ${id} not found`);
      if (input.evidenceItemIds) {
        await this.assertEvidenceItemsExist(tx, input.evidenceItemIds);
      }

      const insight = await tx.insight.update({ where: { id }, data: input });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'insight.updated',
        entityType: 'Insight',
        entityId: insight.id,
        actorUserId,
        payload: { insightId: insight.id, title: insight.title },
      });
      return insight;
    });
  }

  async delete(id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.insight.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Insight ${id} not found`);
      await tx.insight.delete({ where: { id } });
    });
  }

  /**
   * evidenceItemIds is a plain string array, not a DB-enforced join table
   * (see schema.prisma comment on Insight.evidenceItemIds) — this is the
   * substitute referential-integrity check, run in the same transaction as
   * the write so it can't race a concurrent delete of a referenced item.
   */
  private async assertEvidenceItemsExist(
    tx: Prisma.TransactionClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const found = await tx.evidenceItem.findMany({
      where: { id: { in: ids }, tenantId: this.tenantId },
      select: { id: true },
    });
    if (found.length !== new Set(ids).size) {
      throw new BadRequestException('One or more evidenceItemIds do not exist for this tenant');
    }
  }
}
