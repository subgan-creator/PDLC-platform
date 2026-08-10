import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';

export interface ListUsersOptions {
  cursor?: string;
  limit: number;
}

/**
 * Reference implementation of the tenant-scoped repository pattern (see
 * CLAUDE.md: "every DB query goes through a tenant-scoped repository").
 * Every method both relies on `withTx` (which sets the RLS session
 * variable) AND filters by `this.tenantId` explicitly — defense in depth.
 */
@Injectable()
export class UsersRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<User | null> {
    return this.withTx((tx) => tx.user.findFirst({ where: { id, tenantId: this.tenantId } }));
  }

  async list(options: ListUsersOptions): Promise<{ items: User[]; nextCursor: string | null }> {
    const items = await this.withTx((tx) =>
      tx.user.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { createdAt: 'asc' },
        take: options.limit + 1,
        ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      }),
    );

    const hasMore = items.length > options.limit;
    const page = hasMore ? items.slice(0, -1) : items;
    return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
  }
}
