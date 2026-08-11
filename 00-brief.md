SECTION A — Project Brief (source material for Prompt 0)
A1. What we are building

An enterprise PDLC platform for large, agile-immature organizations — banks, pharma, consumer goods. The platform gives product teams one place to run the full lifecycle from discovery through go-to-market and reporting, and it opinionatedly teaches good product practice through the structure of the workflow rather than through training.

The differentiating bet: context-switch reduction. Enterprise PMs juggle 5–15 initiatives across Jira, Confluence, Figma, SharePoint, email, Slack/Teams, ServiceNow, and 6 recurring forums. The platform's job is to make "pick up where I left off on initiative X" a 5-second operation instead of a 20-minute one.

A2. Personas (build order)
#	Persona	Scope	Phase
1	Product Manager	One or more scrum teams; owns initiatives, backlog, delivery	v1 — full build
2	Area Product Owner	A product area; portfolio of initiatives across several PMs	v2
3	Product Executive	A business line or product P&L	v2
4	Designer	Wireframes, flows, design system	v1 — read/collaborate only
5	Engineer	Consumes stories, ACs, NFRs	v1 — read-only
6	Researcher	Discovery, interviews, synthesis	v1 — contributes to Discovery workspace
7	Control / Risk teams	Policy and control attestation	v2
8	Governance teams	Stage gates, intake, funding approvals	v2
9	Stakeholders	Business partners consuming updates	v1 — read-only views
10	Senior Management	Portfolio rollups, exec reporting	v2

Architectural rule from day one: personas are RBAC roles + view compositions over one shared domain model. Never fork the data model per persona. Every phase-1 entity must already carry the fields later personas need (control mappings, stage gate state, portfolio hierarchy) even if no UI exposes them yet.

A3. PM jobs-to-be-done → product modules

JTBD 1 — Discovery & research workspace Capture and organize customer feedback, interview notes, support themes, competitive inputs, data findings. Tag and cluster into Insights. Promote an insight to an Opportunity, and an opportunity to an Initiative — with the trail preserved so any initiative can answer "why are we doing this?" Module: Discovery Hub — Sources, Evidence items, Insights, Opportunities, Opportunity Solution Tree.

JTBD 2 — Manage multiple initiatives across the roadmap An Initiative is the spine of the system. It has: problem statement, target outcomes and metrics, hypotheses, scope/non-scope, phases, RAID (risks/assumptions/issues/dependencies), stakeholders, health, and links to everything downstream. Module: Initiative Workspace + Roadmap (Now/Next/Later and timeline views, capacity-aware).

JTBD 3 — Design collaboration PM writes the experience brief and user flows; designer produces wireframes and screens. Need: embedded Figma frames, versioned design links per feature, review/approval loop, and a place where flow diagram ↔ screen ↔ story are linked. Module: Experience Workspace.

JTBD 4 — Definition: epics, features, stories

4a. Process modeling — current-state and target-state flows, side by side, with the delta explicitly called out as the change scope. Diagram-as-data (nodes/edges in JSON), rendered with a diagram library, so process steps can be linked to stories and rules.
4b. Business rules — a first-class rules register (not prose in a doc): rule ID, condition/action, owner, source system, effective dates, linked stories, test coverage.
4c. Policy & controls — a control register per initiative. Which enterprise policies apply, which controls are impacted, evidence of coverage, attestation state. This is the module that makes the product credible in a bank or pharma. Module: Definition Workspace — Epic → Feature → Story hierarchy, AI-assisted drafting of stories and acceptance criteria (Given/When/Then), Definition of Ready checks, traceability matrix.

JTBD 5 — Go-to-market & launch Launch checklist by workstream (training, comms, ops readiness, support, legal/compliance sign-off, pilot plan, rollback), owner and date per item, readiness score, post-launch feedback capture, and one-click exec presentation generation. Module: Launch Workspace.

JTBD 6 — Reporting across many forums The same initiative reported six different ways: scrum-of-scrums, area review, exec steering, governance gate, risk forum, all-hands. Build a report-generation engine: one data model, many templates, each audience-tuned, auto-populated from live initiative data, exportable to PPTX/PDF/email/Confluence, with a delta-since-last-report section. Module: Reporting Studio.

JTBD 7 — Testing & quality Test strategy per initiative, test cases linked to acceptance criteria and business rules, UAT rounds with business testers, defect triage, coverage view showing which requirements/rules have no test. Module: Quality Workspace.

Cross-cutting — Context Switching The signature feature. See A4.

A4. The Context Engine (signature capability — do not treat as an afterthought)

Every user action in the platform emits an event to a per-user activity stream. From that stream, the platform builds:

My Day — landing page: what needs you today, ranked. Decisions awaiting you, blockers, overdue commitments, items where you're the bottleneck, meetings today with prep attached.
Resume Card — per initiative: "Last time you were here you were writing ACs for Feature F-23; 3 comments arrived since; the design review moved to Thursday; here's the 60-second state of play." Generated summary + last-touched breadcrumbs + open threads.
Context Capsule — pre-meeting brief auto-assembled for any calendar event linked to an initiative or forum: what changed since last meeting, open decisions, the numbers, likely questions.
Handoff Pack — export everything a person needs to take over an initiative (for leave, reorg, or escalation).
Unified Inbox — mentions, approvals, review requests, and integration-sourced notifications (Jira, Slack, email) in one queue with bulk actions.
Decision Log — every decision recorded with date, owner, options considered, rationale. This is the single highest-value artifact for context recovery and for governance.

Design constraint: a PM returning after a week should reach "I know what to do next" in under 60 seconds without opening any other tool.

A5. Enterprise non-functional requirements (bake in from Phase 0, do not retrofit)

Identity & access

SSO via OIDC + SAML 2.0; SCIM 2.0 for user/group provisioning.
Multi-tenant with hard tenant isolation. Row-level security enforced in the database, not only in application code.
RBAC with roles and fine-grained permissions; ABAC overlays for data classification (e.g., restrict initiatives tagged MNPI or GxP).
Service accounts + scoped API tokens for integrations.

Auditability & compliance

Immutable, append-only audit log of every create/update/delete/read-of-sensitive-record, with actor, timestamp, before/after, request ID.
Full version history on every artifact with diff and restore.
Electronic signature support (21 CFR Part 11 style: meaning of signature, signed record binding) — needed for pharma. Design the schema for it in v1 even if the UI ships in v2.
Records retention and legal hold; configurable per tenant.
Data residency: tenant-pinned region. Design so a tenant's data never crosses region boundaries.
SOC 2 / ISO 27001 evidence hooks: everything observable and exportable.

Security

Encryption in transit (TLS 1.3) and at rest; per-tenant encryption keys, BYOK-ready.
Secrets in a vault (never in env files in prod); short-lived credentials.
Input validation at the schema boundary; output encoding; CSP; no dangerouslySetInnerHTML on user content.
Rate limiting, request size limits, and per-tenant quotas.
Dependency scanning, SAST, secret scanning in CI. Threat model documented per phase.

AI governance (because we use LLMs for drafting and summarization)

Every AI feature behind a per-tenant feature flag, off by default.
Model calls go through one gateway service: prompt logging, PII redaction, token accounting, provider abstraction, per-tenant model choice (including "customer's own Azure OpenAI endpoint" — mandatory for banks).
All AI output is a draft with visible provenance and a human accept/edit step. Never auto-commit AI content to a record of decision.
Retention policy on prompts and completions; opt-out of provider training.

Scale & operations

Target: 50k users/tenant, 500 concurrent per tenant, p95 < 300 ms for reads, < 800 ms for writes.
Horizontal scaling; stateless app tier; background jobs on a queue; read replicas for reporting.
OpenTelemetry tracing, structured logs with correlation IDs, RED metrics dashboards, health/readiness endpoints.
Zero-downtime deploys, expand/contract migrations, feature flags for progressive rollout.
Backup + tested restore; documented RPO ≤ 15 min, RTO ≤ 4 h.

Accessibility & UX

WCAG 2.2 AA is a hard requirement (regulated industries procure on it). Keyboard-complete, screen-reader tested, respects reduced motion.
Simple, calm, dense-but-readable UI. Enterprise users are not delighted by novelty; they're delighted by fewer clicks. Consistent left nav + initiative-scoped context bar. Command palette (⌘K) for everything.
i18n-ready from the start (no hardcoded strings).
A6. Integration strategy

Principle: the platform is the system of record for product thinking and a system of engagement over existing systems of record. Do not try to replace Jira. Sync with it.

System	Direction	What flows
Jira / Azure DevOps / Rally	Bi-directional	Epics/features/stories, status, sprint, points; platform owns the "why", Jira owns execution state
Confluence / SharePoint	Push + link	Published specs, process docs, decision logs
Figma	Pull + embed	Frames, versions, comments
Slack / MS Teams	Push + slash commands	Notifications, approvals, digest of My Day
Outlook / Google Calendar	Pull	Meetings → Context Capsules
ServiceNow	Bi-directional	Change requests, releases, incidents linked to initiatives
GRC (Archer, MetricStream, OpenPages)	Push + pull	Policies, controls, findings, attestations
Qualtrics / Medallia / Intercom / Zendesk	Pull	Voice-of-customer evidence into Discovery
Amplitude / Mixpanel / Adobe / Tableau / Power BI	Pull	Outcome metrics against initiative targets
Test tools (Xray, qTest, TestRail)	Bi-directional	Test cases, runs, defects
Workday / HR	Pull via SCIM	Org hierarchy for portfolio rollups

Technical shape of integrations:

A dedicated Integration Service with a connector SDK: every connector implements authenticate / discover / pull / push / mapField / handleWebhook.
Canonical internal model + per-connector field mapping configured per tenant (enterprises all customize Jira differently — mapping must be config, not code).
Webhook-first with polling fallback; idempotency keys; per-connector circuit breaker and dead-letter queue.
Conflict resolution policy per field: platform-wins / external-wins / last-write-wins / manual-review queue.
Deployment reality: many banks won't allow SaaS egress. Support a self-hosted connector agent that runs inside the customer network and speaks outbound-only to the platform. Plan for this in the architecture even if v1 is cloud-only.
Public REST API (OpenAPI 3.1) + webhooks so customers can build their own. Every internal feature uses the same public API — no privileged back doors.
A7. Tech stack (chosen; deviate only with a written reason)
Frontend: React 18 + TypeScript (strict), Vite, TanStack Query + Router, Tailwind + Radix primitives (accessible by construction), Zustand for local UI state, React Hook Form + Zod, Recharts for charts, React Flow for process/flow diagrams, TipTap for rich text, Playwright for E2E, Vitest + Testing Library for unit.
Backend: Node.js 22 + NestJS + TypeScript (strict), REST (OpenAPI-first) with tRPC-style typed client generation, Prisma over PostgreSQL 16, Redis for cache + BullMQ queues, OpenSearch for search, S3-compatible object storage, Jest + Supertest.
Data: PostgreSQL with Row-Level Security for tenant isolation; separate audit schema, append-only; outbox pattern for reliable event publishing.
Platform: Docker, Kubernetes-ready manifests/Helm, Terraform for infra, GitHub Actions CI, OpenTelemetry → OTLP.
Monorepo: pnpm workspaces + Turborepo. apps/web, apps/api, apps/worker, packages/shared-types, packages/ui, packages/config, packages/connectors.
A8. Build sequence
Phase	Deliverable
0	Monorepo scaffold, CLAUDE.md, auth/tenancy/RBAC/audit foundation, CI, seed data
1	Initiative Workspace + Roadmap (the spine)
2	Discovery Hub
3	Definition Workspace (epics/features/stories, process flows, business rules, controls)
4	Context Engine (My Day, Resume Cards, Decision Log, Unified Inbox)
5	Integration Service + Jira connector + Figma connector
6	Experience Workspace (design collaboration)
7	Launch Workspace (GTM) + Quality Workspace
8	Reporting Studio (multi-forum reports, PPTX/PDF export)
9	AI Assist layer via the model gateway
10	Hardening: performance, a11y audit, threat model, DR drill, pen-test fixes
11	Persona expansion: Area PO, Exec, Governance, Control teams
