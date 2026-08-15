# 07 — Domain Events (Transactional Outbox)

Every mutation in the Initiative Workspace writes an `OutboxEvent` row in the **same database transaction** as the mutation itself (`OutboxService`, called from inside each repository's `withTx`) — never as a separate, potentially-lost side effect. See `packages/shared-types/src/outbox.ts` and `docs/06-adr/ADR-0002` for the tenant-scoping mechanics.

**Nothing consumes these events yet.** Rows accumulate in `outbox_events` with `processedAt = null` until Phase 4's Context Engine adds the first consumer (activity stream → My Day, Resume Cards, Decision Log). Designing the payloads now — instead of retrofitting them once Phase 4 needs them — is the point of doing this in Phase 1.

## Envelope

Every event shares this shape (`OutboxEvent` in `packages/shared-types`):

```ts
{
  id: string;
  tenantId: string;
  eventType: string;       // one of the types below
  entityType: string;      // "Initiative" | "RaidItem" | "Milestone" | ...
  entityId: string;
  initiativeId: string | null; // denormalized for cheap "everything on initiative X" queries
  actorUserId: string | null;  // null for system-originated events
  payload: unknown;        // event-specific, documented below
  occurredAt: string;      // ISO-8601
  processedAt: string | null;
}
```

## Event catalogue

### `initiative.created`

```ts
{ initiativeId: string; title: string; slug: string; ownerId: string; productAreaId: string | null; phase: InitiativePhase }
```

### `initiative.updated`

Fired on any field change via `PATCH /initiatives/:id`, **excluding** health changes (which get their own event — see below) and roadmap repositioning (see `initiative.roadmap_repositioned`).

```ts
{ initiativeId: string; changedFields: string[]; before: Partial<Initiative>; after: Partial<Initiative> }
```

`before`/`after` carry only the fields listed in `changedFields`, not the whole record — keeps payloads small and makes "what actually changed" unambiguous without a diff step downstream.

### `initiative.health_changed`

Split out from the generic `updated` event because health transitions are exactly what My Day (Phase 4) ranks by "needs you today" — a dedicated event type means the Context Engine never has to inspect a generic diff to find out if health moved.

```ts
{ initiativeId: string; fromHealth: HealthStatus; toHealth: HealthStatus; reason: string | null }
```

### `initiative.roadmap_repositioned`

```ts
{ initiativeId: string; fromBucket: RoadmapBucket | null; toBucket: RoadmapBucket | null; rank: number }
```

### `initiative.archived`

```ts
{ initiativeId: string }
```

### `raid_item.created` / `raid_item.updated`

```ts
{ raidItemId: string; type: RaidType; severity: RaidSeverity; status: RaidStatus }
```

### `milestone.created` / `milestone.updated`

```ts
{ milestoneId: string; title: string; dueDate: string; status: MilestoneStatus }
```

### `status_update.created`

The seam for Phase 8 (Reporting Studio, which reads these as report inputs) and Phase 9 (AI Assist auto-drafting from activity — see `StatusUpdate.draftedFromActivity` in `packages/shared-types`).

```ts
{ statusUpdateId: string; periodStart: string; periodEnd: string; healthAtTimeOfUpdate: HealthStatus }
```

### `comment.created`

Carries `mentionedUserIds` explicitly so the Phase 4 Unified Inbox consumer doesn't need to re-parse the comment body for `@mentions`.

```ts
{ commentId: string; parentCommentId: string | null; authorId: string; mentionedUserIds: string[] }
```

### `watcher.added` / `watcher.removed`

```ts
{ userId: string }
```

## Adding a new event type

1. Add the literal to the `eventType` union informally documented above (there's no enum — it's a plain string column so new types never need a migration).
2. Document the payload shape here, in the same style.
3. Call `OutboxService.emit()` inside the same `withTx` transaction as the mutation — never after it commits.
