import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { RequiredPermission } from './require-permission.decorator';

@Injectable()
export class PermissionsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * True if `userId` holds a role (within the current tenant context) that
   * grants `required`. Runs inside the same RLS-scoped transaction as
   * every other tenant-scoped query — a user can never be checked against
   * another tenant's role assignments even if the caller passed a stale id.
   */
  async userHasPermission(userId: string, required: RequiredPermission): Promise<boolean> {
    const grant = await this.withTx((tx) =>
      tx.userRole.findFirst({
        where: {
          userId,
          tenantId: this.tenantId,
          role: {
            rolePermissions: {
              some: {
                permission: { resource: required.resource, action: required.action },
              },
            },
          },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { userId: true },
      }),
    );
    return grant !== null;
  }
}
