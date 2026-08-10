import type { Id, PermissionId, RoleId, TenantScoped, Timestamped, UserId } from './common';

/**
 * The 10 personas from the brief (A2). NEVER used to fork the data model —
 * only to select an RBAC role bundle + a view composition over the one
 * shared domain model. See CLAUDE.md "personas are RBAC views" rule.
 */
export type PersonaKey =
  | 'product_manager' // v1 — full build
  | 'area_product_owner' // v2
  | 'product_executive' // v2
  | 'designer' // v1 — read/collaborate
  | 'engineer' // v1 — read-only
  | 'researcher' // v1 — contributes to Discovery
  | 'control_risk' // v2
  | 'governance' // v2
  | 'stakeholder' // v1 — read-only
  | 'senior_management'; // v2

export interface User extends Timestamped, TenantScoped {
  id: UserId;
  email: string;
  displayName: string;
  primaryPersona: PersonaKey;
  isServiceAccount: boolean;
  ssoSubject: string | null; // OIDC `sub` claim
  scimExternalId: string | null; // SCIM provisioning correlation id
  active: boolean;
}

/** A named bundle of permissions, assignable to users. Roles are tenant-scoped so a tenant can customize. */
export interface Role extends Timestamped, TenantScoped {
  id: RoleId;
  key: string; // e.g. "pm", "designer_readonly"
  name: string;
  description: string;
  personaKey: PersonaKey;
  isSystemRole: boolean; // seeded roles cannot be deleted, only cloned
}

/** Resource + action pair. Fine-grained: `initiative:read`, `story:write`, `control:attest`. */
export interface Permission {
  id: PermissionId;
  resource: string;
  action: PermissionAction;
  description: string;
}

export type PermissionAction =
  'create' | 'read' | 'update' | 'delete' | 'approve' | 'attest' | 'export';

export interface RolePermission {
  roleId: RoleId;
  permissionId: PermissionId;
}

export interface UserRole extends TenantScoped {
  userId: UserId;
  roleId: RoleId;
  /** Optional scope narrowing, e.g. restrict a PM role to specific initiatives/product areas. */
  scopeInitiativeId: Id<'Initiative'> | null;
  scopeProductAreaId: Id<'ProductArea'> | null;
  grantedBy: UserId;
  grantedAt: string;
  expiresAt: string | null;
}

/** Service accounts + scoped API tokens for integrations (A5). */
export interface ServiceAccount extends Timestamped, TenantScoped {
  id: Id<'ServiceAccount'>;
  name: string;
  description: string;
  active: boolean;
}

export interface ApiToken extends Timestamped, TenantScoped {
  id: Id<'ApiToken'>;
  serviceAccountId: Id<'ServiceAccount'> | null;
  ownerUserId: UserId | null;
  /** Never store the raw token — only a hash + short prefix for display ("pdlc_live_ab12...") */
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}
