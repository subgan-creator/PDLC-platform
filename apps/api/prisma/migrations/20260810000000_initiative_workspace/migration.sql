-- Phase 1: Initiative Workspace + Roadmap (Prompt 1) — the spine.
--
-- Hand-authored for the same reason as the init migration: no live Postgres
-- was reachable in this session. Matches prisma/schema.prisma exactly as of
-- this migration. Run `pnpm db:migrate` against a real database before the
-- next schema change; if Prisma reports drift, resolve this migration as
-- applied first.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."InitiativePhase" AS ENUM ('DISCOVERY', 'DEFINITION', 'BUILD', 'LAUNCH', 'ADOPT', 'DONE');
CREATE TYPE "public"."HealthStatus" AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE "public"."Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "public"."TShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL');
CREATE TYPE "public"."RaciRole" AS ENUM ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED');
CREATE TYPE "public"."RoadmapBucket" AS ENUM ('NOW', 'NEXT', 'LATER');
CREATE TYPE "public"."RaidType" AS ENUM ('RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY');
CREATE TYPE "public"."RaidSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "public"."RaidStatus" AS ENUM ('OPEN', 'MITIGATED', 'CLOSED');
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PLANNED', 'DONE', 'MISSED');
CREATE TYPE "public"."LinkTargetType" AS ENUM ('EXTERNAL_URL', 'STORY', 'FIGMA_FRAME', 'CONFLUENCE_PAGE', 'JIRA_ISSUE', 'OTHER');

-- ---------------------------------------------------------------------------
-- product_areas
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."product_areas" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessLineId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_areas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_areas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_areas_tenantId_key_key" ON "public"."product_areas"("tenantId", "key");
CREATE INDEX "product_areas_tenantId_idx" ON "public"."product_areas"("tenantId");

-- ---------------------------------------------------------------------------
-- initiatives
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."initiatives" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "problemStatement" TEXT NOT NULL,
  "phase" "public"."InitiativePhase" NOT NULL DEFAULT 'DISCOVERY',
  "health" "public"."HealthStatus" NOT NULL DEFAULT 'GREEN',
  "healthReason" TEXT,
  "confidence" "public"."Confidence" NOT NULL DEFAULT 'MEDIUM',
  "tshirtSize" "public"."TShirtSize" NOT NULL DEFAULT 'M',
  "scope" TEXT NOT NULL,
  "nonScope" TEXT NOT NULL,
  "plannedStart" TIMESTAMP(3),
  "plannedEnd" TIMESTAMP(3),
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  "businessSponsorId" TEXT,
  "contributingTeams" TEXT[],
  "tags" TEXT[],
  "productAreaId" TEXT,
  "sourceOpportunityId" TEXT,
  "roadmapBucket" "public"."RoadmapBucket",
  "roadmapRank" DOUBLE PRECISION,
  "stageGateStatus" TEXT NOT NULL DEFAULT 'not_applicable',
  "controlIds" TEXT[],
  "dataClassification" "public"."DataClassification" NOT NULL DEFAULT 'INTERNAL',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "initiatives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "initiatives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initiatives_productAreaId_fkey" FOREIGN KEY ("productAreaId") REFERENCES "public"."product_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "initiatives_tenantId_slug_key" ON "public"."initiatives"("tenantId", "slug");
CREATE INDEX "initiatives_tenantId_idx" ON "public"."initiatives"("tenantId");
CREATE INDEX "initiatives_tenantId_phase_idx" ON "public"."initiatives"("tenantId", "phase");
CREATE INDEX "initiatives_tenantId_productAreaId_idx" ON "public"."initiatives"("tenantId", "productAreaId");
CREATE INDEX "initiatives_tenantId_ownerId_idx" ON "public"."initiatives"("tenantId", "ownerId");
CREATE INDEX "initiatives_tenantId_roadmapBucket_idx" ON "public"."initiatives"("tenantId", "roadmapBucket");

-- ---------------------------------------------------------------------------
-- outcome_metrics / hypotheses
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."outcome_metrics" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  "baseline" DOUBLE PRECISION,
  "target" DOUBLE PRECISION NOT NULL,
  "current" DOUBLE PRECISION,
  "unit" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  CONSTRAINT "outcome_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outcome_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "outcome_metrics_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "outcome_metrics_tenantId_initiativeId_idx" ON "public"."outcome_metrics"("tenantId", "initiativeId");

CREATE TABLE "public"."hypotheses" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "confidence" "public"."Confidence" NOT NULL DEFAULT 'MEDIUM',
  "validated" BOOLEAN,
  CONSTRAINT "hypotheses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hypotheses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hypotheses_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "hypotheses_tenantId_initiativeId_idx" ON "public"."hypotheses"("tenantId", "initiativeId");

-- ---------------------------------------------------------------------------
-- raid_items / milestones / status_updates
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."raid_items" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "type" "public"."RaidType" NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "public"."RaidSeverity" NOT NULL,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "mitigation" TEXT,
  "status" "public"."RaidStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raid_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "raid_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "raid_items_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "raid_items_tenantId_initiativeId_idx" ON "public"."raid_items"("tenantId", "initiativeId");

CREATE TABLE "public"."milestones" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milestones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "milestones_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "milestones_tenantId_initiativeId_idx" ON "public"."milestones"("tenantId", "initiativeId");

CREATE TABLE "public"."status_updates" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "authoredBy" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "progress" TEXT NOT NULL,
  "next" TEXT NOT NULL,
  "risks" TEXT NOT NULL,
  "asks" TEXT NOT NULL,
  "healthAtTimeOfUpdate" "public"."HealthStatus" NOT NULL,
  "draftedFromActivity" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "status_updates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "status_updates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "status_updates_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "status_updates_tenantId_initiativeId_idx" ON "public"."status_updates"("tenantId", "initiativeId");

-- ---------------------------------------------------------------------------
-- initiative_links / initiative_comments / initiative_watchers / initiative_stakeholders
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."initiative_links" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "targetType" "public"."LinkTargetType" NOT NULL,
  "targetId" TEXT,
  "url" TEXT,
  "label" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "initiative_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "initiative_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initiative_links_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "initiative_links_tenantId_initiativeId_idx" ON "public"."initiative_links"("tenantId", "initiativeId");

CREATE TABLE "public"."initiative_comments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "parentCommentId" TEXT,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "mentionedUserIds" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "initiative_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "initiative_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initiative_comments_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "initiative_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."initiative_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "initiative_comments_tenantId_initiativeId_idx" ON "public"."initiative_comments"("tenantId", "initiativeId");
CREATE INDEX "initiative_comments_tenantId_parentCommentId_idx" ON "public"."initiative_comments"("tenantId", "parentCommentId");

CREATE TABLE "public"."initiative_watchers" (
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "initiative_watchers_pkey" PRIMARY KEY ("initiativeId", "userId"),
  CONSTRAINT "initiative_watchers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initiative_watchers_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "initiative_watchers_tenantId_idx" ON "public"."initiative_watchers"("tenantId");

CREATE TABLE "public"."initiative_stakeholders" (
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "raciRole" "public"."RaciRole" NOT NULL,
  CONSTRAINT "initiative_stakeholders_pkey" PRIMARY KEY ("initiativeId", "userId", "raciRole"),
  CONSTRAINT "initiative_stakeholders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initiative_stakeholders_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "initiative_stakeholders_tenantId_idx" ON "public"."initiative_stakeholders"("tenantId");

-- ---------------------------------------------------------------------------
-- entity_versions / outbox_events
-- ---------------------------------------------------------------------------

CREATE TABLE "public"."entity_versions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changeSummary" TEXT,
  CONSTRAINT "entity_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entity_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "entity_versions_tenantId_entityType_entityId_version_key" ON "public"."entity_versions"("tenantId", "entityType", "entityId", "version");
CREATE INDEX "entity_versions_tenantId_entityType_entityId_idx" ON "public"."entity_versions"("tenantId", "entityType", "entityId");

CREATE TABLE "public"."outbox_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "initiativeId" TEXT,
  "actorUserId" TEXT,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "outbox_events_tenantId_occurredAt_idx" ON "public"."outbox_events"("tenantId", "occurredAt");
CREATE INDEX "outbox_events_tenantId_processedAt_idx" ON "public"."outbox_events"("tenantId", "processedAt");
CREATE INDEX "outbox_events_tenantId_initiativeId_idx" ON "public"."outbox_events"("tenantId", "initiativeId");

-- ---------------------------------------------------------------------------
-- Row-Level Security — same pattern as the init migration (docs/06-adr/ADR-0002).
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."product_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_areas" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."product_areas"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."initiatives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."initiatives" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."initiatives"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."outcome_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."outcome_metrics" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."outcome_metrics"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."hypotheses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."hypotheses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."hypotheses"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."raid_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."raid_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."raid_items"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."milestones" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."milestones"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."status_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."status_updates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."status_updates"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."initiative_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."initiative_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."initiative_links"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."initiative_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."initiative_comments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."initiative_comments"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."initiative_watchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."initiative_watchers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."initiative_watchers"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."initiative_stakeholders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."initiative_stakeholders" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."initiative_stakeholders"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- entity_versions: read-scoped by tenant; INSERT-only from the app (no
-- UPDATE/DELETE policy — a version row is immutable once written, same
-- rationale as audit_events).
ALTER TABLE "public"."entity_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."entity_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_read" ON "public"."entity_versions"
  FOR SELECT
  USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY "tenant_isolation_insert" ON "public"."entity_versions"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- outbox_events: read/insert scoped by tenant, PLUS an UPDATE policy
-- restricted to setting processedAt (the only field a consumer ever
-- touches) — unlike audit_events/entity_versions this table is not fully
-- append-only, since a consumer marks rows processed.
ALTER TABLE "public"."outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."outbox_events"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
