import type { Id, ISODateTimeString, TenantScoped, Timestamped, UserId } from './common';
import type { FeatureId } from './definition';
import type { InitiativeId } from './initiative';

/**
 * Experience Workspace (JTBD 3): PM writes the brief and flows, designer
 * produces wireframes/screens. Figma is pulled + embedded, never mirrored
 * as the source of truth (A6).
 */
export interface ExperienceBrief extends Timestamped, TenantScoped {
  id: Id<'ExperienceBrief'>;
  initiativeId: InitiativeId;
  problemToSolve: string;
  successCriteria: string;
  constraints: string;
}

export interface UserFlow extends Timestamped, TenantScoped {
  id: Id<'UserFlow'>;
  initiativeId: InitiativeId;
  title: string;
  /** Node/edge diagram, same diagram-as-data shape as ProcessFlow, reused by React Flow. */
  nodes: unknown[];
  edges: unknown[];
}

export interface FigmaFrameRef extends Timestamped, TenantScoped {
  id: Id<'FigmaFrameRef'>;
  featureId: FeatureId | null;
  userFlowId: Id<'UserFlow'> | null;
  figmaFileKey: string;
  figmaNodeId: string;
  frameName: string;
  thumbnailUrl: string | null;
  figmaVersionId: string;
  lastSyncedAt: ISODateTimeString;
}

export type DesignReviewStatus = 'pending' | 'approved' | 'changes_requested';

export interface DesignReview extends Timestamped, TenantScoped {
  id: Id<'DesignReview'>;
  figmaFrameRefId: Id<'FigmaFrameRef'>;
  reviewerId: UserId;
  status: DesignReviewStatus;
  comment: string | null;
  decidedAt: ISODateTimeString | null;
}
