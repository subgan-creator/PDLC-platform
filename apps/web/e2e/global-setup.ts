import { Client } from 'pg';

/**
 * The Initiative Workspace e2e specs need a real seeded tenant + PM user to
 * authenticate as (dev-stub mode trusts the x-dev-* headers, but RBAC still
 * requires the userId to actually hold a role — see apps/api's
 * PermissionsRepository). Rather than hardcoding IDs (Prisma generates
 * fresh UUIDs every seed run) or adding a public API surface just for
 * tests, this queries Postgres directly for the acme-bank tenant and one
 * of its seeded Product Managers, then exposes them via process.env —
 * Playwright's documented pattern for globalSetup, since workers inherit
 * the env at the point they're spawned.
 *
 * Requires `docker compose up -d && pnpm db:migrate && pnpm db:seed` to
 * have been run first; see CLAUDE.md.
 */
export default async function globalSetup(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://pdlc:pdlc@localhost:5432/pdlc?schema=public';
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tenantResult = await client.query<{ id: string }>(
      `SELECT id FROM "tenants" WHERE slug = 'acme-bank' LIMIT 1`,
    );
    const tenantId = tenantResult.rows[0]?.id;
    if (!tenantId) {
      throw new Error(
        "e2e global-setup: no 'acme-bank' tenant found. Run `docker compose up -d && pnpm db:migrate && pnpm db:seed` first.",
      );
    }

    const userResult = await client.query<{ id: string }>(
      `SELECT id FROM "users" WHERE "tenantId" = $1 AND "primaryPersona" = 'PRODUCT_MANAGER' LIMIT 1`,
      [tenantId],
    );
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      throw new Error('e2e global-setup: no seeded Product Manager found for acme-bank.');
    }

    process.env.E2E_TENANT_ID = tenantId;
    process.env.E2E_USER_ID = userId;
  } finally {
    await client.end();
  }
}
