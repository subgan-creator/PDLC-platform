# 04 — Non-Functional Requirements

Source: `00-brief.md` A5. Baked in from Phase 0, not retrofitted. Each requirement below links to where it's implemented today or where it will land.

## Identity & access

| Requirement                                     | Status                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| SSO via OIDC + SAML 2.0                         | OIDC: `apps/api/src/auth/auth.guard.ts` (JWKS verification). SAML: not started — needed before any real enterprise pilot.         |
| SCIM 2.0 provisioning                           | `User.scimExternalId` field exists; SCIM endpoint itself is not built.                                                            |
| Hard multi-tenant isolation, RLS in the DB      | [ADR-0002](06-adr/ADR-0002-multi-tenancy-rls.md); `prisma/migrations/.../migration.sql`.                                          |
| RBAC + fine-grained permissions                 | `apps/api/src/rbac/*`; `Role`/`Permission`/`UserRole` in schema.                                                                  |
| ABAC overlay for data classification (MNPI/GxP) | `DataClassification` enum exists on `Attachment`; not yet enforced by a guard — Phase 1+ as classified entities land.             |
| Service accounts + scoped API tokens            | Types forward-declared (`ServiceAccount`, `ApiToken` in `packages/shared-types/src/rbac.ts`); not yet in Prisma schema or issued. |

## Auditability & compliance

| Requirement                                 | Status                                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immutable append-only audit log             | `audit.audit_events` table (separate schema), `AuditService`/`AuditInterceptor`, RLS policy blocks cross-tenant reads; app role has no UPDATE/DELETE grant. |
| Full version history, diff & restore        | `EntityVersion` type forward-declared (`packages/shared-types/src/audit.ts`); no table yet — lands with the first versioned entity (Initiative, Phase 1).   |
| Electronic signature (21 CFR Part 11 style) | `ElectronicSignature` type forward-declared; schema designed, no UI — per brief, ships in v2 for pharma.                                                    |
| Records retention & legal hold              | `RetentionPolicy` type + `Tenant.retentionPolicyId` forward-declared; enforcement job not built.                                                            |
| Data residency, tenant-pinned region        | `Tenant.residencyRegion`; infra-level enforcement (per-region deployment) is a Terraform/ops concern, not yet built.                                        |
| SOC 2 / ISO 27001 evidence hooks            | Audit log + structured logs are the foundation; formal evidence export not built.                                                                           |

## Security

| Requirement                                                   | Status                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TLS 1.3 in transit, encryption at rest, BYOK-ready            | Deployment-layer (load balancer / managed Postgres) — `Tenant.encryptionKeyRef` is the app-side hook. Not configured in this repo (no infra-as-code yet).            |
| Secrets in a vault, short-lived creds                         | Local dev uses `.env`; production must not — flagged for Phase 10 hardening / Terraform work.                                                                        |
| Input validation at the schema boundary, output encoding, CSP | Zod at every endpoint (`ZodValidationPipe`); `helmet()` in `main.ts`; React escapes by default and the codebase has no `dangerouslySetInnerHTML` — keep it that way. |
| Rate limiting, request size limits, per-tenant quotas         | Not implemented yet — Phase 10.                                                                                                                                      |
| Dependency scanning, SAST, secret scanning in CI              | `pnpm audit` + `gitleaks` in `.github/workflows/ci.yml`. SAST (e.g. Semgrep) not added yet.                                                                          |

## AI governance

| Requirement                                                                               | Status                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-tenant feature flag, off by default                                                   | `packages/config/src/feature-flags.ts` — `StaticDenyFeatureFlagProvider` denies everything until a real provider is wired up.                      |
| One model gateway (prompt logging, PII redaction, provider abstraction, BYO Azure OpenAI) | Not built — Phase 9.                                                                                                                               |
| AI output is always a draft with provenance, human accept/edit                            | `AiDraftProvenance` type (`packages/shared-types/src/definition.ts`) — enforced by convention until the gateway exists to enforce it structurally. |
| Prompt/completion retention policy, provider-training opt-out                             | Not built — Phase 9.                                                                                                                               |

## Scale & operations

| Target                                                                       | Status                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 50k users/tenant, 500 concurrent, p95 < 300ms reads / < 800ms writes         | No load testing yet — nothing to regress against until Phase 1 ships real query paths.                                                                                       |
| Horizontal scaling, stateless app tier, queue-backed jobs, read replicas     | App tier is stateless by construction (`RequestContext` is per-request `AsyncLocalStorage`, not shared state); `apps/worker` is queue-backed. Read replicas: not configured. |
| OpenTelemetry tracing, structured logs, RED metrics, health/readiness        | Tracing + logs done (see `docs/02-architecture.md` Observability). RED metrics dashboards not built.                                                                         |
| Zero-downtime deploys, expand/contract migrations, progressive rollout flags | Migration discipline documented (`docs/03-data-model.md`); deploy tooling not built.                                                                                         |
| Backup + tested restore, RPO ≤ 15 min, RTO ≤ 4 h                             | Not built — depends on managed Postgres choice at infra time.                                                                                                                |

## Accessibility & UX

| Requirement                                                     | Status                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WCAG 2.2 AA                                                     | `packages/ui` components are Radix-based (correct ARIA/focus/keyboard by construction) with a matching test per component; see `packages/ui/src/components/*.test.tsx`. Full audit is Phase 10.                                    |
| Consistent left nav + initiative-scoped context bar, ⌘K palette | `apps/web/src/layout/*`, `apps/web/src/command-palette/*`.                                                                                                                                                                         |
| i18n-ready, no hardcoded strings                                | **Not yet enforced.** `apps/web` currently has hardcoded English strings (Phase 0 shell only). An i18n library + lint rule banning raw JSX text must land before Phase 1 UI work — tracked as a known gap, not a silent violation. |
| Reduced motion respected                                        | Global `@media (prefers-reduced-motion: reduce)` rule in `packages/ui/src/styles/tokens.css`.                                                                                                                                      |
