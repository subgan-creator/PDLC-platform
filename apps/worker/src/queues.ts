/**
 * Queue name registry. One name here per BullMQ queue in the system —
 * forward-declared for phases that don't have processors yet so the queue
 * naming convention doesn't churn later (same spirit as
 * packages/shared-types). Only `example` has a processor wired up in
 * Phase 0; the rest are documented placeholders.
 */
export const QUEUE_NAMES = {
  /** Phase 0 — proves the worker boots and can process a job end to end. */
  example: 'pdlc:example',
  /** Phase 4 — Context Engine: fan out an ActivityEvent into My Day / Resume Card recomputation. */
  activityEventFanout: 'pdlc:activity-event-fanout',
  /** Phase 5 — Integration Service: connector pull/push/webhook processing. */
  connectorSync: 'pdlc:connector-sync',
  /** Phase 8 — Reporting Studio: PPTX/PDF export rendering. */
  reportExport: 'pdlc:report-export',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
