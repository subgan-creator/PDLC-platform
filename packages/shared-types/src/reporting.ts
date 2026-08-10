import type { Id, ISODateTimeString, TenantScoped, Timestamped, UserId } from './common';
import type { InitiativeId } from './initiative';

/**
 * Reporting Studio (JTBD 6): one data model, many audience-tuned templates,
 * auto-populated from live initiative data, with a delta-since-last-report
 * section for context recovery between forums.
 */
export type ReportAudience =
  | 'scrum_of_scrums'
  | 'area_review'
  | 'exec_steering'
  | 'governance_gate'
  | 'risk_forum'
  | 'all_hands';

export type ReportExportFormat = 'pptx' | 'pdf' | 'email' | 'confluence';

export interface ReportTemplate extends Timestamped, TenantScoped {
  id: Id<'ReportTemplate'>;
  name: string;
  audience: ReportAudience;
  /** Ordered list of section keys this template renders, e.g. ["health", "raid", "metrics", "delta"]. */
  sections: string[];
}

export interface ReportInstance extends Timestamped, TenantScoped {
  id: Id<'ReportInstance'>;
  templateId: Id<'ReportTemplate'>;
  initiativeId: InitiativeId;
  generatedBy: UserId;
  generatedAt: ISODateTimeString;
  periodStart: ISODateTimeString;
  periodEnd: ISODateTimeString;
  /** Section deltas vs. the previous ReportInstance for the same template+initiative. */
  deltaSinceLast: string | null;
  exportFormat: ReportExportFormat | null;
  exportedAttachmentId: Id<'Attachment'> | null;
}
