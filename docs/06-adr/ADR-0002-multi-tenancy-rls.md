# ADR-0002: Multi-tenancy via Row-Level Security

**Status:** Accepted — 2025-12

## Context

A5 requires "hard tenant isolation... Row-level security enforced in the database, not only in application code." A single bug in a repository method (a missing `WHERE tenantId = ...`) must not be able to leak another tenant's rows — that's the whole point of the requirement, and it's the single most reputationally expensive bug class this product can have with a bank or pharma customer.

Options considered: (1) separate database per tenant, (2) separate Postgres schema per tenant, (3) shared tables + application-layer filtering only, (4) shared tables + Postgres RLS as a backstop to application-layer filtering.

## Decision

**Option 4.** Every tenant-scoped table lives in the shared `public` schema, carries a `tenantId` column, and has RLS `ENABLE`d and `FORCE`d with a policy that compares `tenantId` against a `current_setting('app.tenant_id', true)` session variable. The application layer still filters by `tenantId` explicitly in every repository query — RLS is defense in depth, not a replacement for correct application code.

Mechanics (see `apps/api/src/prisma/prisma.service.ts` and `apps/api/src/common/request-context/`):

1. `RequestContextMiddleware` opens an `AsyncLocalStorage` context per request, initially with `tenantId: null`.
2. `AuthGuard` verifies the caller (OIDC or dev-stub) and fills in `tenantId`/`userId` via `RequestContext.set()`.
3. Every tenant-scoped repository extends `TenantScopedRepository`, whose `withTx()` calls `PrismaService.withTenantContext()`, which opens a transaction, runs `SET LOCAL app.tenant_id = '<tenantId>'`, and only then runs the actual query.
4. Postgres enforces the RLS policy on every statement in that transaction — even a query the application forgot to filter is scoped by the DB.
5. The app's runtime Postgres role must be created with `NOBYPASSRLS` and must not own the tables (table owners bypass RLS unless `FORCE` is set — we set `FORCE` anyway, belt and braces). See the comment block at the top of `apps/api/prisma/migrations/20260809000000_init/migration.sql`.

`audit.audit_events` gets the same treatment, split into a `SELECT` policy and an `INSERT` policy (no `UPDATE`/`DELETE` policy at all — combined with revoking `UPDATE`/`DELETE` grants at the role level, this makes the audit log append-only at two independent layers).

`tenants` itself is not RLS-scoped — there's no wider tenant to scope it to. Access is gated by RBAC (platform-admin only) at the application layer.

## Consequences

- **Every new tenant-scoped table needs two things in the same migration**: the table DDL, and the `ENABLE`/`FORCE ROW LEVEL SECURITY` + `CREATE POLICY` statements. `packages/shared-types`'s `TenantScoped` interface and the doc comment at the top of `schema.prisma` exist to make this impossible to forget by convention; there is no automated check yet (a CI lint that diffs new tables against new RLS policies is a good Phase 1+ addition).
- **`SET LOCAL` cannot be parameterized.** `tenantId`/`userId` are validated against a strict pattern before string interpolation in `PrismaService.withTenantContext` — they're always platform-generated UUIDs, so this is a defense against a future bug, not user input, but it's there because `SET LOCAL '${x}'` is exactly the shape of bug this ADR exists to prevent elsewhere.
- **Performance**: wrapping every tenant-scoped query in its own transaction (to scope the `SET LOCAL`) has overhead. Acceptable for Phase 0; if p95 targets (A5: <300ms reads) are at risk once real query volume exists, the next step is a connection-pooler-aware pattern (e.g. pgbouncer in session mode with one `SET` per connection lease) rather than abandoning RLS.
- **Cross-tenant admin operations** (tenant provisioning, cross-tenant reporting jobs) use `PrismaService.withoutTenantScope()`, a deliberately loud escape hatch that bypasses the session variable entirely. Every call site is responsible for its own authorization — this is not RBAC-guarded automatically.
- **Data residency** (A5: tenant data never crosses region boundaries) is a deployment-topology decision, not something RLS enforces — a tenant's `residencyRegion` must match the region its `DATABASE_URL` actually points at. That check does not exist yet (see `docs/04-nfr.md`); it belongs in tenant-provisioning tooling once that exists.
