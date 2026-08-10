import type { Id, ISODateTimeString, TenantScoped } from './common';

/**
 * Integration Service (A6). The platform is a system of engagement over
 * existing systems of record — every connector implements the same
 * contract; per-tenant field mapping is config, not code.
 */
export type ConnectorSystem =
  | 'jira'
  | 'azure_devops'
  | 'rally'
  | 'confluence'
  | 'sharepoint'
  | 'figma'
  | 'slack'
  | 'ms_teams'
  | 'outlook_calendar'
  | 'google_calendar'
  | 'servicenow'
  | 'archer'
  | 'metricstream'
  | 'openpages'
  | 'qualtrics'
  | 'medallia'
  | 'intercom'
  | 'zendesk'
  | 'amplitude'
  | 'mixpanel'
  | 'adobe_analytics'
  | 'tableau'
  | 'power_bi'
  | 'xray'
  | 'qtest'
  | 'testrail'
  | 'workday';

export type ConnectorDirection = 'pull' | 'push' | 'bidirectional';

/** How a tenant reaches the connector: cloud-direct, or via a self-hosted outbound-only agent (banks). */
export type ConnectorDeploymentMode = 'cloud' | 'self_hosted_agent';

export interface ConnectorInstance extends TenantScoped {
  id: Id<'ConnectorInstance'>;
  system: ConnectorSystem;
  direction: ConnectorDirection;
  deploymentMode: ConnectorDeploymentMode;
  enabled: boolean;
  /** Secrets live in the vault; this only holds a reference. */
  credentialRef: string;
  lastSyncedAt: ISODateTimeString | null;
  circuitBreakerOpen: boolean;
}

/** Per-tenant, per-connector field mapping — config, never code, because every enterprise customizes Jira differently. */
export interface FieldMapping extends TenantScoped {
  id: Id<'FieldMapping'>;
  connectorInstanceId: Id<'ConnectorInstance'>;
  internalEntityType: string;
  internalField: string;
  externalField: string;
  transformExpression: string | null;
}

export type ConflictResolutionStrategy =
  'platform_wins' | 'external_wins' | 'last_write_wins' | 'manual_review';

export interface ConflictResolutionPolicy extends TenantScoped {
  connectorInstanceId: Id<'ConnectorInstance'>;
  fieldName: string;
  strategy: ConflictResolutionStrategy;
}

export interface WebhookEvent extends TenantScoped {
  id: Id<'WebhookEvent'>;
  connectorInstanceId: Id<'ConnectorInstance'>;
  idempotencyKey: string;
  receivedAt: ISODateTimeString;
  processedAt: ISODateTimeString | null;
  payload: unknown;
  deadLettered: boolean;
}

/**
 * The connector contract every integration implements (A6). Kept here as a
 * TypeScript interface so `packages/connectors` and `apps/api` share one
 * definition; concrete connectors (Jira, Figma, ...) ship in later phases.
 */
export interface Connector<TExternalEntity = unknown, TInternalEntity = unknown> {
  readonly system: ConnectorSystem;
  authenticate(tenantConnectorInstanceId: string): Promise<void>;
  discover(): Promise<Array<{ externalType: string; externalId: string }>>;
  pull(cursor?: string): Promise<{ items: TExternalEntity[]; nextCursor: string | null }>;
  push(entity: TInternalEntity): Promise<{ externalId: string }>;
  mapField(internalField: string, value: unknown): unknown;
  handleWebhook(payload: unknown): Promise<void>;
}
