import type { Id, ISODateTimeString, TenantScoped, UserId } from './common';
import type { InitiativeId } from './initiative';

/**
 * The Context Engine (A4) — the signature capability. Every user action
 * emits an ActivityEvent; My Day, Resume Cards, Context Capsules, Handoff
 * Packs, Unified Inbox, and the Decision Log are all derived views over
 * that stream plus the Decision Log table.
 */
export interface ActivityEvent extends TenantScoped {
  id: Id<'ActivityEvent'>;
  actorUserId: UserId;
  verb: string; // e.g. "commented", "updated_status", "linked_story"
  entityType: string;
  entityId: string;
  initiativeId: InitiativeId | null;
  occurredAt: ISODateTimeString;
  metadata: Record<string, unknown>;
}

export type MyDayItemKind =
  'decision_awaiting' | 'blocker' | 'overdue_commitment' | 'bottleneck' | 'meeting_prep';

export interface MyDayItem {
  id: Id<'MyDayItem'>;
  userId: UserId;
  kind: MyDayItemKind;
  initiativeId: InitiativeId | null;
  title: string;
  rank: number;
  dueAt: ISODateTimeString | null;
}

/**
 * Per-initiative "what changed since I was last here" — generated summary +
 * breadcrumbs + open threads. `summary` is AI-generated and MUST carry
 * provenance (flag-gated, off by default, human-visible draft) per A5 AI
 * governance rules — never silently promoted to a record of decision.
 */
export interface ResumeCard {
  initiativeId: InitiativeId;
  userId: UserId;
  lastVisitedAt: ISODateTimeString;
  summary: string | null;
  summaryModelGatewayRequestId: string | null;
  breadcrumbs: Array<{
    label: string;
    occurredAt: ISODateTimeString;
    entityType: string;
    entityId: string;
  }>;
  openThreadCount: number;
}

/** Pre-meeting brief auto-assembled for a calendar event linked to an initiative or forum. */
export interface ContextCapsule {
  id: Id<'ContextCapsule'>;
  initiativeId: InitiativeId;
  calendarEventExternalId: string;
  generatedAt: ISODateTimeString;
  changesSinceLastMeeting: string;
  openDecisionIds: Array<Id<'Decision'>>;
  likelyQuestions: string[];
}

/** Export everything needed to take over an initiative — leave, reorg, escalation. */
export interface HandoffPack {
  id: Id<'HandoffPack'>;
  initiativeId: InitiativeId;
  requestedBy: UserId;
  generatedAt: ISODateTimeString;
  exportedAttachmentId: Id<'Attachment'>;
}

export type InboxItemKind =
  'mention' | 'approval_request' | 'review_request' | 'integration_notification';

export interface InboxItem extends TenantScoped {
  id: Id<'InboxItem'>;
  userId: UserId;
  kind: InboxItemKind;
  sourceSystem: 'platform' | 'jira' | 'slack' | 'email' | 'teams';
  title: string;
  linkedInitiativeId: InitiativeId | null;
  read: boolean;
  actionedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
}

/**
 * Decision Log — "the single highest-value artifact for context recovery
 * and governance" per the brief. Immutable once recorded; corrections are
 * new entries that supersede, never edits.
 */
export interface Decision extends TenantScoped {
  id: Id<'Decision'>;
  initiativeId: InitiativeId;
  title: string;
  decidedAt: ISODateTimeString;
  decidedBy: UserId;
  optionsConsidered: string[];
  rationale: string;
  supersedesDecisionId: Id<'Decision'> | null;
}
