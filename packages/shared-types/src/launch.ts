import type { Id, ISODateTimeString, TenantScoped, Timestamped, UserId } from './common';
import type { InitiativeId } from './initiative';

/**
 * Launch Workspace (JTBD 5): checklist by workstream, readiness score,
 * post-launch feedback capture, exec presentation generation (feeds
 * Reporting Studio rather than duplicating export logic).
 */
export type LaunchWorkstream =
  | 'training'
  | 'comms'
  | 'ops_readiness'
  | 'support'
  | 'legal_compliance'
  | 'pilot_plan'
  | 'rollback';

export interface LaunchChecklist extends Timestamped, TenantScoped {
  id: Id<'LaunchChecklist'>;
  initiativeId: InitiativeId;
  items: LaunchChecklistItem[];
}

export interface LaunchChecklistItem {
  id: Id<'LaunchChecklistItem'>;
  workstream: LaunchWorkstream;
  description: string;
  ownerId: UserId;
  dueDate: ISODateTimeString | null;
  status: 'not_started' | 'in_progress' | 'done' | 'blocked' | 'not_applicable';
  /** Legal/compliance sign-off items may require an e-signature, not just a checkbox. */
  requiresSignature: boolean;
}

export interface LaunchReadiness {
  initiativeId: InitiativeId;
  score: number; // 0-100, derived from checklist completion weighted by workstream
  computedAt: ISODateTimeString;
}

export interface PostLaunchFeedback extends Timestamped, TenantScoped {
  id: Id<'PostLaunchFeedback'>;
  initiativeId: InitiativeId;
  submittedBy: UserId;
  sentiment: 'positive' | 'neutral' | 'negative';
  comment: string;
}
