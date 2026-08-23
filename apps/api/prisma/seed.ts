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
import { PrismaClient, type Persona, type PermissionAction, type SourceType } from '@prisma/client';
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
  // Discovery Hub (Phase 2, JTBD 1) — one resource key covers all 5
  // entities (Source/EvidenceItem/Insight/Opportunity/
  // OpportunitySolutionTreeNode), same as how RAID/Milestones piggyback on
  // 'initiative' rather than getting their own resource — they're all one
  // module's worth of grants, not independently permissioned.
  { resource: 'discovery', action: 'CREATE', description: '(Phase 2) Create Discovery Hub records' },
  { resource: 'discovery', action: 'READ', description: '(Phase 2) View Discovery Hub records' },
  { resource: 'discovery', action: 'UPDATE', description: '(Phase 2) Edit Discovery Hub records, including promoting an opportunity to an initiative' },
  { resource: 'discovery', action: 'DELETE', description: '(Phase 2) Delete Discovery Hub records' },
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
      { resource: 'discovery', action: 'CREATE' },
      { resource: 'discovery', action: 'READ' },
      { resource: 'discovery', action: 'UPDATE' },
      { resource: 'discovery', action: 'DELETE' },
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
      { resource: 'discovery', action: 'READ' },
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
      { resource: 'discovery', action: 'READ' },
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
      { resource: 'discovery', action: 'READ' },
    ],
  },
  {
    key: 'engineer',
    name: 'Engineer',
    personaKey: 'ENGINEER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'discovery', action: 'READ' },
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
      // Full grant, not just READ — the brief scopes this persona as
      // "contributes to Discovery workspace" (00-brief.md A2), the only
      // v1 persona besides PM that authors Discovery Hub records rather
      // than just consuming the trail.
      { resource: 'discovery', action: 'CREATE' },
      { resource: 'discovery', action: 'READ' },
      { resource: 'discovery', action: 'UPDATE' },
      { resource: 'discovery', action: 'DELETE' },
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
      { resource: 'discovery', action: 'READ' },
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
      { resource: 'discovery', action: 'READ' },
    ],
  },
  {
    key: 'stakeholder',
    name: 'Stakeholder',
    personaKey: 'STAKEHOLDER',
    permissions: [
      { resource: 'user', action: 'READ' },
      { resource: 'initiative', action: 'READ' },
      { resource: 'discovery', action: 'READ' },
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
      { resource: 'discovery', action: 'READ' },
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

const SOURCE_DEFS: Array<{ type: SourceType; name: string }> = [
  { type: 'INTERVIEW', name: 'Q1 customer interview batch — everyday banking' },
  { type: 'INTERVIEW', name: 'Q1 customer interview batch — lending' },
  { type: 'SUPPORT_TICKET', name: 'Zendesk export — card disputes, last 90 days' },
  { type: 'SUPPORT_TICKET', name: 'Zendesk export — mobile login failures' },
  { type: 'SURVEY', name: 'Post-transaction NPS survey, Q1' },
  { type: 'COMPETITIVE', name: 'Competitive teardown — 3 neobank onboarding flows' },
  { type: 'DATA_FINDING', name: 'Funnel drop-off analysis — account opening' },
  { type: 'SALES_CALL', name: 'Enterprise prospect call notes — lending desk' },
];

const EVIDENCE_TAGS = ['onboarding', 'trust', 'speed', 'mobile', 'fees', 'support', 'clarity'];

const INSIGHT_DEFS = [
  'Customers abandon account opening when asked for a physical branch visit',
  'Card dispute status is invisible to customers once filed',
  'Users don’t trust an approval decision without a visible reason',
  'Mobile login failures spike after an OS update, before anyone reports it',
  'Customers repeatedly ask support questions the product could answer itself',
  'Fee explanations are found confusing across every surveyed segment',
  'Competitors let a user pre-qualify for a loan in under 2 minutes, we take 15',
  'Joint account holders can’t both see the same real-time balance',
  'Support tickets spike right after a UI change ships, then fade over a week',
  'Customers conflate "pending" and "declined" transaction states',
  'Hardship assistance requests are abandoned mid-form more than any other flow',
  'Savings goal progress isn’t visible unless a customer digs for it',
];

const OPPORTUNITY_DEFS = [
  { title: 'Remove the branch-visit requirement from account opening', framing: 'Account opening abandons at a high rate specifically at the identity-verification step, and interviews trace this to an unexpected branch-visit requirement customers weren’t told about upfront.' },
  { title: 'Give customers real-time visibility into a filed card dispute', framing: 'Card disputes are a black box once filed — customers have no way to check status, so they call support instead, which both frustrates them and costs us handle time.' },
  { title: 'Surface a plain-language reason alongside every approval decision', framing: 'Approval and denial decisions currently show a result with no explanation, and both survey and interview data point to this eroding trust in the decision itself.' },
  { title: 'Detect and pre-empt post-OS-update login failures', framing: 'A recurring pattern of login failures follows every major mobile OS update, well before support ticket volume makes it visible — we’re always reacting instead of catching it early.' },
  { title: 'Let a user pre-qualify for a loan in under 2 minutes', framing: 'Competitive teardown shows every neobank we looked at offers a sub-2-minute pre-qualification flow; our lending desk sales calls confirm this is a stated reason prospects choose a competitor.' },
  { title: 'Make joint account balances update in real time for both holders', framing: 'Joint account holders see stale balances relative to each other, which interview subjects describe as actively undermining trust between the two account holders.' },
  { title: 'Redesign the hardship assistance form to reduce mid-flow abandonment', framing: 'Hardship assistance has the highest form-abandonment rate we’ve measured, at a moment when the customer is already in a difficult financial situation.' },
  { title: 'Make savings goal progress visible without the customer having to look for it', framing: 'Savings goals exist in the product but interview subjects consistently forget they’re there — progress is never surfaced anywhere the customer naturally looks.' },
];

/**
 * Idempotent the same way seedInitiativeWorkspace is — checks a count
 * rather than upserting each row individually. Requires
 * seedInitiativeWorkspace to have already run for this tenant: 3 of the 8
 * opportunities are seeded pre-promoted, pointing at real initiatives, so
 * the "why are we doing this" trail is visible immediately without
 * needing to run the promote flow by hand first.
 */
async function seedDiscoveryHub(
  tenantId: string,
  researcherUsers: SeedUser[],
  allUsers: SeedUser[],
  existingInitiativeIds: string[],
): Promise<void> {
  const existingCount = await prisma.source.count({ where: { tenantId } });
  if (existingCount > 0) {
    console.log(`  Discovery Hub: ${existingCount} sources already present, skipping seed.`);
    return;
  }
  if (existingInitiativeIds.length < 3) {
    console.log('  Discovery Hub: fewer than 3 initiatives to link — skipping seed.');
    return;
  }

  console.log('  Seeding Discovery Hub: 8 sources, evidence, insights, opportunities...');

  const capturedByPool = researcherUsers.length > 0 ? researcherUsers : allUsers;
  const evidenceItemIds: string[] = [];

  for (const def of SOURCE_DEFS) {
    const source = await prisma.source.create({ data: { tenantId, ...def } });

    const evidenceCount = faker.number.int({ min: 3, max: 5 });
    for (let i = 0; i < evidenceCount; i++) {
      const item = await prisma.evidenceItem.create({
        data: {
          tenantId,
          sourceId: source.id,
          capturedAt: faker.date.recent({ days: 90 }),
          capturedBy: faker.helpers.arrayElement(capturedByPool)?.id ?? '',
          content: faker.lorem.sentences({ min: 1, max: 3 }),
          tags: faker.helpers.arrayElements(EVIDENCE_TAGS, { min: 0, max: 3 }),
        },
      });
      evidenceItemIds.push(item.id);
    }
  }

  const insightIds: string[] = [];
  for (const title of INSIGHT_DEFS) {
    const insight = await prisma.insight.create({
      data: {
        tenantId,
        title,
        summary: faker.lorem.sentences(2),
        evidenceItemIds: faker.helpers.arrayElements(evidenceItemIds, { min: 2, max: 4 }),
        tags: faker.helpers.arrayElements(EVIDENCE_TAGS, { min: 0, max: 2 }),
        confidence: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
      },
    });
    insightIds.push(insight.id);
  }

  const promotableInitiativeIds = faker.helpers.arrayElements(existingInitiativeIds, 3);
  const opportunityIds: string[] = [];
  for (let i = 0; i < OPPORTUNITY_DEFS.length; i++) {
    const def = OPPORTUNITY_DEFS[i];
    if (!def) continue;
    const linkedInsightIds = faker.helpers.arrayElements(insightIds, { min: 1, max: 3 });
    const promotedInitiativeId = promotableInitiativeIds[i];

    const opportunity = await prisma.opportunity.create({
      data: {
        tenantId,
        title: def.title,
        problemFraming: def.framing,
        insightIds: linkedInsightIds,
        ...(promotedInitiativeId
          ? {
              promotedToInitiativeId: promotedInitiativeId,
              promotedAt: faker.date.recent({ days: 30 }),
              promotedBy: faker.helpers.arrayElement(capturedByPool)?.id ?? null,
            }
          : {}),
      },
    });
    opportunityIds.push(opportunity.id);

    // Backfill the other side of the trail — normally the app's
    // OpportunitiesRepository.promote() sets both sides in one
    // transaction, but the seed script writes both tables directly.
    if (promotedInitiativeId) {
      await prisma.initiative.update({
        where: { id: promotedInitiativeId },
        data: { sourceOpportunityId: opportunity.id },
      });
    }
  }

  // A small Opportunity Solution Tree (outcome -> opportunity -> solution
  // /experiment, 2-3 levels deep) on 4 of the 8 opportunities.
  const treeOpportunityIds = faker.helpers.arrayElements(opportunityIds, 4);
  for (const opportunityId of treeOpportunityIds) {
    const outcome = await prisma.opportunitySolutionTreeNode.create({
      data: {
        tenantId,
        opportunityId,
        parentNodeId: null,
        nodeType: 'OUTCOME',
        label: faker.helpers.arrayElement([
          'Increase self-service completion rate',
          'Reduce time-to-resolution',
          'Increase applicant conversion',
        ]),
      },
    });

    const subOpportunityCount = faker.number.int({ min: 1, max: 2 });
    for (let o = 0; o < subOpportunityCount; o++) {
      const subOpportunity = await prisma.opportunitySolutionTreeNode.create({
        data: {
          tenantId,
          opportunityId,
          parentNodeId: outcome.id,
          nodeType: 'OPPORTUNITY',
          label: faker.lorem.sentence({ min: 4, max: 8 }),
        },
      });

      const leafCount = faker.number.int({ min: 1, max: 2 });
      for (let l = 0; l < leafCount; l++) {
        await prisma.opportunitySolutionTreeNode.create({
          data: {
            tenantId,
            opportunityId,
            parentNodeId: subOpportunity.id,
            nodeType: faker.helpers.arrayElement(['SOLUTION', 'EXPERIMENT']),
            label: faker.lorem.sentence({ min: 3, max: 7 }),
          },
        });
      }
    }
  }

  console.log(
    `  Discovery Hub seeded: ${SOURCE_DEFS.length} sources, ${evidenceItemIds.length} evidence items, ${insightIds.length} insights, ${opportunityIds.length} opportunities (3 promoted), ${treeOpportunityIds.length} solution trees.`,
  );
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

      // Phase 2 (Prompt 2): Discovery Hub, same tenant-scoping choice as
      // Phase 1 — needs the initiatives just seeded above to link 3
      // promoted opportunities to real rows.
      const researcherUsers = await prisma.user.findMany({
        where: { tenantId: tenant.id, primaryPersona: 'RESEARCHER' },
      });
      const existingInitiatives = await prisma.initiative.findMany({
        where: { tenantId: tenant.id },
        select: { id: true },
      });
      await seedDiscoveryHub(
        tenant.id,
        researcherUsers,
        allUsers,
        existingInitiatives.map((i) => i.id),
      );
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
