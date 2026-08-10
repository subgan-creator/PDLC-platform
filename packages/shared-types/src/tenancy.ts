import type { ISODateTimeString, TenantId, Timestamped } from './common';

/**
 * A tenant's data must never cross this boundary (A5: data residency).
 * Infra provisioning pins a tenant's DATABASE_URL/object storage to the
 * matching region; this field is the source of truth the platform checks
 * against at runtime.
 */
export type DataResidencyRegion = 'us' | 'eu' | 'uk' | 'apac';

export type TenantStatus = 'active' | 'suspended' | 'provisioning' | 'offboarding';

export interface Tenant extends Timestamped {
  id: TenantId;
  name: string;
  slug: string;
  status: TenantStatus;
  residencyRegion: DataResidencyRegion;
  /** BYOK — per-tenant encryption key reference (KMS key ARN / Vault path), not the key itself. */
  encryptionKeyRef: string | null;
  /** e.g. { retentionDays: 2555, legalHold: false } — see RetentionPolicy in audit.ts */
  retentionPolicyId: string | null;
}

/**
 * Records retention & legal hold (A5). Configurable per tenant, and per
 * entity type within a tenant (e.g. AuditEvent retained longer than a draft
 * comment).
 */
export interface RetentionPolicy {
  id: string;
  tenantId: TenantId;
  entityType: string;
  retentionDays: number;
  legalHoldActive: boolean;
  legalHoldReason: string | null;
  legalHoldSetAt: ISODateTimeString | null;
}
