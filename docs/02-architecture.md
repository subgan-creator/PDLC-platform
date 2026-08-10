# 02 — Architecture

## C4: System Context

Who and what talks to the platform. Full connector list: [05-integration-strategy.md](05-integration-strategy.md).

```mermaid
C4Context
  title PDLC Platform — System Context

  Person(pm, "Product Manager", "v1 primary persona")
  Person(designer, "Designer / Engineer / Researcher / Stakeholder", "v1 supporting personas")
  Person(exec, "APO / Exec / Governance / Control / Sr. Mgmt", "v2 personas")

  System(pdlc, "PDLC Platform", "System of engagement for product thinking: initiatives, discovery, definition, launch, reporting, and the Context Engine")

  System_Ext(jira, "Jira / ADO / Rally", "System of record for execution state")
  System_Ext(figma, "Figma", "Design source of truth")
  System_Ext(confluence, "Confluence / SharePoint", "Docs & decision publishing")
  System_Ext(chat, "Slack / MS Teams", "Notifications, approvals, digests")
  System_Ext(cal, "Outlook / Google Calendar", "Meetings -> Context Capsules")
  System_Ext(servicenow, "ServiceNow", "Change requests, releases, incidents")
  System_Ext(grc, "GRC (Archer / MetricStream / OpenPages)", "Policies, controls, findings")
  System_Ext(voc, "Qualtrics / Medallia / Intercom / Zendesk", "Voice-of-customer evidence")
  System_Ext(analytics, "Amplitude / Mixpanel / Adobe / Tableau / Power BI", "Outcome metrics")
  System_Ext(testtools, "Xray / qTest / TestRail", "Test cases, runs, defects")
  System_Ext(idp, "OIDC/SAML IdP + Workday (SCIM)", "Identity, SSO, org hierarchy")

  Rel(pm, pdlc, "Uses")
  Rel(designer, pdlc, "Uses")
  Rel(exec, pdlc, "Uses (v2)")
  Rel(pdlc, jira, "Bi-directional sync")
  Rel(pdlc, figma, "Pull + embed")
  Rel(pdlc, confluence, "Push + link")
  Rel(pdlc, chat, "Push + slash commands")
  Rel(pdlc, cal, "Pull")
  Rel(pdlc, servicenow, "Bi-directional")
  Rel(pdlc, grc, "Push + pull")
  Rel(pdlc, voc, "Pull")
  Rel(pdlc, analytics, "Pull")
  Rel(pdlc, testtools, "Bi-directional")
  Rel(pdlc, idp, "AuthN/AuthZ, provisioning")
```

## C4: Containers

```mermaid
C4Container
  title PDLC Platform — Containers

  Person(user, "PM / Designer / Engineer / ...", "")

  System_Boundary(pdlc, "PDLC Platform") {
    Container(web, "Web App", "React 18 + Vite", "App shell, workspaces, ⌘K palette, TanStack Query/Router")
    Container(api, "API", "NestJS + REST/OpenAPI", "Auth, RBAC, audit, business logic, tenant-scoped repositories")
    Container(worker, "Worker", "Node + BullMQ", "Background jobs: activity fan-out, connector sync, report export")
    ContainerDb(pg, "PostgreSQL 16", "Prisma + RLS", "public schema (app data) + audit schema (append-only)")
    ContainerDb(redis, "Redis", "Cache + BullMQ queues", "")
    ContainerDb(search, "OpenSearch", "Full-text / activity search", "")
    ContainerDb(s3, "S3-compatible object storage", "Attachments, exports", "LocalStack in dev")
    Container(gateway, "Model Gateway", "Node service (Phase 9)", "Prompt logging, PII redaction, provider abstraction, per-tenant model choice")
  }

  System_Ext(idp, "OIDC/SAML IdP", "")
  System_Ext(connectors, "External systems", "Jira, Figma, GRC, ... via Integration Service (Phase 5)")

  Rel(user, web, "HTTPS")
  Rel(web, api, "REST/JSON, OpenAPI 3.1")
  Rel(api, pg, "Prisma, RLS session var per request")
  Rel(api, redis, "Cache reads/writes; enqueue jobs")
  Rel(api, search, "Index & query")
  Rel(api, s3, "Attachment upload/download (signed URLs)")
  Rel(api, idp, "OIDC token verification")
  Rel(worker, redis, "Dequeue jobs")
  Rel(worker, pg, "Prisma, RLS session var per job's tenant")
  Rel(worker, connectors, "Phase 5: connector pull/push/webhook")
  Rel(api, gateway, "Phase 9: AI draft requests, flag-gated")
```

## Runtime shape

- **Stateless app tier** (`apps/web`, `apps/api`): horizontally scalable, no in-process session state. Auth state lives in the verified JWT (OIDC) or dev-stub headers; request-scoped state lives in `AsyncLocalStorage` (`RequestContext`), not anywhere shared across requests.
- **Background jobs** (`apps/worker`) run on BullMQ/Redis, independently scalable from the API.
- **Tenant isolation** is enforced twice: application-layer (`TenantScopedRepository` always filters by `tenantId`) and database-layer (Postgres RLS policy keyed on a `SET LOCAL` session variable). See [ADR-0002](06-adr/ADR-0002-multi-tenancy-rls.md).
- **Data residency**: each tenant is pinned to one region (`Tenant.residencyRegion`); production topology runs one full stack per region rather than sharding a single database across regions.
- **Self-hosted connector agent** (Phase 5, banks with no SaaS egress): an outbound-only agent inside the customer network speaks to the Integration Service; the architecture above already treats "connectors" as external to the API/worker boundary so this doesn't require a redesign later.

## Observability

OpenTelemetry auto-instrumentation (HTTP, Prisma) bootstraps before any other import in `apps/api/src/main.ts`; traces export via OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, no-op otherwise. Structured JSON logs (pino) carry a correlation id (`x-request-id`) shared between access logs and `RequestContext`. `/health` (liveness) and `/ready` (readiness — DB reachable) exist on both `apps/api` and `apps/worker`.
