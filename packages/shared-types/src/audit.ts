import type { AuditEventId, Id, ISODateTimeString, TenantId, TenantScoped, UserId } from './common';

export type AuditAction =
  'create' | 'update' | 'delete' | 'read_sensitive' | 'export' | 'attest' | 'sign';

/**
 * Append-only, immutable. Written exclusively by the audit interceptor
 * (apps/api) — never mutated, never deleted, lives in its own Postgres
 * schema separate from application tables (docs/06-adr/ADR-0002).
 */
export interface AuditEvent extends TenantScoped {
  id: AuditEventId;
  actorUserId: UserId | null; // null for system/service actions
  actorServiceAccountId: Id<'ServiceAccount'> | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  requestId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: ISODateTimeString;
}

/**
 * Snapshot for "full version history on every artifact with diff and
 * restore" (A5). Stored per-entity-type in an append-only version table;
 * `diff` is computed on read, not stored.
 */
export interface EntityVersion<TSnapshot = unknown> {
  id: Id<'EntityVersion'>;
  tenantId: TenantId;
  entityType: string;
  entityId: string;
  version: number;
  snapshot: TSnapshot;
  changedBy: UserId;
  changedAt: ISODateTimeString;
  changeSummary: string | null;
}
