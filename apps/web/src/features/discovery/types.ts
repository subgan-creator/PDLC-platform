// Hand-declared to match the API's actual wire shape (Prisma enum casing,
// e.g. 'MEDIUM' not 'medium'), same approach as features/initiatives/types.ts
// — packages/shared-types/src/discovery.ts is the spec for the SHAPE, but
// its Insight.confidence is an inline lowercase literal that doesn't match
// what the running API returns (schema.prisma deliberately reuses the
// existing uppercase Confidence enum instead of declaring a duplicate —
// see that file's comment), so this file declares its own types rather
// than importing shared-types' directly and fighting that mismatch.

export type SourceType =
  | 'INTERVIEW'
  | 'SUPPORT_TICKET'
  | 'SURVEY'
  | 'COMPETITIVE'
  | 'DATA_FINDING'
  | 'SALES_CALL'
  | 'OTHER';

export interface Source {
  id: string;
  tenantId: string;
  type: SourceType;
  name: string;
  connectorInstanceId: string | null;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  tenantId: string;
  sourceId: string;
  capturedAt: string;
  capturedBy: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Insight {
  id: string;
  tenantId: string;
  title: string;
  summary: string;
  evidenceItemIds: string[];
  tags: string[];
  confidence: Confidence;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  tenantId: string;
  title: string;
  problemFraming: string;
  insightIds: string[];
  promotedToInitiativeId: string | null;
  promotedAt: string | null;
  promotedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SolutionTreeNodeType = 'OUTCOME' | 'OPPORTUNITY' | 'SOLUTION' | 'EXPERIMENT';

export interface OpportunitySolutionTreeNode {
  id: string;
  tenantId: string;
  opportunityId: string;
  parentNodeId: string | null;
  nodeType: SolutionTreeNodeType;
  label: string;
}

// --- Request/response shapes -----------------------------------------------

export interface CreateSourceInput {
  type: SourceType;
  name: string;
  connectorInstanceId?: string | null;
  externalRef?: string | null;
}
export type UpdateSourceInput = Partial<CreateSourceInput>;

export interface CreateEvidenceItemInput {
  capturedAt: string;
  capturedBy: string;
  content: string;
  tags?: string[];
}
export type UpdateEvidenceItemInput = Partial<CreateEvidenceItemInput>;

export interface CreateInsightInput {
  title: string;
  summary: string;
  evidenceItemIds?: string[];
  tags?: string[];
  confidence?: Confidence;
}
export type UpdateInsightInput = Partial<CreateInsightInput>;

export interface ListInsightsParams {
  cursor?: string;
  limit?: number;
  q?: string;
}
export interface ListInsightsResult {
  items: Insight[];
  nextCursor: string | null;
}

export interface CreateOpportunityInput {
  title: string;
  problemFraming: string;
  insightIds?: string[];
}
export type UpdateOpportunityInput = Partial<CreateOpportunityInput>;

export interface ListOpportunitiesParams {
  cursor?: string;
  limit?: number;
  q?: string;
  promoted?: boolean;
}
export interface ListOpportunitiesResult {
  items: Opportunity[];
  nextCursor: string | null;
}

export interface PromoteOpportunityInput {
  ownerId?: string | null;
}

export interface CreateSolutionTreeNodeInput {
  parentNodeId?: string | null;
  nodeType: SolutionTreeNodeType;
  label: string;
}
export type UpdateSolutionTreeNodeInput = Partial<CreateSolutionTreeNodeInput>;
