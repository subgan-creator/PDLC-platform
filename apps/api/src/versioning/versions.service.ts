import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface RecordVersionInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  version: number;
  snapshot: unknown;
  changedBy: string;
  changeSummary?: string | null;
}

/**
 * Full version history with diff & restore (A5). One row per write, whole-
 * record JSON snapshot — see the doc comment on `EntityVersion` in
 * schema.prisma for why diffing happens on read, not on write.
 *
 * Same shape as OutboxService: takes the caller's `tx` so the version row
 * commits atomically with the mutation, no PrismaService dependency of its
 * own.
 */
@Injectable()
export class VersionsService {
  async record(tx: Prisma.TransactionClient, input: RecordVersionInput): Promise<void> {
    await tx.entityVersion.create({
      data: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        version: input.version,
        snapshot: input.snapshot as Prisma.InputJsonValue,
        changedBy: input.changedBy,
        changeSummary: input.changeSummary ?? null,
      },
    });
  }

  /** Shallow field-by-field diff between two whole-record JSON snapshots, for the version history UI. */
  diff(before: unknown, after: unknown): Array<{ field: string; before: unknown; after: unknown }> {
    const b = (before ?? {}) as Record<string, unknown>;
    const a = (after ?? {}) as Record<string, unknown>;
    const fields = new Set([...Object.keys(b), ...Object.keys(a)]);
    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];
    for (const field of fields) {
      if (JSON.stringify(b[field]) !== JSON.stringify(a[field])) {
        changes.push({ field, before: b[field], after: a[field] });
      }
    }
    return changes;
  }
}
