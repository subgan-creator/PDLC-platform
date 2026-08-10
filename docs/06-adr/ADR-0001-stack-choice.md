# ADR-0001: Stack choice

**Status:** Accepted — 2025-12 (project start)

## Context

We need a stack that: (a) a small team can move fast in, (b) an enterprise security/procurement reviewer at a bank or pharma company won't reject on sight, (c) supports strict typing end to end so the "no `any`" engineering rule is enforceable, and (d) has mature accessibility primitives, because WCAG 2.2 AA is a hard requirement, not an afterthought.

## Decision

Per `00-brief.md` A7:

- **Frontend**: React 18 + TypeScript strict, Vite, TanStack Query + Router, Tailwind + Radix primitives, Zustand, React Hook Form + Zod, Recharts, React Flow, TipTap, Playwright, Vitest + Testing Library.
- **Backend**: Node.js 22 + NestJS + TypeScript strict, OpenAPI-first REST, Prisma over PostgreSQL 16, Redis (cache + BullMQ), OpenSearch, S3-compatible storage, Vitest + Supertest.
- **Data**: PostgreSQL with Row-Level Security for tenant isolation, a separate append-only audit schema, outbox pattern for reliable event publishing (from Phase 4).
- **Platform**: Docker, Kubernetes/Helm-ready manifests, Terraform, GitHub Actions CI, OpenTelemetry → OTLP.
- **Monorepo**: pnpm workspaces + Turborepo — `apps/web`, `apps/api`, `apps/worker`, `packages/shared-types`, `packages/ui`, `packages/config`, `packages/connectors`.

## Rationale

- **NestJS over a thinner framework (Express/Fastify raw)**: DI + module boundaries make "every endpoint is validated, guarded, and audited" enforceable via global guards/interceptors/filters rather than convention alone — see `apps/api/src/app.module.ts`. This matters more here than in a typical SaaS because the "no exceptions" rules in CLAUDE.md need a structural home, not a linter comment.
- **Radix over a full component kit (MUI, Ant)**: Radix ships unstyled, fully-accessible primitives (focus trap, roving tabindex, ARIA wiring) — WCAG 2.2 AA is much cheaper to hold onto when the interaction logic is already correct and we only own the visual layer (`packages/ui`).
- **Prisma over a raw query builder**: type-safe queries end to end, and its migration model is a reasonable fit for expand/contract discipline — though RLS policies themselves are hand-authored SQL (Prisma has no RLS DSL), see ADR-0002.
- **pnpm + Turborepo over Nx or a polyrepo**: the domain is one product with 10 personas sharing one model — a polyrepo would fight the "personas are views, not forks" rule at the repo boundary. Turborepo's task graph + remote caching is enough for a repo this size without Nx's extra generators/plugins surface.
- **PostgreSQL over a multi-tenant-by-default database (e.g. per-tenant schemas, or a NoSQL store)**: RLS gives real per-row DB-level isolation with a single schema to migrate, which is simpler to reason about at scale than N schemas or N databases, and is exactly what ADR-0002 is about.

## Consequences

- The team commits to TypeScript strict mode everywhere; any future service in a different language needs its own ADR.
- RLS policies are hand-written SQL alongside Prisma's generated migrations (see `apps/api/prisma/migrations/`), which means schema changes to tenant-scoped tables are always two-part: the Prisma model change, and the RLS policy statement. This is a deliberate, visible seam, not something to automate away — automating it risks a new table silently shipping without a policy.
- SAML 2.0 support (A5 identity requirement) is not covered by any library decision yet — OIDC is implemented (`apps/api/src/auth/auth.guard.ts`); SAML needs its own follow-up ADR before it's needed by a real pilot.
