import { Injectable, NotFoundException } from '@nestjs/common';
import type { OutcomeMetric } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateOutcomeMetricDto, UpdateOutcomeMetricDto } from './dto/outcome-metric.dto';

@Injectable()
export class OutcomeMetricsRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(initiativeId: string): Promise<OutcomeMetric[]> {
    return this.withTx((tx) =>
      tx.outcomeMetric.findMany({
        where: { tenantId: this.tenantId, initiativeId },
        orderBy: { metricName: 'asc' },
      }),
    );
  }

  async create(
    initiativeId: string,
    input: CreateOutcomeMetricDto,
    actorUserId: string,
  ): Promise<OutcomeMetric> {
    return this.withTx(async (tx) => {
      const metric = await tx.outcomeMetric.create({
        data: { tenantId: this.tenantId, initiativeId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'outcome_metric.created',
        entityType: 'OutcomeMetric',
        entityId: metric.id,
        initiativeId,
        actorUserId,
        payload: { outcomeMetricId: metric.id, metricName: metric.metricName },
      });
      return metric;
    });
  }

  async update(
    initiativeId: string,
    id: string,
    input: UpdateOutcomeMetricDto,
    actorUserId: string,
  ): Promise<OutcomeMetric> {
    return this.withTx(async (tx) => {
      const existing = await tx.outcomeMetric.findFirst({
        where: { id, initiativeId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Outcome metric ${id} not found`);

      const metric = await tx.outcomeMetric.update({ where: { id }, data: input });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'outcome_metric.updated',
        entityType: 'OutcomeMetric',
        entityId: metric.id,
        initiativeId,
        actorUserId,
        payload: { outcomeMetricId: metric.id, metricName: metric.metricName },
      });
      return metric;
    });
  }

  async delete(initiativeId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.outcomeMetric.findFirst({
        where: { id, initiativeId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Outcome metric ${id} not found`);
      await tx.outcomeMetric.delete({ where: { id } });
    });
  }
}
