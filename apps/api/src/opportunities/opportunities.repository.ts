import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Initiative, Opportunity, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import { InitiativesRepository } from '../initiatives/initiatives.repository';
import type {
  CreateOpportunityDto,
  ListOpportunitiesQueryDto,
  PromoteOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';

@Injectable()
export class OpportunitiesRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly initiatives: InitiativesRepository,
  ) {
    super(prisma);
  }

  async list(
    query: ListOpportunitiesQueryDto,
  ): Promise<{ items: Opportunity[]; nextCursor: string | null }> {
    const where: Prisma.OpportunityWhereInput = {
      tenantId: this.tenantId,
      ...(query.promoted === true ? { promotedToInitiativeId: { not: null } } : {}),
      ...(query.promoted === false ? { promotedToInitiativeId: null } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { problemFraming: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const items = await this.withTx((tx) =>
      tx.opportunity.findMany({
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

  findById(id: string): Promise<Opportunity | null> {
    return this.withTx((tx) => tx.opportunity.findFirst({ where: { id, tenantId: this.tenantId } }));
  }

  async create(input: CreateOpportunityDto, actorUserId: string): Promise<Opportunity> {
    return this.withTx(async (tx) => {
      await this.assertInsightsExist(tx, input.insightIds);

      const opportunity = await tx.opportunity.create({
        data: { tenantId: this.tenantId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'opportunity.created',
        entityType: 'Opportunity',
        entityId: opportunity.id,
        actorUserId,
        payload: { opportunityId: opportunity.id, title: opportunity.title },
      });
      return opportunity;
    });
  }

  async update(id: string, input: UpdateOpportunityDto, actorUserId: string): Promise<Opportunity> {
    return this.withTx(async (tx) => {
      const existing = await tx.opportunity.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Opportunity ${id} not found`);
      if (input.insightIds) {
        await this.assertInsightsExist(tx, input.insightIds);
      }

      const opportunity = await tx.opportunity.update({ where: { id }, data: input });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'opportunity.updated',
        entityType: 'Opportunity',
        entityId: opportunity.id,
        actorUserId,
        payload: { opportunityId: opportunity.id, title: opportunity.title },
      });
      return opportunity;
    });
  }

  async delete(id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.opportunity.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Opportunity ${id} not found`);
      await tx.opportunity.delete({ where: { id } });
    });
  }

  /**
   * The one genuinely new piece of cross-module wiring in Discovery Hub:
   * creates a new Initiative from this Opportunity and links both sides of
   * the trail (Initiative.sourceOpportunityId +
   * Opportunity.promotedToInitiativeId), in ONE transaction — reusing
   * InitiativesRepository.createWithTx so slug generation, version-history
   * recording, and the outbox event are exactly what a normal initiative
   * create does, not a parallel reimplementation.
   */
  async promote(
    id: string,
    input: PromoteOpportunityDto,
    actorUserId: string,
  ): Promise<Initiative> {
    return this.withTx(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!opportunity) throw new NotFoundException(`Opportunity ${id} not found`);
      if (opportunity.promotedToInitiativeId) {
        throw new BadRequestException(
          `Opportunity ${id} was already promoted to initiative ${opportunity.promotedToInitiativeId}`,
        );
      }

      const initiative = await this.initiatives.createWithTx(
        tx,
        {
          title: opportunity.title,
          problemStatement: opportunity.problemFraming,
          phase: 'DISCOVERY',
          health: 'GREEN',
          healthReason: null,
          confidence: 'MEDIUM',
          tshirtSize: 'M',
          scope: '',
          nonScope: '',
          plannedStart: null,
          plannedEnd: null,
          ownerId: input.ownerId ?? actorUserId,
          businessSponsorId: null,
          contributingTeams: [],
          tags: [],
          productAreaId: null,
          dataClassification: 'INTERNAL',
          outcomeMetrics: [],
          hypotheses: [],
        },
        actorUserId,
        id,
      );

      await tx.opportunity.update({
        where: { id },
        data: {
          promotedToInitiativeId: initiative.id,
          promotedAt: new Date(),
          promotedBy: actorUserId,
        },
      });

      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'opportunity.promoted',
        entityType: 'Opportunity',
        entityId: id,
        initiativeId: initiative.id,
        actorUserId,
        payload: { opportunityId: id, initiativeId: initiative.id },
      });

      return initiative;
    });
  }

  private async assertInsightsExist(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const found = await tx.insight.findMany({
      where: { id: { in: ids }, tenantId: this.tenantId },
      select: { id: true },
    });
    if (found.length !== new Set(ids).size) {
      throw new BadRequestException('One or more insightIds do not exist for this tenant');
    }
  }
}
