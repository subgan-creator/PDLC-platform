-- Phase 0 foundation: tenancy, RBAC, attachments, append-only audit log,
-- plus Row-Level Security on every tenant-scoped table.
--
-- This migration was hand-authored (no live Postgres was reachable in the
-- scaffolding session) to exactly match prisma/schema.prisma. Before the
-- next schema change, run `pnpm db:migrate` once against a real database —
-- if Prisma reports drift, `prisma migrate resolve` this migration as
-- applied first.

CREATE SCHEMA IF NOT EXISTS "audit";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PROVISIONING', 'OFFBOARDING');
CREATE TYPE "public"."DataResidencyRegion" AS ENUM ('US', 'EU', 'UK', 'APAC');
CREATE TYPE "public"."Persona" AS ENUM (
  'PRODUCT_MANAGER', 'AREA_PRODUCT_OWNER', 'PRODUCT_EXECUTIVE', 'DESIGNER',
  'ENGINEER', 'RESEARCHER', 'CONTROL_RISK', 'GOVERNANCE', 'STAKEHOLDER', 'SENIOR_MANAGEMENT'
);
CREATE TYPE "public"."PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'ATTEST', 'EXPORT');
CREATE TYPE "public"."DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'MNPI', 'GXP');
CREATE TYPE "public"."VirusScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR');
CREATE TYPE "audit"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ_SENSITIVE', 'EXPORT', 'ATTEST', 'SIGN');

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "public"."TenantStatus" NOT NULL DEFAULT 'PROVISIONING',
  "residencyRegion" "public"."DataResidencyRegion" NOT NULL DEFAULT 'US',
  "encryptionKeyRef" TEXT,
  "retentionPolicyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."users" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "primaryPersona" "public"."Persona" NOT NULL,
  "isServiceAccount" BOOLEAN NOT NULL DEFAULT false,
  "ssoSubject" TEXT,
  "scimExternalId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "public"."users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx" ON "public"."users"("tenantId");

CREATE TABLE "public"."roles" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "personaKey" "public"."Persona" NOT NULL,
  "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "roles_tenantId_key_key" ON "public"."roles"("tenantId", "key");
CREATE INDEX "roles_tenantId_idx" ON "public"."roles"("tenantId");

CREATE TABLE "public"."permissions" (
  "id" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" "public"."PermissionAction" NOT NULL,
  "description" TEXT NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions"("resource", "action");

CREATE TABLE "public"."role_permissions" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId"),
  CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."user_roles" (
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "scopeInitiativeId" TEXT,
  "scopeProductAreaId" TEXT,
  "grantedBy" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId"),
  CONSTRAINT "user_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_roles_tenantId_idx" ON "public"."user_roles"("tenantId");

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."attachments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "dataClassification" "public"."DataClassification" NOT NULL DEFAULT 'INTERNAL',
  "virusScanStatus" "public"."VirusScanStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attachments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "attachments_tenantId_ownerType_ownerId_idx" ON "public"."attachments"("tenantId", "ownerType", "ownerId");

-- ---------------------------------------------------------------------------
-- Audit (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE "audit"."audit_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorServiceAccountId" TEXT,
  "action" "audit"."AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_events_tenantId_entityType_entityId_idx" ON "audit"."audit_events"("tenantId", "entityType", "entityId");
CREATE INDEX "audit_events_tenantId_occurredAt_idx" ON "audit"."audit_events"("tenantId", "occurredAt");

-- ---------------------------------------------------------------------------
-- Row-Level Security (docs/06-adr/ADR-0002)
--
-- Every tenant-scoped table is FORCE-enabled (owners are not exempt) so a
-- bug that skips the app-layer tenant filter still cannot leak cross-tenant
-- rows. The app's runtime DB role must NOT be the table owner and must NOT
-- have BYPASSRLS — create it explicitly rather than relying on Postgres
-- defaults, e.g.:
--
--   CREATE ROLE pdlc_app LOGIN PASSWORD '...' NOBYPASSRLS;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pdlc_app;
--   GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO pdlc_app; -- no UPDATE/DELETE, ever
--
-- RequestContextMiddleware + PrismaService set `app.tenant_id` with
-- `SET LOCAL` at the start of every request-scoped transaction (see
-- apps/api/src/prisma/prisma.service.ts). `current_setting(..., true)`
-- returns NULL rather than erroring when unset, which makes the policy
-- fail closed (no session var => no rows) instead of failing open.
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."users"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."roles"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."user_roles"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."attachments"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- audit_events: readable only within your tenant's session context, and
-- INSERT-only at the application layer. UPDATE/DELETE are blocked by the
-- GRANT model above, not by policy, so even a superuser mistake in app code
-- fails at the privilege check rather than relying on policy logic alone.
ALTER TABLE "audit"."audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit"."audit_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_read" ON "audit"."audit_events"
  FOR SELECT
  USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY "tenant_isolation_insert" ON "audit"."audit_events"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- `tenants` itself is not RLS-scoped (there is no wider tenant to scope it
-- to); access is gated entirely by RBAC (platform-admin only) at the app layer.
