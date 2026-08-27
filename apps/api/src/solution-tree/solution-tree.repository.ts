import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { OpportunitySolutionTreeNode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type {
  CreateSolutionTreeNodeDto,
  UpdateSolutionTreeNodeDto,
} from './dto/solution-tree-node.dto';

@Injectable()
export class SolutionTreeRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  list(opportunityId: string): Promise<OpportunitySolutionTreeNode[]> {
    return this.withTx((tx) =>
      tx.opportunitySolutionTreeNode.findMany({
        where: { tenantId: this.tenantId, opportunityId },
        orderBy: [{ nodeType: 'asc' }],
      }),
    );
  }

  async create(
    opportunityId: string,
    input: CreateSolutionTreeNodeDto,
    actorUserId: string,
  ): Promise<OpportunitySolutionTreeNode> {
    return this.withTx(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: opportunityId, tenantId: this.tenantId },
      });
      if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);
      if (input.parentNodeId) {
        const parent = await tx.opportunitySolutionTreeNode.findFirst({
          where: { id: input.parentNodeId, opportunityId, tenantId: this.tenantId },
        });
        if (!parent) throw new NotFoundException(`Parent node ${input.parentNodeId} not found`);
      }

      const node = await tx.opportunitySolutionTreeNode.create({
        data: { tenantId: this.tenantId, opportunityId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'opportunity_solution_tree_node.created',
        entityType: 'OpportunitySolutionTreeNode',
        entityId: node.id,
        actorUserId,
        payload: { nodeId: node.id, opportunityId, nodeType: node.nodeType },
      });
      return node;
    });
  }

  async update(
    opportunityId: string,
    id: string,
    input: UpdateSolutionTreeNodeDto,
    actorUserId: string,
  ): Promise<OpportunitySolutionTreeNode> {
    return this.withTx(async (tx) => {
      const existing = await tx.opportunitySolutionTreeNode.findFirst({
        where: { id, opportunityId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Node ${id} not found`);

      const node = await tx.opportunitySolutionTreeNode.update({ where: { id }, data: input });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'opportunity_solution_tree_node.updated',
        entityType: 'OpportunitySolutionTreeNode',
        entityId: node.id,
        actorUserId,
        payload: { nodeId: node.id, opportunityId },
      });
      return node;
    });
  }

  async delete(opportunityId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.opportunitySolutionTreeNode.findFirst({
        where: { id, opportunityId, tenantId: this.tenantId },
      });
      if (!existing) throw new NotFoundException(`Node ${id} not found`);

      // parentNodeId FK is ON DELETE RESTRICT (schema.prisma) — without
      // this check, deleting a node with children would surface as a raw
      // Postgres FK-violation 500, not a clean, actionable error. Checked
      // in the same transaction as the delete so it can't race a
      // concurrent child insert.
      const child = await tx.opportunitySolutionTreeNode.findFirst({
        where: { parentNodeId: id, tenantId: this.tenantId },
        select: { id: true },
      });
      if (child) {
        throw new BadRequestException(
          'This node has children — delete those first before deleting this one.',
        );
      }

      await tx.opportunitySolutionTreeNode.delete({ where: { id } });
    });
  }
}
