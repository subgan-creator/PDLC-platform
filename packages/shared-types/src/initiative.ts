import type {
  Classified,
  ControlMappable,
  Id,
  ISODateTimeString,
  StageGated,
  TenantScoped,
  Timestamped,
  UserId,
  Versioned,
} from './common';

export type InitiativeId = Id<'Initiative'>;
export type ProductAreaId = Id<'ProductArea'>;

/**
 * The portfolio parent hook for the Initiative (A2/A8 Phase 1 note: nullable
 * today, becomes the Area Product Owner's scope in v2 persona expansion).
 * Deliberately minimal — a name and a key — until Phase 11 needs more.
 */
export interface ProductArea extends Timestamped, TenantScoped {
  id: ProductAreaId;
  key: string;
  name: string;
  businessLineId: Id<'BusinessLine'> | null;
}

// NOTE ON CASING: these mirror the Prisma enums (schema.prisma) and the Zod
// DTOs in apps/api/src/initiatives/dto — i.e. the actual wire format —
// verbatim, including case. Domain types elsewhere in this package that
// predate the Initiative Workspace (e.g. PersonaKey, DataClassification's
// sibling usages) use lowercase snake_case instead; that's a known,
// pre-existing drift from the DB-backed casing, not something to copy here.
export type InitiativePhase = 'DISCOVERY' | 'DEFINITION' | 'BUILD' | 'LAUNCH' | 'ADOPT' | 'DONE';

export type HealthStatus = 'GREEN' | 'AMBER' | 'RED';

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type RaciRole = 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED';

/** Manual PM placement on the roadmap — distinct from `phase`, which tracks lifecycle state, not roadmap priority. */
export type RoadmapBucket = 'NOW' | 'NEXT' | 'LATER';

/**
 * The spine of the system (A3, JTBD 2; Prompt 1). Every downstream module
 * (Discovery, Definition, Experience, Launch, Reporting, Quality) hangs off
 * an Initiative. Carries v2 fields (portfolio, stage gate, controls) from
 * Phase 0 per the "no churn later" rule.
 */
export interface Initiative
  extends Timestamped,
    TenantScoped,
    Classified,
    StageGated,
    ControlMappable,
    Versioned {
  id: InitiativeId;
  title: string;
  slug: string;
  problemStatement: string;

  phase: InitiativePhase;
  health: HealthStatus;
  /** Required by the API whenever `health !== 'GREEN'` — enforced at the Zod boundary, not just in the UI. */
  healthReason: string | null;
  confidence: Confidence;
  tshirtSize: TShirtSize;

  scope: string;
  /** Explicit non-scope — what this initiative deliberately does NOT cover. */
  nonScope: string;

  plannedStart: ISODateTimeString | null;
  plannedEnd: ISODateTimeString | null;
  actualStart: ISODateTimeString | null;
  actualEnd: ISODateTimeString | null;

  ownerId: UserId;
  businessSponsorId: UserId | null;
  contributingTeams: string[];
  tags: string[];

  productAreaId: ProductAreaId | null;
  /** Trail preserved from Discovery (JTBD 1) once that module ships — no FK yet, Opportunity doesn't exist until Phase 2. */
  sourceOpportunityId: Id<'Opportunity'> | null;

  roadmapBucket: RoadmapBucket | null;
  /** Fractional/sparse rank for stable drag-to-reorder within a bucket; recomputed lazily, never renumbered on every write. */
  roadmapRank: number | null;

  archivedAt: ISODateTimeString | null;
}

export interface OutcomeMetric {
  id: Id<'OutcomeMetric'>;
  initiativeId: InitiativeId;
  metricName: string;
  baseline: number | null;
  target: number;
  current: number | null;
  unit: string;
  /** Free-text today; becomes a connector reference once Amplitude/Mixpanel/Tableau/Power BI pull lands (A6). */
  source: string;
}

export interface Hypothesis {
  id: Id<'Hypothesis'>;
  initiativeId: InitiativeId;
  statement: string; // "We believe that ... will result in ..."
  confidence: Confidence;
  validated: boolean | null; // null = not yet tested
}

export type RaidType = 'RISK' | 'ASSUMPTION' | 'ISSUE' | 'DEPENDENCY';
export type RaidSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RaidStatus = 'OPEN' | 'MITIGATED' | 'CLOSED';

export interface RaidItem extends Timestamped {
  id: Id<'RaidItem'>;
  initiativeId: InitiativeId;
  type: RaidType;
  description: string;
  severity: RaidSeverity;
  ownerId: UserId | null;
  dueDate: ISODateTimeString | null;
  mitigation: string | null;
  status: RaidStatus;
}

export type MilestoneStatus = 'PLANNED' | 'DONE' | 'MISSED';

export interface Milestone extends Timestamped {
  id: Id<'Milestone'>;
  initiativeId: InitiativeId;
  title: string;
  dueDate: ISODateTimeString;
  status: MilestoneStatus;
  description: string | null;
}

/**
 * Structured periodic update — the input to the Reporting Studio (JTBD 6,
 * Phase 8). `progress/next/risks/asks` map directly onto report sections.
 * Auto-drafting this from the last two weeks of activity is a Phase 9 (AI
 * Assist) concern — `draftedFromActivity` is the seam for it: null today,
 * an AiDraftProvenance-shaped record once that lands.
 */
export interface StatusUpdate {
  id: Id<'StatusUpdate'>;
  initiativeId: InitiativeId;
  authoredBy: UserId;
  periodStart: ISODateTimeString;
  periodEnd: ISODateTimeString;
  progress: string;
  next: string;
  risks: string;
  asks: string;
  healthAtTimeOfUpdate: HealthStatus;
  createdAt: ISODateTimeString;
  draftedFromActivity: unknown | null;
}

export type LinkTargetType = 'EXTERNAL_URL' | 'STORY' | 'FIGMA_FRAME' | 'CONFLUENCE_PAGE' | 'JIRA_ISSUE' | 'OTHER';

/** Typed link from an Initiative to any other entity or an external URL. */
export interface InitiativeLink extends Timestamped {
  id: Id<'InitiativeLink'>;
  initiativeId: InitiativeId;
  targetType: LinkTargetType;
  targetId: string | null; // internal entity id, when targetType isn't EXTERNAL_URL/OTHER
  url: string | null; // required when targetType is EXTERNAL_URL
  label: string;
  createdBy: UserId;
}

/** Threaded comment with @mentions — mentions feed the Unified Inbox once Phase 4 ships. */
export interface InitiativeComment {
  id: Id<'InitiativeComment'>;
  initiativeId: InitiativeId;
  parentCommentId: Id<'InitiativeComment'> | null;
  authorId: UserId;
  body: string;
  mentionedUserIds: UserId[];
  createdAt: ISODateTimeString;
  editedAt: ISODateTimeString | null;
  deletedAt: ISODateTimeString | null;
}

export interface InitiativeWatcher {
  initiativeId: InitiativeId;
  userId: UserId;
  createdAt: ISODateTimeString;
}

export interface InitiativeStakeholder {
  initiativeId: InitiativeId;
  userId: UserId;
  raciRole: RaciRole;
}

/**
 * Roadmap view model (Now/Next/Later + capacity-aware timeline). Derived
 * from Initiative rows (`roadmapBucket`/`roadmapRank`/`plannedStart`/
 * `plannedEnd`), not a separate source of truth — kept here as the shape
 * the roadmap API returns.
 */
export interface RoadmapEntry {
  initiativeId: InitiativeId;
  bucket: RoadmapBucket;
  rank: number;
  plannedStart: ISODateTimeString | null;
  plannedEnd: ISODateTimeString | null;
  teamCapacityPoints: number | null;
}
