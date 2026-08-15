import type {
  Confidence,
  HealthStatus,
  Initiative as SharedInitiative,
  InitiativeComment,
  InitiativeLink,
  InitiativePhase,
  Milestone,
  RaidItem,
  RoadmapBucket,
  StatusUpdate,
  TShirtSize,
} from '@pdlc/shared-types';

/** The API's actual response shape for a single initiative: the row plus its inline outcomes/hypotheses. */
export interface InitiativeWithRelations extends SharedInitiative {
  outcomeMetrics: Array<{
    id: string;
    metricName: string;
    baseline: number | null;
    target: number;
    current: number | null;
    unit: string;
    source: string;
  }>;
  hypotheses: Array<{
    id: string;
    statement: string;
    confidence: Confidence;
    validated: boolean | null;
  }>;
}

export type { InitiativeComment, InitiativeLink, Milestone, RaidItem, StatusUpdate };

export interface ProductArea {
  id: string;
  key: string;
  name: string;
  businessLineId: string | null;
}

export interface ListInitiativesParams {
  cursor?: string;
  limit?: number;
  q?: string;
  phase?: InitiativePhase[];
  health?: HealthStatus[];
  productAreaId?: string;
  ownerId?: string;
  tag?: string;
  roadmapBucket?: RoadmapBucket;
  includeArchived?: boolean;
  sort?: 'createdAt' | 'title' | 'plannedEnd' | 'health';
  direction?: 'asc' | 'desc';
}

export interface ListInitiativesResult {
  items: SharedInitiative[];
  nextCursor: string | null;
}

export interface CreateInitiativeInput {
  title: string;
  problemStatement: string;
  phase?: InitiativePhase;
  health?: HealthStatus;
  healthReason?: string | null;
  confidence?: Confidence;
  tshirtSize?: TShirtSize;
  scope?: string;
  nonScope?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  ownerId: string;
  businessSponsorId?: string | null;
  contributingTeams?: string[];
  tags?: string[];
  productAreaId?: string | null;
}

/** PATCH body — `version` is mandatory (optimistic concurrency), everything else optional. */
export type UpdateInitiativeInput = { version: number } & Partial<
  Omit<CreateInitiativeInput, 'ownerId'> & {
    ownerId: string;
    actualStart: string | null;
    actualEnd: string | null;
  }
>;

export interface RepositionInput {
  version: number;
  roadmapBucket: RoadmapBucket | null;
  roadmapRank: number;
}

export interface BulkUpdateInput {
  ids: string[];
  patch: {
    phase?: InitiativePhase;
    ownerId?: string;
    productAreaId?: string | null;
    tags?: string[];
  };
}

export interface EntityVersionRow {
  id: string;
  version: number;
  snapshot: unknown;
  changedBy: string;
  changedAt: string;
  changeSummary: string | null;
}

export interface VersionDiffResult {
  version: number;
  changedBy: string;
  changedAt: string;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
}

export interface ActivityFeedItem {
  id: string;
  source: 'audit' | 'outbox';
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  occurredAt: string;
  detail: unknown;
}

export interface RoadmapResult {
  items: SharedInitiative[];
  groups: Array<{ key: string; label: string; initiativeIds: string[] }> | null;
}
