import type { Id, ISODateTimeString, TenantScoped, Timestamped, UserId } from './common';
import type { InitiativeId } from './initiative';

/**
 * Discovery Hub (JTBD 1): Sources → Evidence → Insights → Opportunities →
 * Initiatives, with the promotion trail preserved end to end so any
 * initiative can answer "why are we doing this?"
 */
export type SourceType =
  | 'interview'
  | 'support_ticket'
  | 'survey'
  | 'competitive'
  | 'data_finding'
  | 'sales_call'
  | 'other';

export interface Source extends Timestamped, TenantScoped {
  id: Id<'Source'>;
  type: SourceType;
  name: string;
  /** Voice-of-customer connectors (Qualtrics/Medallia/Intercom/Zendesk) once wired. */
  connectorInstanceId: Id<'ConnectorInstance'> | null;
  externalRef: string | null;
}

export interface EvidenceItem extends Timestamped, TenantScoped {
  id: Id<'EvidenceItem'>;
  sourceId: Id<'Source'>;
  capturedAt: ISODateTimeString;
  capturedBy: UserId;
  content: string;
  tags: string[];
}

export interface Insight extends Timestamped, TenantScoped {
  id: Id<'Insight'>;
  title: string;
  summary: string;
  evidenceItemIds: Array<Id<'EvidenceItem'>>;
  tags: string[];
  confidence: 'low' | 'medium' | 'high';
}

export type OpportunityId = Id<'Opportunity'>;

export interface Opportunity extends Timestamped, TenantScoped {
  id: OpportunityId;
  title: string;
  problemFraming: string;
  insightIds: Array<Id<'Insight'>>;
  promotedToInitiativeId: InitiativeId | null;
  promotedAt: ISODateTimeString | null;
  promotedBy: UserId | null;
}

/** Opportunity Solution Tree node — outcome / opportunity / solution / experiment, linked as a tree. */
export type SolutionTreeNodeType = 'outcome' | 'opportunity' | 'solution' | 'experiment';

export interface OpportunitySolutionTreeNode extends TenantScoped {
  id: Id<'OpportunitySolutionTreeNode'>;
  opportunityId: OpportunityId;
  parentNodeId: Id<'OpportunitySolutionTreeNode'> | null;
  nodeType: SolutionTreeNodeType;
  label: string;
}
