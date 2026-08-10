# ADR-0003: Integration architecture

**Status:** Accepted — 2025-12 (design only; implementation starts Phase 5)

## Context

A6 requires bi-directional sync with a long list of enterprise systems (Jira, ServiceNow, GRC tools, ...), where every enterprise customizes each of those systems differently, and — critically — "many banks won't allow SaaS egress." The architecture has to accommodate a connector model that's mostly config, and a deployment mode we don't need in Phase 5 but must not be designed out of.

## Decision

- **One connector contract**, not one integration per system built ad hoc. `Connector<TExternalEntity, TInternalEntity>` (`packages/shared-types/src/integration.ts`) defines `authenticate / discover / pull / push / mapField / handleWebhook`. Every connector — Jira first (Phase 5), then Figma, then the rest — implements this same shape in `packages/connectors`.
- **Field mapping is data, not code.** `FieldMapping` rows (per tenant, per connector instance) hold `internalField → externalField` plus an optional transform expression. Shipping a new customer's custom Jira workflow is a config change, not a deploy.
- **Webhook-first, polling fallback**, with idempotency keys and a per-connector circuit breaker + dead-letter queue (`WebhookEvent`, `ConnectorInstance.circuitBreakerOpen`) — sync must degrade gracefully when an external system is flaky, not cascade failures into the platform.
- **Conflict resolution is configured per field**, not hardcoded per connector: `platform_wins` / `external_wins` / `last_write_wins` / `manual_review` (`ConflictResolutionPolicy`). Different fields on the same entity can have different policies (e.g. platform owns "why", Jira owns sprint/status).
- **Deployment mode is a first-class enum from day one**: `ConnectorInstance.deploymentMode` is `cloud | self_hosted_agent` even though only `cloud` is implementable before Phase 5. A bank customer's self-hosted agent is an outbound-only proxy inside their network; the platform never needs inbound access to a customer's environment. Modeling this now means the eventual self-hosted agent is a new deployment target for the same connector code, not a rewrite of the connector contract.
- **The public API is the only API.** Every internal feature (including the web app) calls the same OpenAPI 3.1 surface that external integrators and connectors use — no privileged internal-only endpoints. This is enforced by convention today (`apps/api`'s Swagger doc at `/api/docs` is the one surface); Phase 5 is where connectors start exercising it as clients rather than the web app being the only consumer.
- **Jobs run on the worker, not inline in request handlers.** Connector pull/push/webhook processing is queue-backed (`pdlc:connector-sync` in `apps/worker/src/queues.ts`) so a slow or down external system never blocks an API request.

## Consequences

- Phase 5 work is "implement `Connector` for Jira, then Figma" against an interface that already exists, not "design the interface while also building the first connector" — reduces the risk of the first connector's quirks leaking into the shared contract.
- The self-hosted agent requirement shapes the connector contract to be transport-agnostic (an `authenticate`/`pull`/`push` call doesn't know or care whether it's reaching the external system directly or via a customer-hosted relay) — but the relay itself (its protocol, how it authenticates back to the platform, how it's deployed/updated in a customer's network) is undesigned. That's real, non-trivial work deferred to whenever the first self-hosted-agent customer is contracted, not before.
- Per-tenant field mapping means the Integration Service needs its own admin UI (configure mappings, conflict policies, connector instances) — not scoped to any phase yet. Flag it when Phase 5 is planned in detail.
- No connector-specific rate limiting/backoff strategy is decided yet (Jira's, ServiceNow's, and a GRC tool's API limits are all different) — each connector implementation will need its own backoff config within the shared circuit-breaker mechanism, not a one-size policy.
