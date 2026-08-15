import { Injectable } from '@nestjs/common';
import type { InitiativeStakeholder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { AddStakeholderDto } from './dto/stakeholder.dto';

@Injectable()
export class StakeholdersRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  list(initiativeId: string): Promise<InitiativeStakeholder[]> {
    return this.withTx((tx) =>
      tx.initiativeStakeholder.findMany({ where: { tenantId: this.tenantId, initiativeId } }),
    );
  }

  add(initiativeId: string, input: AddStakeholderDto): Promise<InitiativeStakeholder> {
    return this.withTx((tx) =>
      tx.initiativeStakeholder.upsert({
        where: {
          initiativeId_userId_raciRole: {
            initiativeId,
            userId: input.userId,
            raciRole: input.raciRole,
          },
        },
        create: { tenantId: this.tenantId, initiativeId, ...input },
        update: {},
      }),
    );
  }

  async remove(
    initiativeId: string,
    userId: string,
    raciRole: AddStakeholderDto['raciRole'],
  ): Promise<void> {
    await this.withTx(async (tx) => {
      await tx.initiativeStakeholder.deleteMany({
        where: { tenantId: this.tenantId, initiativeId, userId, raciRole },
      });
    });
  }
}
