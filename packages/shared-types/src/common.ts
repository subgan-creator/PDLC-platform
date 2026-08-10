/**
 * Cross-cutting primitives used by every domain module below.
 */

/** Branded ID so `InitiativeId` and `TenantId` can't be swapped by mistake. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export type TenantId = Id<'Tenant'>;
export type UserId = Id<'User'>;
export type RoleId = Id<'Role'>;
export type PermissionId = Id<'Permission'>;
export type AttachmentId = Id<'Attachment'>;
export type AuditEventId = Id<'AuditEvent'>;

/** ISO-8601 timestamp, always UTC on the wire. */
export type ISODateTimeString = string;

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

/**
 * RFC 9457 problem+json shape. Every API error response uses this — see
 * `apps/api` global exception filter. Kept here so `apps/web` can type
 * error responses without importing server code.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Every tenant-scoped row carries these. Enforced twice: application-level
 * (repository layer must filter/set tenantId) and database-level (Postgres
 * RLS policy keyed on the same column) — see docs/06-adr/ADR-0002.
 */
export interface TenantScoped {
  tenantId: TenantId;
}

/** Standard soft-audit trail fields most domain entities carry. */
export interface Timestamped {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface Actored {
  createdBy: UserId;
  updatedBy: UserId;
}

/**
 * Data classification for ABAC overlays (A5). Any entity that can be tagged
 * MNPI (banks) or GxP (pharma) must carry this so access guards can layer
 * classification-based rules on top of RBAC.
 */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'mnpi' | 'gxp';

export interface Classified {
  dataClassification: DataClassification;
}

/**
 * Every artifact with full version history (A5: "full version history on
 * every artifact with diff and restore") implements this.
 */
export interface Versioned {
  version: number;
}

/**
 * Schema for 21 CFR Part 11 style electronic signatures. Modeled in v1 per
 * the brief even though no UI exposes it until v2 (pharma persona expansion).
 */
export interface ElectronicSignature {
  signedBy: UserId;
  signedAt: ISODateTimeString;
  meaningOfSignature: string; // e.g. "Approved", "Reviewed", "Author"
  signedRecordHash: string; // hash of the exact record state at signing time
  requestId: string;
}

/**
 * Stage-gate state every initiative-adjacent entity should be able to carry,
 * even though the Governance persona (gates, intake, funding approvals) is a
 * v2 build — so v1 entities don't need a breaking migration to add it later.
 */
export type StageGateStatus =
  | 'not_applicable'
  | 'pending_intake'
  | 'gate_1_discovery'
  | 'gate_2_definition'
  | 'gate_3_build'
  | 'gate_4_launch'
  | 'gate_5_closed';

export interface StageGated {
  stageGateStatus: StageGateStatus;
}

/**
 * Portfolio hierarchy pointer so v2 rollups (Area Product Owner, Product
 * Executive, Senior Management) can aggregate v1 initiatives without a
 * migration. Nullable until portfolio/product-area entities ship.
 */
export interface PortfolioPlaceable {
  productAreaId: Id<'ProductArea'> | null;
  businessLineId: Id<'BusinessLine'> | null;
}

/**
 * Control/policy mapping placeholder so any v1 entity that later needs
 * compliance traceability (JTBD 4c) already has the field. v1 UI may leave
 * this empty; v2+ populates it.
 */
export interface ControlMappable {
  controlIds: Array<Id<'Control'>>;
}
