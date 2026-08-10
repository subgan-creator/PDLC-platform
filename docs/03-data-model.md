# 03 — Data Model

## Phase 0: what's actually in Postgres today

Source of truth: `apps/api/prisma/schema.prisma`. Everything here is tenant-scoped and RLS-protected except `Permission` (global catalogue) and `Tenant` itself (see [ADR-0002](06-adr/ADR-0002-multi-tenancy-rls.md)).

```mermaid
erDiagram
  TENANT ||--o{ USER : "has"
  TENANT ||--o{ ROLE : "has"
  TENANT ||--o{ USER_ROLE : "has"
  TENANT ||--o{ ATTACHMENT : "owns"
  USER ||--o{ USER_ROLE : "granted"
  ROLE ||--o{ USER_ROLE : "granted via"
  ROLE ||--o{ ROLE_PERMISSION : "bundles"
  PERMISSION ||--o{ ROLE_PERMISSION : "granted by"

  TENANT {
    string id PK
    string slug UK
    string name
    enum status
    enum residencyRegion
    string encryptionKeyRef
  }
  USER {
    string id PK
    string tenantId FK
    string email
    enum primaryPersona
    boolean isServiceAccount
    string ssoSubject
  }
  ROLE {
    string id PK
    string tenantId FK
    string key
    enum personaKey
    boolean isSystemRole
  }
  PERMISSION {
    string id PK
    string resource
    enum action
  }
  ROLE_PERMISSION {
    string roleId FK
    string permissionId FK
  }
  USER_ROLE {
    string tenantId FK
    string userId FK
    string roleId FK
    string scopeInitiativeId
    datetime expiresAt
  }
  ATTACHMENT {
    string id PK
    string tenantId FK
    string ownerType
    string ownerId
    string storageKey
    enum dataClassification
    enum virusScanStatus
  }
  AUDIT_EVENT {
    string id PK
    string tenantId
    enum action
    string entityType
    string entityId
    string requestId
    json before
    json after
  }
```

`AUDIT_EVENT` lives in the separate `audit` Postgres schema, append-only, with no FK to app tables by design (audit must survive the row it describes being deleted).

## Forward-declared: the full domain model

`packages/shared-types` already defines the shape of every module in the build sequence (A8) so later phases don't churn types PMs' UIs or the API depend on. **None of the entities below exist as Prisma models / DB tables yet** — they land phase by phase via expand/contract migrations. This diagram is the conceptual map, not a current schema.

```mermaid
erDiagram
  INITIATIVE ||--o{ EPIC : "decomposes into"
  EPIC ||--o{ FEATURE : "decomposes into"
  FEATURE ||--o{ STORY : "decomposes into"
  INITIATIVE ||--o{ PROCESS_FLOW : "models"
  INITIATIVE ||--o{ BUSINESS_RULE : "governed by"
  INITIATIVE ||--o{ INITIATIVE_CONTROL_MAPPING : "attests"
  OPPORTUNITY ||--o| INITIATIVE : "promoted to"
  INSIGHT ||--o{ OPPORTUNITY : "promoted to"
  EVIDENCE_ITEM ||--o{ INSIGHT : "clustered into"
  SOURCE ||--o{ EVIDENCE_ITEM : "captured from"
  INITIATIVE ||--o{ TEST_CASE : "verified by"
  INITIATIVE ||--o{ LAUNCH_CHECKLIST : "readied by"
  INITIATIVE ||--o{ REPORT_INSTANCE : "reported via"
  INITIATIVE ||--o{ DECISION : "records"
  INITIATIVE ||--o{ RESUME_CARD : "summarized by"

  INITIATIVE {
    string id PK
    string ownerId
    enum phase
    enum health
    enum stageGateStatus "v2 governance, present from v1"
    string productAreaId "v2 rollups, present from v1"
  }
```

Full field-level detail for every entity lives in `packages/shared-types/src`, one file per module (`initiative.ts`, `discovery.ts`, `definition.ts`, `experience.ts`, `launch.ts`, `reporting.ts`, `quality.ts`, `context-engine.ts`, `integration.ts`). When a phase implements a module, its Prisma models should mirror the corresponding shared-types file field-for-field — that file is the spec.

## Migration discipline

Expand/contract only (CLAUDE.md): add nullable columns or new tables in one migration, backfill, then a later migration tightens constraints — never a single migration that both adds a NOT NULL column and ships code that requires it. See [ADR-0002](06-adr/ADR-0002-multi-tenancy-rls.md) for how RLS policies get added to each new tenant-scoped table as it's created.
