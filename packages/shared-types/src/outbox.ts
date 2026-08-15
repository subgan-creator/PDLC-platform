import type { Id, ISODateTimeString, TenantScoped, UserId } from './common';

/**
 * Transactional outbox (A7: "outbox pattern for reliable event publishing").
 * Every domain mutation that other modules will eventually react to writes
 * an OutboxEvent row in the SAME database transaction as the mutation
 * itself — never as a separate, potentially-lost side effect. Phase 4's
 * Context Engine is the first real consumer (activity stream, My Day,
 * Resume Cards); until then rows are written and simply never polled.
 *
 * Full event catalogue + payload shapes: docs/07-events.md.
 */
export interface OutboxEvent extends TenantScoped {
  id: Id<'OutboxEvent'>;
  eventType: string; // e.g. "initiative.created" — see docs/07-events.md for the full list
  entityType: string;
  entityId: string;
  /** Denormalized for cheap filtering ("show me everything on initiative X") without joining back to the entity. */
  initiativeId: Id<'Initiative'> | null;
  actorUserId: UserId | null;
  payload: unknown;
  occurredAt: ISODateTimeString;
  /** Set once a consumer has handled this row. Null forever until Phase 4 adds the first consumer. */
  processedAt: ISODateTimeString | null;
}
