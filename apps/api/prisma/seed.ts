/**
 * Seeds 2 tenants and 12 users spread across all 10 personas (A2), with
 * one system Role per persona per tenant and realistic RBAC grants. Fully
 * idempotent — safe to re-run (`pnpm db:seed`) against a dev database.
 *
 * Runs as a plain Prisma script (not through NestJS) so it has no
 * dependency on the app boot order; it talks to Postgres as the migration
 * role, which — unlike the app's runtime role — is expected to bypass RLS
 * so it can seed rows for both tenants in one pass.
 */
import { faker } from '@faker-js/faker';
import { PrismaClient, type Persona, type PermissionAction } from '@prisma/client';
import { slugify } from '../src/common/util/slug';

const prisma = new PrismaClient();

interface PermissionSeed {
  resource: string;
  action: PermissionAction;
  description: string;
}

// Phase 0 catalogue: user/role/attachment management plus a few
// forward-declared resources (initiative, control, stagegate) so
// persona role grants read naturally even though those tables don't exist
// until later phases — the Permission row is just a (resource, action)
// pair, not a foreign key into a table.
const PERMISSIONS: PermissionSeed[] = [
  { resource: 'user', action: 'READ', description: 'View users in the tenant' },
  { resource: 'user', action: 'UPDATE', description: 'Update user profile/roles' },
  { resource: 'role', action: 'READ', description: 'View roles and their permissions' },
  { resource: 'attachment', action: 'CREATE', description: 'Upload an attachment' },
  { resource: 'attachment', action: 'READ', description: 'Download/view an attachment' },
  { resource: 'initiative', action: 'CREATE', description: '(Phase 1) Create an initiative' },
  { resource: 'initiative', action: 'READ', description: '(Phase 1) View an initiative' },
  { resource: 'initiative', action: 'UPDATE', description: '(Phase 1) Edit an initiative' },
  { resource: 'initiative', action: 'DELETE', description: '(Phase 1) Archive an initiative' },
  {
    resource: 'initiative',
    action: 'EXPORT',
    description: '(Phase 8) Export a report for an initiative',
  },
  { resource: 'control', action: 'ATTEST', description: '(Phase 3/v2) Attest a control mapping' },
  { resource: 'stagegate', action: 'APPROVE', description: '(v2) Approve a stage-gate transition' },
];

interface RoleSeed {
  key: string;
  name: string;
  personaKey: Persona;
  permissions: Array<Pick<PermissionSeed, 'resource' | 'action'>>;
}

const ROLES: RoleSeed[] = [
  {
    key: 'pm',
    name: 'Product Manager',
    personaKey: 'PRODUCT_MANAGER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'role', action: 'READ' },
      { resource: 'attachment', action: 'CREATE' },
      { resource: 'attachment', action: 'READ' },
      { resource: 'initiative', action: 'CREATE' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'initiative', action: 'UPDATE' },
      { resource: 'initiative', action: 'DELETE' },
      { resource: 'initiative', action: 'EXPORT' },
    ],
  },
  {
    key: 'area_product_owner',
    name: 'Area Product Owner',
    personaKey: 'AREA_PRODUCT_OWNER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'initiative', action: 'EXPORT' },
    ],
  },
  {
    key: 'product_executive',
    name: 'Product Executive',
    personaKey: 'PRODUCT_EXECUTIVE',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'initiative', action: 'EXPORT' },
    ],
  },
  {
    key: 'designer',
    name: 'Designer',
    personaKey: 'DESIGNER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'attachment', action: 'CREATE' },
      { resource: 'attachment', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
    ],
  },
  {
    key: 'engineer',
    name: 'Engineer',
    personaKey: 'ENGINEER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
    ],
  },
  {
    key: 'researcher',
    name: 'Researcher',
    personaKey: 'RESEARCHER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'attachment', action: 'CREATE' },
      { resource: 'attachment', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
    ],
  },
  {
    key: 'control_risk',
    name: 'Control / Risk',
    personaKey: 'CONTROL_RISK',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'control', action: 'ATTEST' },
    ],
  },
  {
    key: 'governance',
    name: 'Governance',
    personaKey: 'GOVERNANCE',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'stagegate', action: 'APPROVE' },
    ],
  },
  {
    key: 'stakeholder',
    name: 'Stakeholder',
    personaKey: 'STAKEHOLDER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
    ],
  },
  {
    key: 'senior_management',
    name: 'Senior Management',
    personaKey: 'SENIOR_MANAGEMENT',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'initiative', action: 'EXPORT' },
    ],
  },
];

interface UserSeed {
  email: string;
  displayName: string;
  persona: Persona;
}

interface TenantSeed {
  slug: string;
  name: string;
  residencyRegion: 'US' | 'EU' | 'UK' | 'APAC';
  users: UserSeed[];
}

const TENANTS: TenantSeed[] = [
  {
    slug: 'acme-bank',
    name: 'Acme Bank',
    residencyRegion: 'US',
    users: [
      {
        email: 'priya.patel@acmebank.example',
        displayName: 'Priya Patel',
        persona: 'PRODUCT_MANAGER',
      },
      { email: 'grace.kim@acmebank.example', displayName: 'Grace Kim', persona: 'PRODUCT_MANAGER' },
      {
        email: 'diego.alvarez@acmebank.example',
        displayName: 'Diego Alvarez',
        persona: 'DESIGNER',
      },
      { email: 'sam.okafor@acmebank.example', displayName: 'Sam Okafor', persona: 'ENGINEER' },
      {
        email: 'lena.fischer@acmebank.example',
        displayName: 'Lena Fischer',
        persona: 'RESEARCHER',
      },
      { email: 'omar.haddad@acmebank.example', displayName: 'Omar Haddad', persona: 'STAKEHOLDER' },
    ],
  },
  {
    slug: 'northwind-pharma',
    name: 'Northwind Pharma',
    residencyRegion: 'EU',
    users: [
      {
        email: 'wei.zhang@northwindpharma.example',
        displayName: 'Wei Zhang',
        persona: 'PRODUCT_MANAGER',
      },
      {
        email: 'ines.moreau@northwindpharma.example',
        displayName: 'Ines Moreau',
        persona: 'AREA_PRODUCT_OWNER',
      },
      {
        email: 'thabo.nkosi@northwindpharma.example',
        displayName: 'Thabo Nkosi',
        persona: 'PRODUCT_EXECUTIVE',
      },
      {
        email: 'anya.petrov@northwindpharma.example',
        displayName: 'Anya Petrov',
        persona: 'CONTROL_RISK',
      },
      {
        email: 'marcus.bell@northwindpharma.example',
        displayName: 'Marcus Bell',
        persona: 'GOVERNANCE',
      },
      {
        email: 'sofia.rossi@northwindpharma.example',
        displayName: 'Sofia Rossi',
        persona: 'SENIOR_MANAGEMENT',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Phase 1: Initiative Workspace + Roadmap seed data (Prompt 1)
// ---------------------------------------------------------------------------

interface SeedUser {
  id: string;
}

const PRODUCT_AREA_DEFS = [
  { key: 'everyday-banking', name: 'Everyday Banking' },
  { key: 'lending', name: 'Lending' },
  { key: 'payments-cards', name: 'Payments & Cards' },
] as const;

const TOPICS_BY_AREA: Record<string, string[]> = {
  'everyday-banking': [
    'account opening',
    'e-statements',
    'card controls',
    'branch appointment booking',
    'overdraft alerts',
    'joint accounts',
    'account closure',
    'direct debit management',
    'customer onboarding KYC',
    'savings goals',
  ],
  lending: [
    'personal loan application',
    'mortgage pre-approval',
    'credit limit increase requests',
    'hardship assistance',
    'auto loan refinancing',
    'loan servicing portal',
    'buy-now-pay-later',
    'affordability checks',
    'early repayment',
    'collections outreach',
  ],
  'payments-cards': [
    'card replacement',
    'contactless limits',
    'international transfers',
    'recurring payments',
    'dispute resolution',
    'virtual card issuance',
    'real-time payments',
    'foreign exchange rates',
    'merchant chargebacks',
    'card tokenization',
  ],
};

const TITLE_TEMPLATES: Array<(topic: string) => string> = [
  (t) => `Modernize ${t}`,
  (t) => `Redesign ${t} experience`,
  (t) => `Automate ${t}`,
  (t) => `Consolidate ${t} into one flow`,
  (t) => `Self-service ${t}`,
  (t) => `Reduce time-to-resolution for ${t}`,
];

const TEAMS = [
  'Mobile',
  'Web',
  'Core Banking',
  'Fraud & Risk',
  'Payments Platform',
  'Data & Analytics',
];
const TAGS = [
  'regulatory',
  'customer-experience',
  'cost-reduction',
  'tech-debt',
  'growth',
  'resilience',
];

const PHASES = ['DISCOVERY', 'DEFINITION', 'BUILD', 'LAUNCH', 'ADOPT', 'DONE'] as const;
// Weighted toward the earlier/build phases — a realistic in-flight portfolio, not evenly split.
const PHASE_WEIGHTS = [0.15, 0.2, 0.3, 0.15, 0.1, 0.1];

function weightedPick<T>(items: readonly T[], weights: number[]): T {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i] ?? 0;
    if (r <= acc) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

function pickHealth(): { health: 'GREEN' | 'AMBER' | 'RED'; healthReason: string | null } {
  const r = Math.random();
  if (r < 0.7) return { health: 'GREEN', healthReason: null };
  if (r < 0.9)
    return {
      health: 'AMBER',
      healthReason: faker.helpers.arrayElement([
        'Dependency slipping',
        'Scope grew mid-sprint',
        'Awaiting legal sign-off',
        'Vendor delay',
      ]),
    };
  return {
    health: 'RED',
    healthReason: faker.helpers.arrayElement([
      'Blocked on Core Banking API',
      'Key engineer out, no backfill',
      'Budget frozen pending review',
    ]),
  };
}

function pickBucket(phase: (typeof PHASES)[number]): {
  bucket: 'NOW' | 'NEXT' | 'LATER' | null;
  rank: number | null;
} {
  if (phase === 'DONE') return { bucket: null, rank: null };
  const bucket = weightedPick(['NOW', 'NEXT', 'LATER'] as const, [0.2, 0.4, 0.4]);
  return {
    bucket,
    rank: Math.round(faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }) * 100) / 100,
  };
}

/**
 * Idempotent only at the "don't re-seed if it looks already done" level —
 * checks the tenant's initiative count rather than upserting each of the
 * ~60 rows individually (there's no natural business key to upsert on
 * beyond slug, and regenerating identical fake data every run isn't the
 * goal; re-running against a fresh database is).
 */
async function seedInitiativeWorkspace(
  tenantId: string,
  pmUsers: SeedUser[],
  allUsers: SeedUser[],
): Promise<void> {
  const existingCount = await prisma.initiative.count({ where: { tenantId } });
  if (existingCount > 0) {
    console.log(
      `  Initiative Workspace: ${existingCount} initiatives already present, skipping seed.`,
    );
    return;
  }

  console.log('  Seeding Initiative Workspace: 3 product areas, 60 initiatives...');

  const areas = await Promise.all(
    PRODUCT_AREA_DEFS.map((a) =>
      prisma.productArea.upsert({
        where: { tenantId_key: { tenantId, key: a.key } },
        create: { tenantId, key: a.key, name: a.name },
        update: { name: a.name },
      }),
    ),
  );

  const ownerPool = pmUsers.length > 0 ? pmUsers : allUsers;
  let ownerIndex = 0;

  for (const area of areas) {
    const topics = TOPICS_BY_AREA[area.key] ?? [];
    for (let i = 0; i < 20; i++) {
      const topic = topics[i % topics.length] ?? 'core platform';
      const template = TITLE_TEMPLATES[i % TITLE_TEMPLATES.length];
      const suffix = i >= topics.length ? ` (phase ${Math.floor(i / topics.length) + 1})` : '';
      const title = `${template ? template(topic) : `Improve ${topic}`}${suffix}`;

      const phase = weightedPick(PHASES, PHASE_WEIGHTS);
      const { health, healthReason } = pickHealth();
      const { bucket, rank } = pickBucket(phase);
      const plannedStart = faker.date.between({ from: '2025-10-01', to: '2026-06-01' });
      const plannedEnd = faker.date.between({ from: plannedStart, to: '2027-03-01' });
      const owner = ownerPool[ownerIndex % ownerPool.length];
      ownerIndex += 1;

      const initiative = await prisma.initiative.create({
        data: {
          tenantId,
          title,
          slug: `${slugify(title)}-${faker.string.alphanumeric(4).toLowerCase()}`,
          problemStatement: faker.lorem.paragraph(),
          phase,
          health,
          healthReason,
          confidence: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
          tshirtSize: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL']),
          scope: faker.lorem.sentences(2),
          nonScope: faker.lorem.sentence(),
          plannedStart,
          plannedEnd,
          ownerId: owner?.id ?? '',
          businessSponsorId:
            faker.helpers.maybe(() => faker.helpers.arrayElement(allUsers)?.id, {
              probability: 0.5,
            }) ?? null,
          contributingTeams: faker.helpers.arrayElements(TEAMS, { min: 1, max: 3 }),
          tags: faker.helpers.arrayElements(TAGS, { min: 0, max: 3 }),
          productAreaId: area.id,
          dataClassification: faker.helpers.arrayElement(['INTERNAL', 'CONFIDENTIAL']),
          roadmapBucket: bucket,
          roadmapRank: rank,
          outcomeMetrics: {
            create: [
              {
                tenantId,
                metricName: faker.helpers.arrayElement([
                  'Task completion rate',
                  'Time to complete',
                  'Contact-center calls avoided',
                  'NPS',
                ]),
                baseline: faker.number.int({ min: 20, max: 60 }),
                target: faker.number.int({ min: 65, max: 95 }),
                current:
                  faker.helpers.maybe(() => faker.number.int({ min: 20, max: 90 }), {
                    probability: 0.6,
                  }) ?? null,
                unit: '%',
                source: 'Manual — Amplitude connector not yet live',
              },
            ],
          },
          hypotheses: {
            create:
              faker.helpers.maybe(
                () => [
                  {
                    tenantId,
                    statement: `We believe that ${template ? template(topic).toLowerCase() : topic} will reduce customer effort and increase self-service completion.`,
                    confidence: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
                    validated:
                      faker.helpers.maybe(() => faker.datatype.boolean(), { probability: 0.4 }) ??
                      null,
                  },
                ],
                { probability: 0.7 },
              ) ?? [],
          },
        },
      });

      const raidCount = faker.number.int({ min: 0, max: 3 });
      for (let r = 0; r < raidCount; r++) {
        await prisma.raidItem.create({
          data: {
            tenantId,
            initiativeId: initiative.id,
            type: faker.helpers.arrayElement(['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY']),
            description: faker.lorem.sentence(),
            severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            ownerId: faker.helpers.arrayElement(allUsers)?.id ?? null,
            dueDate: faker.helpers.maybe(() => faker.date.future(), { probability: 0.6 }) ?? null,
            status: faker.helpers.arrayElement(['OPEN', 'OPEN', 'MITIGATED', 'CLOSED']),
          },
        });
      }

      const milestoneCount = faker.number.int({ min: 1, max: 3 });
      for (let m = 0; m < milestoneCount; m++) {
        await prisma.milestone.create({
          data: {
            tenantId,
            initiativeId: initiative.id,
            title: faker.helpers.arrayElement([
              'Discovery complete',
              'Design review',
              'Beta launch',
              'GA launch',
              'Legal sign-off',
              'UAT complete',
            ]),
            dueDate: faker.date.between({ from: plannedStart, to: plannedEnd }),
            status: faker.helpers.arrayElement(['PLANNED', 'PLANNED', 'DONE', 'MISSED']),
          },
        });
      }

      await prisma.statusUpdate.create({
        data: {
          tenantId,
          initiativeId: initiative.id,
          authoredBy: owner?.id ?? '',
          periodStart: faker.date.recent({ days: 14 }),
          periodEnd: new Date(),
          progress: faker.lorem.sentence(),
          next: faker.lorem.sentence(),
          risks: health === 'GREEN' ? 'None at this time.' : faker.lorem.sentence(),
          asks: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }) ?? 'None.',
          healthAtTimeOfUpdate: health,
        },
      });
    }
  }

  console.log('  Initiative Workspace seeded: 60 initiatives across 3 product areas.');
}

async function main(): Promise<void> {
  console.log('Seeding permission catalogue...');
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { resource_action: { resource: p.resource, action: p.action } },
        create: p,
        update: { description: p.description },
      }),
    ),
  );
  const permissionId = (resource: string, action: PermissionAction) => {
    const match = permissionRecords.find((p) => p.resource === resource && p.action === action);
    if (!match) throw new Error(`Seed bug: permission ${resource}:${action} not found`);
    return match.id;
  };

  for (const tenantSeed of TENANTS) {
    console.log(`Seeding tenant ${tenantSeed.slug}...`);
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSeed.slug },
      create: {
        slug: tenantSeed.slug,
        name: tenantSeed.name,
        status: 'ACTIVE',
        residencyRegion: tenantSeed.residencyRegion,
      },
      update: { name: tenantSeed.name, residencyRegion: tenantSeed.residencyRegion },
    });

    const rolesByPersona = new Map<Persona, { id: string }>();
    for (const roleSeed of ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: roleSeed.key } },
        create: {
          tenantId: tenant.id,
          key: roleSeed.key,
          name: roleSeed.name,
          description: `System role for the ${roleSeed.name} persona.`,
          personaKey: roleSeed.personaKey,
          isSystemRole: true,
        },
        update: { name: roleSeed.name, personaKey: roleSeed.personaKey },
      });
      rolesByPersona.set(roleSeed.personaKey, role);

      for (const p of roleSeed.permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permissionId(p.resource, p.action),
            },
          },
          create: { roleId: role.id, permissionId: permissionId(p.resource, p.action) },
          update: {},
        });
      }
    }

    for (const userSeed of tenantSeed.users) {
      const user = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: userSeed.email } },
        create: {
          tenantId: tenant.id,
          email: userSeed.email,
          displayName: userSeed.displayName,
          primaryPersona: userSeed.persona,
        },
        update: { displayName: userSeed.displayName, primaryPersona: userSeed.persona },
      });

      const role = rolesByPersona.get(userSeed.persona);
      if (!role) throw new Error(`Seed bug: no role seeded for persona ${userSeed.persona}`);

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { tenantId: tenant.id, userId: user.id, roleId: role.id, grantedBy: 'system-seed' },
        update: {},
      });

      console.log(
        `  ${userSeed.displayName} <${userSeed.email}> — ${userSeed.persona} (dev header: x-dev-user-id=${user.id}, x-dev-tenant-id=${tenant.id})`,
      );
    }

    // Phase 1 (Prompt 1): 60 realistic initiatives across 3 product areas,
    // for the retail-bank tenant only — acme-bank is our stand-in retail
    // bank, northwind-pharma has no Initiative Workspace data seeded.
    if (tenantSeed.slug === 'acme-bank') {
      const pmUsers = await prisma.user.findMany({
        where: { tenantId: tenant.id, primaryPersona: 'PRODUCT_MANAGER' },
      });
      const allUsers = await prisma.user.findMany({ where: { tenantId: tenant.id } });
      await seedInitiativeWorkspace(tenant.id, pmUsers, allUsers);
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
