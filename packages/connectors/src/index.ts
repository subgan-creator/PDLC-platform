/**
 * Connector SDK — deliberately empty until Phase 5 (Integration Service +
 * Jira connector + Figma connector, per A8). The contract every connector
 * will implement already exists, forward-declared in @pdlc/shared-types
 * (`Connector<TExternalEntity, TInternalEntity>` in `integration.ts`) so
 * this package's job in Phase 5 is to provide the base class, the field
 * mapping engine, and per-system implementations against that contract —
 * not to define the contract itself.
 */
export type {
  Connector,
  ConnectorSystem,
  ConnectorDirection,
  ConnectorDeploymentMode,
} from '@pdlc/shared-types';
