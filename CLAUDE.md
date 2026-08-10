# CLAUDE.md — PDLC Platform

Loaded into every session. Keep it under 200 lines — link out to `docs/` for depth, don't inline it here.

## Vision (5 lines)

An enterprise Product Development Lifecycle platform for large, agile-immature organizations — banks, pharma, consumer goods. One place to run the full lifecycle from discovery through go-to-market and reporting, teaching good product practice through the structure of the workflow, not training. The differentiating bet is context-switch reduction: making "pick up where I left off on initiative X" a 5-second operation instead of 20 minutes, across the 5–15 initiatives an enterprise PM juggles. The platform is a system of engagement over existing systems of record (Jira, Confluence, Figma, ServiceNow, GRC) — never a replacement for them. It is built compliance-credible from day one: RLS tenant isolation, immutable audit, e-signature-ready, WCAG 2.2 AA — because that's the only way it gets past bank/pharma procurement.

Full brief: `00-brief.md` (repo root, source material). Product narrative: [docs/01-product-brief.md](docs/01-product-brief.md).

## Personas — RBAC views over one shared domain model

10 personas (build order: PM → APO → Exec → Designer → Engineer → Researcher → Control/Risk → Governance → Stakeholder → Senior Mgmt). v1 fully builds PM, Designer (read/collaborate), Engineer (read-only), Researcher (Discovery), Stakeholder (read-only); the rest are v2.

**Non-negotiable rule: personas are RBAC roles + view compositions over one shared domain model. Never fork the data model per persona.** Every phase-1 entity carries the fields later personas need (control mappings, stage-gate state, portfolio hierarchy) even before any UI exposes them — see `packages/shared-types` for the forward-declared shape and `docs/06-adr/ADR-0002` for the RLS/RBAC mechanics.

## Module map (JTBD → module, A8 build order)

| Phase | Module                                                               | JTBD             |
| ----- | -------------------------------------------------------------------- | ---------------- |
| 0     | Foundation (this repo state): tenancy, RBAC, audit, CI, seed         | —                |
| 1     | Initiative Workspace + Roadmap (the spine)                           | JTBD 2           |
| 2     | Discovery Hub                                                        | JTBD 1           |
| 3     | Definition Workspace (epics/stories, process flows, rules, controls) | JTBD 4           |
| 4     | Context Engine (My Day, Resume Cards, Decision Log, Unified Inbox)   | A4               |
| 5     | Integration Service + Jira + Figma connectors                        | A6               |
| 6     | Experience Workspace                                                 | JTBD 3           |
| 7     | Launch Workspace + Quality Workspace                                 | JTBD 5, 7        |
| 8     | Reporting Studio                                                     | JTBD 6           |
| 9     | AI Assist layer (model gateway)                                      | A5 AI governance |
| 10    | Hardening (perf, a11y, threat model, DR, pen-test)                   | —                |
| 11    | Persona expansion (APO, Exec, Governance, Control)                   | —                |

## Tech stack (A7 — deviate only with a written ADR)

- **Frontend**: React 18 + TS strict, Vite, TanStack Query + Router, Tailwind + Radix, Zustand, RHF + Zod, Recharts, React Flow, TipTap, Playwright, Vitest + Testing Library.
- **Backend**: Node 22 + NestJS + TS strict, OpenAPI-first REST, Prisma over PostgreSQL 16, Redis (cache + BullMQ), OpenSearch, S3-compatible storage, Jest-equivalent (Vitest) + Supertest.
- **Data**: Postgres with Row-Level Security for tenant isolation; separate append-only `audit` schema; outbox pattern for events (Phase 4+).
- **Platform**: Docker, Kubernetes/Helm-ready, Terraform, GitHub Actions, OpenTelemetry → OTLP.
- **Monorepo**: pnpm workspaces + Turborepo.

## Non-negotiable engineering rules

- TypeScript strict everywhere; no `any`; no `@ts-ignore` without a comment explaining why.
- Every API endpoint: Zod-validated input, OpenAPI-documented, permission-guarded (`@RequirePermission`), audit-logged where it mutates or reads sensitive data, tenant-scoped. No exceptions.
- Every DB query goes through a tenant-scoped repository (`TenantScopedRepository`); direct Prisma calls in controllers are forbidden — enforced by ESLint in `apps/api`.
- Every user-facing string goes through i18n.
- Every interactive component is keyboard operable and has a test.
- Migrations are expand/contract only — never a breaking change in one step.
- No feature ships without: unit tests for logic, an integration test for the endpoint, and a Playwright test for the primary happy path.
- AI features are flag-gated, off by default, and route through the model gateway (`@pdlc/config` `FEATURE_FLAGS`) — see A5 AI governance in the brief.

## Directory map

```
apps/
  web/      React app shell — routing, auth context, left nav, ⌘K palette, initiative context bar
  api/      NestJS API — Prisma schema, RLS, RBAC, audit, OpenAPI, /health /ready
  worker/   BullMQ background jobs over Redis
packages/
  shared-types/  Forward-declared domain types for the whole system (source of truth for shape)
  ui/            Radix-based, WCAG 2.2 AA component library (Button/Input/Select/Dialog/Table/Toast/Tabs)
  config/        Zod env validation, feature flags, shared ESLint/tsconfig presets
  connectors/    Connector SDK contract (implementations land Phase 5)
docs/       Architecture, data model, NFRs, integration strategy, ADRs
prisma/     (inside apps/api) schema.prisma, migrations/, seed.ts
```

## Commands

```bash
pnpm install                # install everything
docker compose up -d        # Postgres + Redis + OpenSearch + LocalStack
pnpm db:migrate              # apply Prisma migrations (apps/api)
pnpm db:seed                 # 2 tenants, 12 users across all 10 personas
pnpm dev                     # run web + api + worker in parallel
pnpm build                   # turbo build, all packages
pnpm typecheck                # turbo typecheck, all packages
pnpm lint                     # turbo lint, all packages
pnpm test                     # turbo unit tests, all packages
pnpm --filter @pdlc/web test:e2e   # Playwright
```

Dev auth: `AUTH_MODE=dev-stub` (default outside prod) trusts `x-dev-user-id` / `x-dev-tenant-id` headers — the seed script prints the header values for every seeded user. Real auth is OIDC (`AUTH_MODE=oidc`); dev-stub is refused at boot if `NODE_ENV=production`.

## Where things live for AI-governed features

Nothing yet ships — `packages/config`'s `FEATURE_FLAGS` registry and `StaticDenyFeatureFlagProvider` are the Phase 0 placeholder. Any AI feature must: be flag-gated per-tenant (default off), go through one model gateway service (prompt logging, PII redaction, per-tenant provider choice incl. customer's own Azure OpenAI endpoint), and produce output that is always a draft with visible provenance — see `AiDraftProvenance` in `packages/shared-types/src/definition.ts`. Never auto-commit AI content to a record of decision.
