import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Covers the Discovery Hub CRUD + the promote-to-initiative flow against a
 * real seeded Postgres — requires `docker compose up -d && pnpm db:migrate
 * && pnpm db:seed` first (same precondition as every other e2e spec here).
 * Looks up a real PM user in the acme-bank tenant directly via Prisma
 * (there's no fixture-factory in this repo — apps/web's e2e/global-setup.ts
 * does the equivalent lookup for Playwright) rather than hardcoding ids,
 * since seeded ids are randomly generated on every `pnpm db:seed` run.
 */
describe('Discovery Hub (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let tenantId: string;
  let pmUserId: string;
  let engineerUserId: string;
  let otherTenantId: string;
  let otherTenantUserId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://pdlc:pdlc@localhost:5432/pdlc?schema=public';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.AUTH_MODE = 'dev-stub';
    process.env.NODE_ENV = 'test';

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'acme-bank' } });
    tenantId = tenant.id;
    const pm = await prisma.user.findFirstOrThrow({
      where: { tenantId, primaryPersona: 'PRODUCT_MANAGER' },
    });
    pmUserId = pm.id;
    const engineer = await prisma.user.findFirstOrThrow({
      where: { tenantId, primaryPersona: 'ENGINEER' },
    });
    engineerUserId = engineer.id;
    const otherTenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'northwind-pharma' },
    });
    otherTenantId = otherTenant.id;
    const otherTenantUser = await prisma.user.findFirstOrThrow({
      where: { tenantId: otherTenantId },
    });
    otherTenantUserId = otherTenantUser.id;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('walks the full trail: source -> evidence -> insight -> opportunity -> promoted initiative', async () => {
    const source = await request(app.getHttpServer())
      .post('/discovery/sources')
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({ type: 'INTERVIEW', name: 'e2e test source' })
      .expect(201);

    const evidence = await request(app.getHttpServer())
      .post(`/discovery/sources/${source.body.id}/evidence`)
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({
        capturedAt: new Date().toISOString(),
        capturedBy: pmUserId,
        content: 'e2e test evidence',
      })
      .expect(201);

    const insight = await request(app.getHttpServer())
      .post('/discovery/insights')
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({
        title: 'e2e test insight',
        summary: 'summary',
        evidenceItemIds: [evidence.body.id],
      })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post('/discovery/opportunities')
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({
        title: 'e2e test opportunity',
        problemFraming: 'framing',
        insightIds: [insight.body.id],
      })
      .expect(201);

    const promoted = await request(app.getHttpServer())
      .post(`/discovery/opportunities/${opportunity.body.id}/promote`)
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({})
      .expect(201);

    expect(promoted.body.sourceOpportunityId).toBe(opportunity.body.id);
    expect(promoted.body.title).toBe('e2e test opportunity');

    const refetched = await request(app.getHttpServer())
      .get(`/discovery/opportunities/${opportunity.body.id}`)
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .expect(200);
    expect(refetched.body.promotedToInitiativeId).toBe(promoted.body.id);

    // Double-promote is rejected, not silently allowed.
    await request(app.getHttpServer())
      .post(`/discovery/opportunities/${opportunity.body.id}/promote`)
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({})
      .expect(400);

    // Cleanup — leave the seeded data as this spec found it.
    await prisma.initiative.delete({ where: { id: promoted.body.id } });
    await prisma.opportunity.delete({ where: { id: opportunity.body.id } });
    await prisma.insight.delete({ where: { id: insight.body.id } });
    await prisma.evidenceItem.delete({ where: { id: evidence.body.id } });
    await prisma.source.delete({ where: { id: source.body.id } });
  });

  it('rejects an insight referencing an evidenceItemId that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/discovery/insights')
      .set('x-dev-user-id', pmUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({
        title: 'e2e bad insight',
        summary: 'summary',
        evidenceItemIds: ['00000000-0000-0000-0000-000000000000'],
      })
      .expect(400);
  });

  it('enforces RBAC — a read-only Engineer cannot create a source', async () => {
    await request(app.getHttpServer())
      .post('/discovery/sources')
      .set('x-dev-user-id', engineerUserId)
      .set('x-dev-tenant-id', tenantId)
      .send({ type: 'OTHER', name: 'should be rejected' })
      .expect(403);
  });

  it('enforces tenant isolation — northwind-pharma sees none of acme-bank’s sources', async () => {
    // acme-bank's seed data (prisma/seed.ts) always creates at least the 8
    // Discovery Hub sources; northwind-pharma never gets any Phase 1/2 data
    // seeded — so a real user genuinely scoped to that tenant seeing zero
    // rows here (RLS-enforced, not just an empty-by-coincidence result) is
    // the correct assertion, not a synthetic cross-tenant header mismatch.
    const res = await request(app.getHttpServer())
      .get('/discovery/sources')
      .set('x-dev-user-id', otherTenantUserId)
      .set('x-dev-tenant-id', otherTenantId)
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
