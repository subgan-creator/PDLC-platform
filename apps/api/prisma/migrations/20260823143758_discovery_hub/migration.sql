-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('INTERVIEW', 'SUPPORT_TICKET', 'SURVEY', 'COMPETITIVE', 'DATA_FINDING', 'SALES_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SolutionTreeNodeType" AS ENUM ('OUTCOME', 'OPPORTUNITY', 'SOLUTION', 'EXPERIMENT');

-- DropForeignKey
ALTER TABLE "public"."initiative_comments" DROP CONSTRAINT "initiative_comments_parentCommentId_fkey";

-- CreateTable
CREATE TABLE "public"."sources" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "public"."SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "connectorInstanceId" TEXT,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evidence_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."insights" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceItemIds" TEXT[],
    "tags" TEXT[],
    "confidence" "public"."Confidence" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."opportunities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problemFraming" TEXT NOT NULL,
    "insightIds" TEXT[],
    "promotedToInitiativeId" TEXT,
    "promotedAt" TIMESTAMP(3),
    "promotedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."opportunity_solution_tree_nodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "parentNodeId" TEXT,
    "nodeType" "public"."SolutionTreeNodeType" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "opportunity_solution_tree_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sources_tenantId_idx" ON "public"."sources"("tenantId");

-- CreateIndex
CREATE INDEX "evidence_items_tenantId_sourceId_idx" ON "public"."evidence_items"("tenantId", "sourceId");

-- CreateIndex
CREATE INDEX "insights_tenantId_idx" ON "public"."insights"("tenantId");

-- CreateIndex
CREATE INDEX "opportunities_tenantId_idx" ON "public"."opportunities"("tenantId");

-- CreateIndex
CREATE INDEX "opportunities_tenantId_promotedToInitiativeId_idx" ON "public"."opportunities"("tenantId", "promotedToInitiativeId");

-- CreateIndex
CREATE INDEX "opportunity_solution_tree_nodes_tenantId_opportunityId_idx" ON "public"."opportunity_solution_tree_nodes"("tenantId", "opportunityId");

-- CreateIndex
CREATE INDEX "opportunity_solution_tree_nodes_tenantId_parentNodeId_idx" ON "public"."opportunity_solution_tree_nodes"("tenantId", "parentNodeId");

-- AddForeignKey
ALTER TABLE "public"."initiatives" ADD CONSTRAINT "initiatives_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."initiative_comments" ADD CONSTRAINT "initiative_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."initiative_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sources" ADD CONSTRAINT "sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_items" ADD CONSTRAINT "evidence_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_items" ADD CONSTRAINT "evidence_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."insights" ADD CONSTRAINT "insights_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_promotedToInitiativeId_fkey" FOREIGN KEY ("promotedToInitiativeId") REFERENCES "public"."initiatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunity_solution_tree_nodes" ADD CONSTRAINT "opportunity_solution_tree_nodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunity_solution_tree_nodes" ADD CONSTRAINT "opportunity_solution_tree_nodes_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunity_solution_tree_nodes" ADD CONSTRAINT "opportunity_solution_tree_nodes_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "public"."opportunity_solution_tree_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity
-- Every tenant-scoped table gets RLS enabled + forced, with a policy keyed
-- on the app.tenant_id session variable — see the header comment in
-- schema.prisma and docs/06-adr/ADR-0002. Pattern copied verbatim from
-- prisma/migrations/20260810000000_initiative_workspace/migration.sql.
ALTER TABLE "public"."sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sources" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."sources"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."evidence_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."evidence_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."evidence_items"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."insights" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."insights"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."opportunities" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."opportunities"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "public"."opportunity_solution_tree_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."opportunity_solution_tree_nodes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "public"."opportunity_solution_tree_nodes"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
