import type {
  Classified,
  ControlMappable,
  Id,
  ISODateTimeString,
  PortfolioPlaceable,
  StageGated,
  TenantScoped,
  Timestamped,
  UserId,
  Versioned,
} from './common';

export type InitiativeId = Id<'Initiative'>;

/**
 * The spine of the system (A3, JTBD 2). Every downstream module (Discovery,
 * Definition, Experience, Launch, Reporting, Quality) hangs off an
 * Initiative. Carries v2 fields (portfolio, stage gate, controls) from
 * Phase 0 per the "no churn later" rule.
 */
export interface Initiative
  extends
    Timestamped,
    TenantScoped,
    Classified,
    StageGated,
    PortfolioPlaceable,
    ControlMappable,
    Versioned {
  id: InitiativeId;
  key: string; // human-readable short code, e.g. "INIT-142"
  title: string;
  problemStatement: string;
  ownerId: UserId; // the PM
  phase: InitiativePhase;
  health: InitiativeHealth;
  targetOutcomes: OutcomeMetric[];
  hypotheses: Hypothesis[];
  scopeItems: ScopeItem[];
  raidItems: RaidItem[];
  stakeholders: InitiativeStakeholder[];
  /** Opportunity this initiative was promoted from, if any — preserves the "why" trail (JTBD 1). */
  sourceOpportunityId: Id<'Opportunity'> | null;
  startDate: ISODateTimeString | null;
  targetDate: ISODateTimeString | null;
  archivedAt: ISODateTimeString | null;
}

export type InitiativePhase =
  'discovery' | 'definition' | 'design' | 'build' | 'launch' | 'post_launch' | 'closed';

export type InitiativeHealth = 'on_track' | 'at_risk' | 'off_track' | 'unknown';

export interface OutcomeMetric {
  id: Id<'OutcomeMetric'>;
  name: string;
  baseline: number | null;
  target: number;
  current: number | null;
  unit: string;
  /** External metrics-tool source (Amplitude/Mixpanel/Tableau/Power BI) once Integration Service ships. */
  sourceConnectorId: Id<'ConnectorInstance'> | null;
}

export interface Hypothesis {
  id: Id<'Hypothesis'>;
  statement: string; // "We believe that ... will result in ... "
  confidence: 'low' | 'medium' | 'high';
  validated: boolean | null; // null = not yet tested
}

export interface ScopeItem {
  id: Id<'ScopeItem'>;
  description: string;
  inScope: boolean;
}

export type RaidType = 'risk' | 'assumption' | 'issue' | 'dependency';
export type RaidSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RaidItem {
  id: Id<'RaidItem'>;
  type: RaidType;
  description: string;
  severity: RaidSeverity;
  ownerId: UserId | null;
  status: 'open' | 'mitigated' | 'closed';
  dueDate: ISODateTimeString | null;
}

export interface InitiativeStakeholder {
  userId: UserId;
  roleOnInitiative: 'sponsor' | 'approver' | 'contributor' | 'informed';
}

/**
 * Roadmap view model (Now/Next/Later + capacity-aware timeline). Derived
 * from Initiative rows, not a separate source of truth — kept here as the
 * shape the roadmap API returns.
 */
export interface RoadmapEntry {
  initiativeId: InitiativeId;
  bucket: 'now' | 'next' | 'later';
  plannedStart: ISODateTimeString | null;
  plannedEnd: ISODateTimeString | null;
  teamCapacityPoints: number | null;
}
