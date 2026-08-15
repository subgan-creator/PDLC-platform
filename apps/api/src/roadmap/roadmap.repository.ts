import { Injectable } from '@nestjs/common';
import type { Initiative, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { RoadmapQueryDto } from './dto/roadmap.dto';

export interface RoadmapGroup {
  key: string;
  label: string;
  initiativeIds: string[];
}

const ROADMAP_CAP = 5000; // same bound as CSV export — well above the 2k-initiative scale target.

/**
 * Unpaginated by design: the Now/Next/Later and timeline views need the
 * whole filtered set in memory client-side to support smooth drag and
 * client-side re-grouping — this is a materialized "board", not a scroll
 * list (that's what the Initiative List table view is for).
 */
@Injectable()
export class RoadmapRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async list(
    query: RoadmapQueryDto,
  ): Promise<{ items: Initiative[]; groups: RoadmapGroup[] | null }> {
    const where: Prisma.InitiativeWhereInput = {
      tenantId: this.tenantId,
      archivedAt: null,
      ...(query.phase ? { phase: query.phase as Initiative['phase'] } : {}),
      ...(query.health ? { health: query.health as Initiative['health'] } : {}),
      ...(query.productAreaId ? { productAreaId: query.productAreaId } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };

    const items = await this.withTx((tx) =>
      tx.initiative.findMany({
        where,
        orderBy: [{ roadmapBucket: 'asc' }, { roadmapRank: 'asc' }, { plannedStart: 'asc' }],
        take: ROADMAP_CAP,
      }),
    );

    if (query.groupBy === 'none') return { items, groups: null };

    if (query.groupBy === 'area') {
      const byArea = new Map<string, RoadmapGroup>();
      for (const item of items) {
        const key = item.productAreaId ?? 'unassigned';
        const group = byArea.get(key) ?? {
          key,
          label: key === 'unassigned' ? 'Unassigned' : key,
          initiativeIds: [],
        };
        group.initiativeIds.push(item.id);
        byArea.set(key, group);
      }
      return { items, groups: [...byArea.values()] };
    }

    // groupBy === 'team': an initiative can belong to multiple teams, so it can appear in more than one group.
    const byTeam = new Map<string, RoadmapGroup>();
    for (const item of items) {
      const teams = item.contributingTeams.length > 0 ? item.contributingTeams : ['Unassigned'];
      for (const team of teams) {
        const group = byTeam.get(team) ?? { key: team, label: team, initiativeIds: [] };
        group.initiativeIds.push(item.id);
        byTeam.set(team, group);
      }
    }
    return { items, groups: [...byTeam.values()] };
  }
}
