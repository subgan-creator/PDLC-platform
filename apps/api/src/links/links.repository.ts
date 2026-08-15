import { Injectable, NotFoundException } from '@nestjs/common';
import type { InitiativeLink } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { CreateLinkDto } from './dto/link.dto';

@Injectable()
export class LinksRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  list(initiativeId: string): Promise<InitiativeLink[]> {
    return this.withTx((tx) =>
      tx.initiativeLink.findMany({ where: { tenantId: this.tenantId, initiativeId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  create(initiativeId: string, input: CreateLinkDto, actorUserId: string): Promise<InitiativeLink> {
    return this.withTx((tx) =>
      tx.initiativeLink.create({
        data: { tenantId: this.tenantId, initiativeId, ...input, createdBy: actorUserId },
      }),
    );
  }

  async delete(initiativeId: string, id: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.initiativeLink.findFirst({ where: { id, initiativeId, tenantId: this.tenantId } });
      if (!existing) throw new NotFoundException(`Link ${id} not found`);
      await tx.initiativeLink.delete({ where: { id } });
    });
  }
}
