# 05 — Integration Strategy

Source: `00-brief.md` A6. **Nothing in this document is built yet** — Phase 5 (Integration Service + Jira connector + Figma connector) is where it starts. This is the contract that phase builds against.

## Principle

The platform is the system of record for product thinking and a system of engagement over existing systems of record. Do not try to replace Jira — sync with it.

## Systems and direction

| System                                            | Direction             | What flows                                                                                      |
| ------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Jira / Azure DevOps / Rally                       | Bi-directional        | Epics/features/stories, status, sprint, points — platform owns "why", Jira owns execution state |
| Confluence / SharePoint                           | Push + link           | Published specs, process docs, decision logs                                                    |
| Figma                                             | Pull + embed          | Frames, versions, comments                                                                      |
| Slack / MS Teams                                  | Push + slash commands | Notifications, approvals, My Day digest                                                         |
| Outlook / Google Calendar                         | Pull                  | Meetings → Context Capsules                                                                     |
| ServiceNow                                        | Bi-directional        | Change requests, releases, incidents linked to initiatives                                      |
| GRC (Archer, MetricStream, OpenPages)             | Push + pull           | Policies, controls, findings, attestations                                                      |
| Qualtrics / Medallia / Intercom / Zendesk         | Pull                  | Voice-of-customer evidence into Discovery                                                       |
| Amplitude / Mixpanel / Adobe / Tableau / Power BI | Pull                  | Outcome metrics against initiative targets                                                      |
| Xray / qTest / TestRail                           | Bi-directional        | Test cases, runs, defects                                                                       |
| Workday / HR                                      | Pull via SCIM         | Org hierarchy for portfolio rollups                                                             |

## Technical shape

- **Connector SDK**: every connector implements `authenticate / discover / pull / push / mapField / handleWebhook` — the `Connector<TExternalEntity, TInternalEntity>` interface already exists in `packages/shared-types/src/integration.ts`. `packages/connectors` is where implementations land in Phase 5, against that same contract.
- **Canonical internal model + per-tenant field mapping** — `FieldMapping` is config (rows in a table), never code, because every enterprise customizes Jira differently.
- **Webhook-first, polling fallback** — idempotency keys (`WebhookEvent.idempotencyKey`), per-connector circuit breaker (`ConnectorInstance.circuitBreakerOpen`) and dead-letter queue (`WebhookEvent.deadLettered`).
- **Conflict resolution per field** — `platform_wins` / `external_wins` / `last_write_wins` / `manual_review`, configured per connector+field (`ConflictResolutionPolicy`).
- **Self-hosted connector agent** — many banks won't allow SaaS egress. `ConnectorInstance.deploymentMode` already distinguishes `cloud` from `self_hosted_agent` so the data model doesn't need to change when that ships; the agent itself (an outbound-only proxy inside the customer network) is a Phase 5+ build.
- **Public REST API + webhooks** — every internal feature uses the same OpenAPI-documented public API as external integrators. No privileged back doors. `apps/api`'s Swagger doc at `/api/docs` is that surface today (Phase 0 only exposes `/users/*` and health checks on it).

## Where jobs run

Connector pull/push/webhook processing runs on `apps/worker` via the `pdlc:connector-sync` BullMQ queue (name reserved in `apps/worker/src/queues.ts`, no processor yet).
