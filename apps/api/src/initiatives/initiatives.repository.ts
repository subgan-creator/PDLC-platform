import { Injectable, NotFoundException } from '@nestjs/common';
import type { Initiative, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { VersionConflictException } from '../common/exceptions/version-conflict.exception';
import { OutboxService } from '../outbox/outbox.service';
import { VersionsService } from '../versioning/versions.service';
import { slugify } from '../common/util/slug';
import type {
  BulkUpdateInitiativesDto,
  CreateInitiativeDto,
  ListInitiativesQueryDto,
  RepositionInitiativeDto,
  UpdateInitiativeDto,
} from './dto/initiative.dto';

export interface InitiativeWithRelations extends Initiative {
  outcomeMetrics: Array<{
    id: string;
    metricName: string;
    baseline: number | null;
    target: number;
    current: number | null;
    unit: string;
    source: string;
  }>;
  hypotheses: Array<{
    id: string;
    statement: string;
    confidence: string;
    validated: boolean | null;
  }>;
}

const CAP = 5000; // export/list hard cap — well above the 2,000-initiative scale target in Prompt 1.

@Injectable()
export class InitiativesRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly versions: VersionsService,
  ) {
    super(prisma);
  }

  async create(input: CreateInitiativeDto, actorUserId: string): Promise<Initiative> {
    return this.withTx((tx) => this.createWithTx(tx, input, actorUserId));
  }

  /**
   * The actual creation logic, extracted out of `create()` so it can run
   * inside a transaction the CALLER already owns — needed by
   * OpportunitiesRepository.promote(), which must create the Initiative
   * and update the Opportunity's `promotedToInitiativeId` atomically in one
   * transaction rather than two. `create()` above is just this wrapped in
   * its own `withTx` for the normal single-write case.
   */
  async createWithTx(
    tx: Prisma.TransactionClient,
    input: CreateInitiativeDto,
    actorUserId: string,
    sourceOpportunityId: string | null = null,
  ): Promise<Initiative> {
    const slug = await this.uniqueSlug(tx, input.title);

    const initiative = await tx.initiative.create({
      data: {
        tenantId: this.tenantId,
        title: input.title,
        slug,
        problemStatement: input.problemStatement,
        phase: input.phase,
        health: input.health,
        healthReason: input.healthReason,
        confidence: input.confidence,
        tshirtSize: input.tshirtSize,
        scope: input.scope,
        nonScope: input.nonScope,
        plannedStart: input.plannedStart ? new Date(input.plannedStart) : null,
        plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : null,
        ownerId: input.ownerId,
        businessSponsorId: input.businessSponsorId,
        contributingTeams: input.contributingTeams,
        tags: input.tags,
        productAreaId: input.productAreaId,
        sourceOpportunityId,
        dataClassification: input.dataClassification,
        outcomeMetrics: {
          create: input.outcomeMetrics.map((m) => ({ ...m, tenantId: this.tenantId })),
        },
        hypotheses: { create: input.hypotheses.map((h) => ({ ...h, tenantId: this.tenantId })) },
      },
    });

    await this.versions.record(tx, {
      tenantId: this.tenantId,
      entityType: 'Initiative',
      entityId: initiative.id,
      version: initiative.version,
      snapshot: initiative,
      changedBy: actorUserId,
      changeSummary: sourceOpportunityId ? 'Created (promoted from Opportunity)' : 'Created',
    });

    await this.outbox.emit(tx, {
      tenantId: this.tenantId,
      eventType: 'initiative.created',
      entityType: 'Initiative',
      entityId: initiative.id,
      initiativeId: initiative.id,
      actorUserId,
      payload: {
        initiativeId: initiative.id,
        title: initiative.title,
        slug: initiative.slug,
        ownerId: initiative.ownerId,
        productAreaId: initiative.productAreaId,
        phase: initiative.phase,
        sourceOpportunityId,
      },
    });

    return initiative;
  }

  async findById(id: string): Promise<InitiativeWithRelations | null> {
    return this.withTx((tx) =>
      tx.initiative.findFirst({
        where: { id, tenantId: this.tenantId },
        include: { outcomeMetrics: true, hypotheses: true },
      }),
    );
  }

  async list(
    query: ListInitiativesQueryDto,
  ): Promise<{ items: Initiative[]; nextCursor: string | null }> {
    const where = this.buildWhere(query);

    const items = await this.withTx((tx) =>
      tx.initiative.findMany({
        where,
        orderBy: [{ [query.sort]: query.direction }, { id: 'asc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
    );

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, -1) : items;
    return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
  }

  async exportRows(query: ListInitiativesQueryDto): Promise<Initiative[]> {
    const where = this.buildWhere(query);
    return this.withTx((tx) =>
      tx.initiative.findMany({ where, orderBy: [{ [query.sort]: query.direction }], take: CAP }),
    );
  }

  async update(id: string, patch: UpdateInitiativeDto, actorUserId: string): Promise<Initiative> {
    return this.withTx(async (tx) => {
      const before = await tx.initiative.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!before) throw new NotFoundException(`Initiative ${id} not found`);
      if (before.version !== patch.version) throw new VersionConflictException(before);

      const { version: _expectedVersion, ...fields } = patch;
      const data: Prisma.InitiativeUpdateInput = {
        ...fields,
        plannedStart: fields.plannedStart !== undefined ? toDate(fields.plannedStart) : undefined,
        plannedEnd: fields.plannedEnd !== undefined ? toDate(fields.plannedEnd) : undefined,
        actualStart: fields.actualStart !== undefined ? toDate(fields.actualStart) : undefined,
        actualEnd: fields.actualEnd !== undefined ? toDate(fields.actualEnd) : undefined,
        version: { increment: 1 },
      };

      const updated = await tx.initiative.update({
        where: { id },
        data,
      });

      await this.versions.record(tx, {
        tenantId: this.tenantId,
        entityType: 'Initiative',
        entityId: id,
        version: updated.version,
        snapshot: updated,
        changedBy: actorUserId,
      });

      if (patch.health && patch.health !== before.health) {
        await this.outbox.emit(tx, {
          tenantId: this.tenantId,
          eventType: 'initiative.health_changed',
          entityType: 'Initiative',
          entityId: id,
          initiativeId: id,
          actorUserId,
          payload: {
            initiativeId: id,
            fromHealth: before.health,
            toHealth: updated.health,
            reason: updated.healthReason,
          },
        });
      }

      const changedFields = Object.keys(fields).filter(
        (k) =>
          JSON.stringify((before as Record<string, unknown>)[k]) !==
          JSON.stringify((updated as Record<string, unknown>)[k]),
      );
      if (changedFields.length > 0) {
        await this.outbox.emit(tx, {
          tenantId: this.tenantId,
          eventType: 'initiative.updated',
          entityType: 'Initiative',
          entityId: id,
          initiativeId: id,
          actorUserId,
          payload: {
            initiativeId: id,
            changedFields,
            before: pick(before, changedFields),
            after: pick(updated, changedFields),
          },
        });
      }

      return updated;
    });
  }

  async reposition(
    id: string,
    patch: RepositionInitiativeDto,
    actorUserId: string,
  ): Promise<Initiative> {
    return this.withTx(async (tx) => {
      const before = await tx.initiative.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!before) throw new NotFoundException(`Initiative ${id} not found`);
      if (before.version !== patch.version) throw new VersionConflictException(before);

      const updated = await tx.initiative.update({
        where: { id },
        data: {
          roadmapBucket: patch.roadmapBucket,
          roadmapRank: patch.roadmapRank,
          version: { increment: 1 },
        },
      });

      await this.versions.record(tx, {
        tenantId: this.tenantId,
        entityType: 'Initiative',
        entityId: id,
        version: updated.version,
        snapshot: updated,
        changedBy: actorUserId,
        changeSummary: 'Repositioned on roadmap',
      });

      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'initiative.roadmap_repositioned',
        entityType: 'Initiative',
        entityId: id,
        initiativeId: id,
        actorUserId,
        payload: {
          initiativeId: id,
          fromBucket: before.roadmapBucket,
          toBucket: updated.roadmapBucket,
          rank: updated.roadmapRank,
        },
      });

      return updated;
    });
  }

  async archive(id: string, expectedVersion: number, actorUserId: string): Promise<Initiative> {
    return this.withTx(async (tx) => {
      const before = await tx.initiative.findFirst({ where: { id, tenantId: this.tenantId } });
      if (!before) throw new NotFoundException(`Initiative ${id} not found`);
      if (before.version !== expectedVersion) throw new VersionConflictException(before);

      const updated = await tx.initiative.update({
        where: { id },
        data: { archivedAt: new Date(), version: { increment: 1 } },
      });

      await this.versions.record(tx, {
        tenantId: this.tenantId,
        entityType: 'Initiative',
        entityId: id,
        version: updated.version,
        snapshot: updated,
        changedBy: actorUserId,
        changeSummary: 'Archived',
      });

      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'initiative.archived',
        entityType: 'Initiative',
        entityId: id,
        initiativeId: id,
        actorUserId,
        payload: { initiativeId: id },
      });

      return updated;
    });
  }

  /**
   * Bulk edit from the list view. Deliberately doesn't check per-row
   * `version` — the caller just selected these rows from a list that's at
   * most a few seconds stale, and the patch only ever touches a small,
   * low-conflict-risk field set (phase/owner/area/tags). A field that needs
   * real conflict protection (health, dates) is not exposed to bulk edit.
   */
  async bulkUpdate(
    dto: BulkUpdateInitiativesDto,
    actorUserId: string,
  ): Promise<{ updated: number }> {
    return this.withTx(async (tx) => {
      const result = await tx.initiative.updateMany({
        where: { id: { in: dto.ids }, tenantId: this.tenantId },
        data: { ...dto.patch, version: { increment: 1 } },
      });

      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'initiative.bulk_updated',
        entityType: 'Initiative',
        entityId: dto.ids.join(','),
        initiativeId: null,
        actorUserId,
        payload: { initiativeIds: dto.ids, patch: dto.patch },
      });

      return { updated: result.count };
    });
  }

  async listVersions(id: string) {
    return this.withTx((tx) =>
      tx.entityVersion.findMany({
        where: { tenantId: this.tenantId, entityType: 'Initiative', entityId: id },
        orderBy: { version: 'desc' },
      }),
    );
  }

  /** Diffs `version` against `version - 1` (or against `archivedAt`-less current state if `version` is the latest and has no successor row needed). */
  async getVersionDiff(id: string, version: number) {
    return this.withTx(async (tx) => {
      const [target, previous] = await Promise.all([
        tx.entityVersion.findUnique({
          where: {
            tenantId_entityType_entityId_version: {
              tenantId: this.tenantId,
              entityType: 'Initiative',
              entityId: id,
              version,
            },
          },
        }),
        tx.entityVersion.findUnique({
          where: {
            tenantId_entityType_entityId_version: {
              tenantId: this.tenantId,
              entityType: 'Initiative',
              entityId: id,
              version: version - 1,
            },
          },
        }),
      ]);
      if (!target) throw new NotFoundException(`Version ${version} of initiative ${id} not found`);
      return {
        version,
        changedBy: target.changedBy,
        changedAt: target.changedAt,
        changes: this.versions.diff(previous?.snapshot ?? null, target.snapshot),
      };
    });
  }

  private buildWhere(query: ListInitiativesQueryDto): Prisma.InitiativeWhereInput {
    return {
      tenantId: this.tenantId,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.phase ? { phase: { in: query.phase } } : {}),
      ...(query.health ? { health: { in: query.health } } : {}),
      ...(query.productAreaId ? { productAreaId: query.productAreaId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.roadmapBucket ? { roadmapBucket: query.roadmapBucket } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { problemStatement: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let attempt = 1;
    // Bounded loop: collisions are rare (same title reused within a tenant), never unbounded.
    while (attempt < 50) {
      const existing = await tx.initiative.findFirst({
        where: { tenantId: this.tenantId, slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      attempt += 1;
      candidate = `${base}-${attempt}`;
    }
    return `${base}-${Date.now()}`;
  }
}

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}
