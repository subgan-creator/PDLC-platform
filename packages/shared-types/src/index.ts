/**
 * @pdlc/shared-types — the forward-declared domain type layer for the whole
 * PDLC platform (see CLAUDE.md and docs/03-data-model.md). Organized by
 * module so later build phases (A8) add files here, not churn existing ones.
 */
export * from './common';
export * from './tenancy';
export * from './rbac';
export * from './audit';
export * from './attachment';
export * from './initiative';
export * from './discovery';
export * from './definition';
export * from './experience';
export * from './launch';
export * from './reporting';
export * from './quality';
export * from './context-engine';
export * from './integration';
export * from './outbox';
