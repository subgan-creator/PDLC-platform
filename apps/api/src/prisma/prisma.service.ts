import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RequestContext } from '../common/request-context/request-context';

const TENANT_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Thin wrapper over PrismaClient that adds `withTenantContext`: every
 * tenant-scoped repository (see common/repository/tenant-scoped.repository.ts)
 * routes its queries through this so the Postgres session variable backing
 * Row-Level Security (`app.tenant_id`) is always set before a query touches
 * a tenant-scoped table — see docs/06-adr/ADR-0002.
 *
 * `SET LOCAL` cannot be parameterized, so tenantId is validated against a
 * strict allow-list pattern before string interpolation (it's always a
 * UUID we generated — this guards against a future bug, not user input).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Runs `fn` inside a transaction with `app.tenant_id` (and `app.user_id`,
   * for audit triggers/policies that want it) set via `SET LOCAL`, scoped
   * to the current RequestContext. Every tenant-scoped repository method
   * must go through this — direct `this.prisma.model.method()` calls in
   * controllers or services are forbidden by the engineering rules in
   * CLAUDE.md.
   */
  async withTenantContext<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const tenantId = RequestContext.requireTenantId();
    if (!TENANT_ID_PATTERN.test(tenantId)) {
      throw new Error(`Refusing to set RLS session variable for suspicious tenantId: ${tenantId}`);
    }
    const userId = RequestContext.current()?.userId ?? '';
    if (userId && !TENANT_ID_PATTERN.test(userId)) {
      throw new Error(`Refusing to set RLS session variable for suspicious userId: ${userId}`);
    }

    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId}'`);
      if (userId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${userId}'`);
      }
      return fn(tx);
    });
  }

  /**
   * Platform-admin escape hatch (tenant provisioning, cross-tenant
   * reporting jobs) — deliberately named loudly so it can't be reached for
   * by accident. Bypasses the RLS session variable entirely; the calling
   * code is responsible for its own authorization.
   */
  async withoutTenantScope<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    this.logger.warn('withoutTenantScope invoked — bypassing RLS session variable.');
    return this.$transaction(fn);
  }
}
