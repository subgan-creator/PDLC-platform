import type { Prisma } from '@prisma/client';
// Type-only import is safe here: this abstract class carries no decorators,
// so TypeScript never emits `design:paramtypes` metadata for it — the
// runtime class reference NestJS's DI needs comes from each concrete
// `@Injectable()` subclass's own (value) import of PrismaService instead.
import type { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../request-context/request-context';

/**
 * Base class every tenant-scoped repository extends. Enforces two rules at
 * once: (1) all queries go through `PrismaService.withTenantContext`, which
 * sets the RLS session variable, and (2) the repository still passes an
 * explicit `tenantId` filter in application code — belt-and-braces, per
 * CLAUDE.md's "no exceptions" rule and docs/06-adr/ADR-0002's defense in
 * depth argument (RLS is a backstop, not a substitute for correct queries).
 *
 * Controllers and services must depend on a concrete repository, never on
 * PrismaService directly — enforced by an ESLint override restricting
 * PrismaService imports to `**\/repositories/**` (see apps/api/.eslintrc).
 */
export abstract class TenantScopedRepository {
  protected constructor(protected readonly prisma: PrismaService) {}

  protected get tenantId(): string {
    return RequestContext.requireTenantId();
  }

  protected withTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenantContext(fn);
  }
}
